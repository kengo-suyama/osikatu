import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-notif-read-001";

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

const unreadNotification = {
  id: "nt_3001",
  type: "proposal.approved",
  title: "\u672A\u8AAD\u306E\u901A\u77E5",
  body: "\u30C6\u30B9\u30C8\u901A\u77E5\u672C\u6587",
  linkUrl: "/notifications",
  notifyAt: new Date().toISOString(),
  readAt: null,
  createdAt: new Date().toISOString(),
  sourceType: "scheduleProposal",
  sourceId: 42,
  sourceMeta: { circleId: 9090 },
  openPath: "/notifications",
};

test.describe("notification mark-as-read", () => {
  test("unread notification becomes read after click", async ({ page }) => {
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

    let readCalled = false;

    await page.route("**/api/me/notifications**", (route) => {
      const url = route.request().url();
      const method = route.request().method();

      // POST mark-as-read
      if (method === "POST" && url.includes("/read")) {
        readCalled = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ ...unreadNotification, readAt: new Date().toISOString() }),
        });
      }

      // GET notifications list
      if (method === "GET") {
        const item = readCalled
          ? { ...unreadNotification, readAt: new Date().toISOString() }
          : unreadNotification;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [item], nextCursor: null }),
        });
      }

      return route.continue();
    });

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    // Wait for notifications to load
    const list = page.locator('[data-testid="notification-list"]');
    await expect(list).toBeVisible({ timeout: 15_000 });

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible();

    // Should show unread style (emerald border)
    await expect(item).toHaveClass(/border-emerald/);

    // Should show "\u672A\u8AAD" badge
    await expect(item.locator("text=\u672A\u8AAD")).toBeVisible();

    // Click the notification to mark as read
    await item.click();

    // The mark-as-read API was called
    // After navigation back, verify the notification is now read
    // (Since click navigates away, we check the API was called)
    expect(readCalled).toBe(true);
  });
});
