import { test, expect } from "@playwright/test";

const CIRCLE_ID = 7070;
const DEVICE_ID = "device-e2e-notif-openpath-001";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1,
  name: "E2E User",
  email: "e2e@example.com",
  plan: "plus",
  effectivePlan: "plus",
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

const makeNotification = (
  id: string,
  sourceType: string,
  openPath: string | null,
  readAt: string | null = null
) => ({
  id,
  type: "proposal.approved",
  title: "\u4E88\u5B9A\u63D0\u6848\u304C\u627F\u8A8D\u3055\u308C\u307E\u3057\u305F",
  body: "\u30C6\u30B9\u30C8\u672C\u6587",
  linkUrl: null,
  notifyAt: new Date().toISOString(),
  readAt,
  createdAt: new Date().toISOString(),
  sourceType,
  sourceId: 42,
  sourceMeta: { circleId: CIRCLE_ID },
  openPath,
});

test.describe("notification openPath deep link", () => {
  test("manager schedule_proposal navigates to proposals tab", async ({ page }) => {
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

    // Prevent oshi fallback
    await page.route("**/api/oshis**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    const managerNotification = makeNotification(
      "nt_1001",
      "scheduleProposal",
      `/circles/${CIRCLE_ID}/calendar?tab=proposals`
    );

    await page.route("**/api/me/notifications**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [managerNotification], nextCursor: null }),
        });
      }
      // POST (mark read)
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ ...managerNotification, readAt: new Date().toISOString() }),
      });
    });

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible({ timeout: 15_000 });

    // Verify "開く" is visible (openPath is set)
    const openLabel = item.locator('[data-testid="notification-open"]');
    await expect(openLabel).toBeVisible();

    // Click the notification
    await item.click();

    // Should navigate to proposals tab
    await page.waitForURL(/\/calendar\?tab=proposals/, { timeout: 10_000 });
    expect(page.url()).toContain("tab=proposals");
  });

  test("member schedule_proposal navigates to mine tab", async ({ page }) => {
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

    // Prevent oshi fallback
    await page.route("**/api/oshis**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    const memberNotification = makeNotification(
      "nt_2001",
      "scheduleProposal",
      `/circles/${CIRCLE_ID}/calendar?tab=mine`
    );

    await page.route("**/api/me/notifications**", (route) => {
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [memberNotification], nextCursor: null }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ ...memberNotification, readAt: new Date().toISOString() }),
      });
    });

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible({ timeout: 15_000 });

    // Click the notification
    await item.click();

    // Should navigate to mine tab
    await page.waitForURL(/\/calendar\?tab=mine/, { timeout: 10_000 });
    expect(page.url()).toContain("tab=mine");
  });
});
