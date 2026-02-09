import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-billing-return-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = (plan = "free") => ({
  id: 1,
  name: "E2E",
  email: "e2e@example.com",
  plan,
  effectivePlan: plan,
  trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("billing return cancel redirects to pricing with message", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("free")) })
  );
  await page.route("**/api/oshis**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
  );

  await page.goto("/billing/return?status=cancel", { waitUntil: "domcontentloaded" });
  await page.waitForURL("**/pricing?billing=cancel", { timeout: 15_000 });
  await expect(page.locator('[data-testid="pricing-billing-cancel"]')).toBeVisible({ timeout: 10_000 });
});

