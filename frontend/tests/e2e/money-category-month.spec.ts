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

test.describe("Money category month view", () => {
  test("month nav renders and category card visible", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-money");
    await ensureOnboardingDone(request, deviceId);

    await initStorage(page, deviceId);

    await page.goto("/money", { waitUntil: "domcontentloaded" });

    // Month navigation should be visible
    const monthNav = page.locator('[data-testid="money-month-nav"]');
    await expect(monthNav).toBeVisible({ timeout: 15_000 });

    // Month label should show current month in format like "2026年2月"
    const monthLabel = page.locator('[data-testid="money-month-label"]');
    await expect(monthLabel).toBeVisible();
    const text = await monthLabel.textContent();
    expect(text).toMatch(/\d{4}年\d{1,2}月/);

    // Category card should exist
    const categoryCard = page.locator('[data-testid="money-category-card"]');
    await expect(categoryCard).toBeVisible();

    // Total should be visible
    const total = page.locator('[data-testid="money-total"]');
    await expect(total).toBeVisible();

    // Prev button should work
    await page.locator('[data-testid="money-month-prev"]').click();
    const updatedText = await monthLabel.textContent();
    expect(updatedText).not.toBe(text);

    console.log("[PASS] Money category month view renders correctly");
  });
});
