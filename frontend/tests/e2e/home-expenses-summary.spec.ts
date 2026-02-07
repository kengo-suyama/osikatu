import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => console.log(`[PASS] ${message}`);
const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
};

const attachDiagnostics = (page: Parameters<typeof test>[1]["page"], label: string) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[${label}][console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[${label}][pageerror] ${error.message}`);
  });
};

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) throw new Error(`onboarding skip failed: ${res.status()}`);
};

const ensureOshi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
): Promise<{ id: number; name: string }> => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error(`list oshis failed: ${listRes.status()}`);
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json", Accept: "application/json" },
    data: { name: "支出テスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

const createExpense = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
  payload: { oshiId: number; category: string; amount: number; expenseDate: string }
) => {
  const res = await request.post(`${API_BASE}/api/me/expenses`, {
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json", Accept: "application/json" },
    data: payload,
  });
  if (!res.ok()) {
    const text = await res.text().catch(() => "");
    throw new Error(`create expense failed: ${res.status()} ${text}`);
  }
  return res.json();
};

test.describe("home expenses summary card", () => {
  test("expenses summary card is visible with navigation", async ({ page, request }) => {
    attachDiagnostics(page, "expenses-summary");

    const deviceId = `device-e2e-expenses-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    const oshi = await ensureOshi(request, deviceId);
    if (!oshi) throw new Error("Could not ensure oshi");

    // Seed expense data via direct API call
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    await createExpense(request, deviceId, {
      oshiId: oshi.id,
      category: "グッズ",
      amount: 3500,
      expenseDate: today,
    });
    logPass("Expense seeded via API");

    // Verify backend returns correct data (direct call, bypassing proxy)
    const verifyRes = await request.get(
      `${API_BASE}/api/me/expenses-summary?month=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      { headers: { "X-Device-Id": deviceId, Accept: "application/json" } }
    );
    expect(verifyRes.ok()).toBeTruthy();
    const verifyBody = await verifyRes.json();
    expect(verifyBody?.success?.data?.totalAmount).toBe(3500);
    expect(verifyBody?.success?.data?.byOshi?.length).toBeGreaterThan(0);
    logPass("Backend expenses-summary returns correct data");

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      // Card exists in DOM
      // Card can exist twice (e.g. personal/circle sections). Pick the first one.
      const card = page.locator('[data-testid="expenses-summary-card"]').first();
      await expect(card).toBeVisible({ timeout: 45_000 });
      logPass("Expenses summary card is visible");

      // Card has title
      await expect(card).toContainText("今月の推し別支出");
      logPass("Card has correct title");

      // "もっと見る" link navigates to /money
      // There can be multiple "more" links (e.g. header + footer). Pick the first visible one.
      const moreLink = card.locator('[data-testid="expenses-summary-more"]').first();
      await expect(moreLink).toBeVisible();
      await moreLink.click();
      await expect(page).toHaveURL(/\/money/, { timeout: 45_000 });
      logPass("More link navigates to /money");
    } catch (error) {
      logFail("Expenses summary card checks", error);
    }
  });
});
