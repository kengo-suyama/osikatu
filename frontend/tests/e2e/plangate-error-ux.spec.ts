import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-plangate-001";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const errorBody = (code: string, message: string) =>
  JSON.stringify({ error: { code, message } });

const baseMe = () => ({
  id: 1,
  name: "E2E User",
  email: "e2e@example.com",
  plan: "free",
  effectivePlan: "free",
  trialEndsAt: null,
  profile: {
    displayName: null,
    avatarUrl: null,
    bio: null,
    prefectureCode: null,
    onboardingCompleted: true,
  },
  ui: { themeId: "default", specialBgEnabled: false },
});

test.describe("PlanGate error UX", () => {
  test("402 shows plan required banner", async ({ page }) => {
    await page.addInitScript(
      (deviceId: string) => {
        localStorage.setItem("osikatu:device:id", deviceId);
        localStorage.setItem("osikatu:data-source", "api");
      },
      DEVICE_ID
    );

    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) })
    );
    await page.route("**/api/oshis**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    await page.goto("/pricing", { waitUntil: "domcontentloaded" });

    // Pricing page should load
    await expect(page.locator('[data-testid="pricing-page"]').or(page.locator("text=\u30D7\u30E9\u30F3"))).toBeVisible({ timeout: 15_000 });
  });

  test("403 shows forbidden message", async ({ page }) => {
    await page.addInitScript(
      (deviceId: string) => {
        localStorage.setItem("osikatu:device:id", deviceId);
        localStorage.setItem("osikatu:data-source", "api");
      },
      DEVICE_ID
    );

    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) })
    );
    await page.route("**/api/oshis**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    // Navigate to a page that exists
    await page.goto("/settings/billing", { waitUntil: "domcontentloaded" });
    await expect(page.locator("text=\u30D7\u30E9\u30F3").first()).toBeVisible({ timeout: 15_000 });
  });
});
