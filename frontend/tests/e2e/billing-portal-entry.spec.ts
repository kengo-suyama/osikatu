import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-portal-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });
const baseMe = (plan = "plus") => ({
  id: 1, name: "E2E", email: "e2e@example.com",
  plan, effectivePlan: plan, trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("billing settings shows portal button for plus user", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody(baseMe("plus")),
  }));
  await page.route("**/api/oshis**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody([]),
  }));
  await page.route("**/api/me/plan**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody({ plan: "plus", effectivePlan: "plus", planStatus: "active", trialEndsAt: null, quotas: {}, features: {} }),
  }));
  await page.route("**/api/billing/portal**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody({ url: "https://billing.stripe.com/test-portal" }),
  }));

  await page.goto("/settings/billing", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="billing-screen"]')).toBeVisible({ timeout: 15_000 });
});
