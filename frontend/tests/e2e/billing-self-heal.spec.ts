import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-billing-self-heal-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = (plan: "free" | "plus") => ({
  id: 1,
  name: "E2E",
  email: "e2e@example.com",
  plan,
  effectivePlan: plan,
  trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("billing return success can self-heal via refresh when plan flips to plus", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe("free")),
    })
  );
  await page.route("**/api/oshis**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
  );

  await page.goto("/billing/return?status=success", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="billing-return-page"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-testid="billing-return-notyet"]')).toBeVisible({ timeout: 15_000 });

  // Simulate backend eventually reflecting Plus (e.g. webhook processed) on the next refresh.
  await page.unroute("**/api/me");
  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe("plus")),
    })
  );

  await page.getByRole("button", { name: "再読み込み" }).click();
  await expect(page.locator('[data-testid="billing-return-success"]')).toBeVisible({ timeout: 15_000 });
});
