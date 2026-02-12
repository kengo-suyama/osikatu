import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(FRONTEND_BASE + "/home", { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Frontend server is not running on " + FRONTEND_BASE + ".");
};

const ensureOnboardingDone = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
  await request.post(API_BASE + "/api/me/onboarding/skip", {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
};

const initStorage = (page: Parameters<typeof test>[1]["page"], deviceId: string) =>
  page.addInitScript((id: string) => {
    localStorage.setItem("osikatu:device:id", id);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  }, deviceId);

const uniqueDeviceId = (prefix: string) =>
  prefix + "-" + Date.now() + "-" + process.pid + "-" + Math.floor(Math.random() * 1000);

test.describe("Log search UX enhancements", () => {
  test("date range filter and result count visible", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-log-search");
    await ensureOnboardingDone(request, deviceId);

    await initStorage(page, deviceId);

    await page.goto("/log", { waitUntil: "domcontentloaded" });

    // Wait for API mode to activate
    await expect(page.locator('[data-testid="log-mode"][data-mode="api"]')).toBeVisible({ timeout: 15_000 });

    // Search bar should be visible
    const searchInput = page.locator('[data-testid="log-search-input"]');
    await expect(searchInput).toBeVisible();

    // Date range filter should be visible
    const dateRange = page.locator('[data-testid="log-date-range"]');
    await expect(dateRange).toBeVisible();

    // Date from/to inputs should exist
    const dateFrom = page.locator('[data-testid="log-date-from"]');
    const dateTo = page.locator('[data-testid="log-date-to"]');
    await expect(dateFrom).toBeVisible();
    await expect(dateTo).toBeVisible();

    // When we type a search, result count should appear
    await searchInput.fill("nonexistent-query-xyz");
    // Wait for debounce
    await page.waitForTimeout(600);
    const resultCount = page.locator('[data-testid="log-result-count"]');
    await expect(resultCount).toBeVisible({ timeout: 5_000 });
    const countText = await resultCount.textContent();
    expect(countText).toMatch(/\d+件/);

    console.log("[PASS] Log search UX enhancements work correctly");
  });
});
