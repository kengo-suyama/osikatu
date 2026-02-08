import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-onboarding-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });
const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "free", effectivePlan: "free", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: false },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("onboarding modal shows on first visit and dismisses", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([{ id: 1, name: "Test Oshi", imageUrl: null, category: "idol", isPrimary: true }]) }));
  await page.route("**/api/circles**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/me/fortune/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ rank: "test", message: "test", date: "2026-02-08" }) }));

  await page.goto("/", { waitUntil: "domcontentloaded" });

  const modal = page.locator('[data-testid="onboarding-modal"]');
  await expect(modal).toBeVisible({ timeout: 15_000 });

  await page.locator('[data-testid="onboarding-close"]').click();
  await expect(modal).not.toBeVisible({ timeout: 5_000 });
});

test("onboarding modal does not show if already completed", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:onboarding:completed", "1");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([{ id: 1, name: "Test Oshi", imageUrl: null, category: "idol", isPrimary: true }]) }));
  await page.route("**/api/circles**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/me/fortune/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ rank: "test", message: "test", date: "2026-02-08" }) }));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);

  const modal = page.locator('[data-testid="onboarding-modal"]');
  await expect(modal).toHaveCount(0);
});
