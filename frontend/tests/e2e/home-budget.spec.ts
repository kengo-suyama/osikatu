import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
};

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
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = response.url();
      if (url.includes("/api/") || url.includes("/home")) {
        console.log(`[${label}][response ${status}] ${url}`);
      }
    }
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes("/api/")) {
      console.log(`[${label}][requestfailed] ${url} ${req.failure()?.errorText ?? ""}`);
    }
  });
};

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(`${FRONTEND_BASE}/home`, { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Frontend server is not running on ${FRONTEND_BASE}.`);
};

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to skip onboarding: ${res.status()} ${res.url()}`);
  }
};

const ensureOshi = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
  const res = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to list oshis: ${res.status()} ${res.url()}`);
  }
  const body = await res.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: { name: "予算テスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) {
    throw new Error(`Failed to create oshi: ${createRes.status()} ${createRes.url()}`);
  }
  const created = await createRes.json();
  return created?.success?.data ?? null;
};

test.describe("home budget card", () => {
  test("budget card is visible with testids", async ({ page, request }) => {
    attachDiagnostics(page, "home-budget");
    await assertFrontendUp(request);

    const deviceId = `device-e2e-budget-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);

    const oshi = await ensureOshi(request, deviceId);
    if (!oshi) throw new Error("Could not ensure oshi");

    await page.addInitScript((deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      // Budget card is visible
      const budgetCard = page.locator('[data-testid="home-budget-card"]');
      await expect(budgetCard).toBeVisible({ timeout: 45_000 });
      logPass("Budget card is visible");

      // Remaining amount is visible
      const remaining = page.locator('[data-testid="home-budget-remaining"]');
      await expect(remaining).toBeVisible();
      await expect(remaining).toContainText("¥");
      logPass("Remaining budget amount is visible");

      // Budget input exists
      const budgetInput = page.locator('[data-testid="home-budget-input"]');
      await expect(budgetInput).toBeVisible();
      logPass("Budget input is visible");

      // Save button exists
      const saveBtn = page.locator('[data-testid="home-budget-save"]');
      await expect(saveBtn).toBeVisible();
      logPass("Save button is visible");

      // Card contains expected text
      await expect(budgetCard).toContainText("今月あといくら？");
      logPass("Budget card has expected title");
    } catch (error) {
      logFail("Home budget card checks", error);
    }
  });
});
