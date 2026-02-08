import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-deeplink-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });
const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "free", effectivePlan: "free", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("notification list renders with openPath", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/me/notifications**", (r) => r.fulfill({
    status: 200, contentType: "application/json",
    body: successBody([
      {
        id: "nt_1", type: "info", title: "Test", body: "Deep link test",
        linkUrl: null, notifyAt: null, readAt: null, createdAt: "2026-02-09T00:00:00+09:00",
        sourceType: "pins", sourceId: null, sourceMeta: { circleId: 1 },
        openPath: "/circles/1/pins",
      },
      {
        id: "nt_2", type: "info", title: "Fallback", body: "No path",
        linkUrl: null, notifyAt: null, readAt: null, createdAt: "2026-02-09T00:00:00+09:00",
        sourceType: null, sourceId: null, sourceMeta: null,
        openPath: "/notifications",
      },
    ]),
  }));

  await page.goto("/notifications", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="notification-list"]')).toBeVisible({ timeout: 15_000 });
});
