import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-billing-complete-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });
const baseMe = (plan = "free") => ({
  id: 1, name: "E2E", email: "e2e@example.com",
  plan, effectivePlan: plan, trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("billing complete page shows synced when plan is plus", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  // Always return plus plan
  await page.route("**/api/me", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody(baseMe("plus")),
  }));
  await page.route("**/api/oshis**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody([]),
  }));

  await page.goto("/billing/complete", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="billing-complete-page"]')).toBeVisible({ timeout: 15_000 });

  // Should eventually show synced status
  await expect(page.locator('[data-testid="billing-sync-status"][data-status="synced"]')).toBeVisible({ timeout: 30_000 });
});

test("billing complete page shows polling initially with free plan", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody(baseMe("free")),
  }));
  await page.route("**/api/oshis**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody([]),
  }));

  await page.goto("/billing/complete", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="billing-complete-page"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="billing-sync-status"][data-status="polling"]')).toBeVisible({ timeout: 10_000 });
});
