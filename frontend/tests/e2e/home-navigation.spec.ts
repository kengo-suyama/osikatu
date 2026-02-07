import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => console.log(`[PASS] ${message}`);
const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
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
) => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error(`list oshis failed: ${listRes.status()}`);
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json", Accept: "application/json" },
    data: { name: "導線テスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

test.describe("home navigation links", () => {
  test("budget card links to /money", async ({ page, request }) => {
    const deviceId = `device-e2e-nav-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      const budgetLink = page.locator('[data-testid="budget-to-money"]');
      await expect(budgetLink).toBeVisible({ timeout: 45_000 });
      await expect(budgetLink).toContainText("詳細へ");
      await budgetLink.click();
      await page.waitForURL(/\/money/, { timeout: 10_000 });
      logPass("Budget card 詳細へ navigates to /money");
    } catch (error) {
      logFail("Budget navigation", error);
    }
  });

  test("expenses card links to /money", async ({ page, request }) => {
    const deviceId = `device-e2e-nav2-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      const moreLink = page.locator('[data-testid="expenses-summary-more"]');
      await expect(moreLink).toBeVisible({ timeout: 45_000 });
      await moreLink.click();
      await page.waitForURL(/\/money/, { timeout: 10_000 });
      logPass("Expenses card もっと見る navigates to /money");
    } catch (error) {
      logFail("Expenses navigation", error);
    }
  });

  test("log card links to /logs", async ({ page, request }) => {
    const deviceId = `device-e2e-nav3-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      const logLink = page.locator('[data-testid="home-log-more"]');
      await expect(logLink).toBeVisible({ timeout: 45_000 });
      await expect(logLink).toContainText("もっと見る");
      await logLink.click();
      await page.waitForURL(/\/logs/, { timeout: 10_000 });
      logPass("Log card もっと見る navigates to /logs");
    } catch (error) {
      logFail("Log navigation", error);
    }
  });
});
