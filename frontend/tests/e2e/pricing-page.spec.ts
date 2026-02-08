import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-pricing-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1, name: "E2E User", email: "e2e@example.com",
  plan: "free", effectivePlan: "free", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("pricing page shows plans and upgrade button", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));

  await page.goto("/pricing", { waitUntil: "domcontentloaded" });

  await expect(page.locator('[data-testid="pricing-page"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="pricing-plan-free"]')).toBeVisible();
  await expect(page.locator('[data-testid="pricing-plan-plus"]')).toBeVisible();
  await expect(page.locator('[data-testid="pricing-upgrade"]')).toBeVisible();
});
