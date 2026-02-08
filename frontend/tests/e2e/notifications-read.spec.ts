import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-notif-read-001";

const successBody = (data: unknown) =>
  JSON.stringify({
    success: {
      data,
      meta: {},
    },
  });

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

test.describe("notifications read flow", () => {
  test("unread becomes read after open (no navigation target)", async ({ page }) => {
    await page.addInitScript((deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
    }, DEVICE_ID);

    // Keep layout background calls stable.
    await page.route("**/api/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody(baseMe()),
      }),
    );
    await page.route("**/api/oshis**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody([]),
      }),
    );
    await page.route("**/api/circles**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody([]),
      }),
    );

    const notification = {
      id: "nt_5001",
      type: "test",
      title: "既読テスト",
      body: "本文",
      linkUrl: null,
      notifyAt: null,
      readAt: null,
      createdAt: new Date().toISOString(),
      sourceType: null,
      sourceId: null,
      sourceMeta: null,
      openPath: null,
    };

    await page.route("**/api/me/notifications**", (route) => {
      if (route.request().method() !== "GET") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [notification], nextCursor: null }),
      });
    });

    await page.route("**/api/me/notifications/nt_5001/read", (route) => {
      if (route.request().method() !== "POST") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ ...notification, readAt: new Date().toISOString() }),
      });
    });

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible({ timeout: 30_000 });

    const state = item.locator('[data-testid="notification-read-state"]');
    await expect(state).toHaveText("未読");

    await item.click();

    // No openPath/linkUrl => stays on page and shows toast.
    await expect(page.locator("text=移動先なし")).toBeVisible({ timeout: 10_000 });
    await expect(state).toHaveText("既読");
  });
});

