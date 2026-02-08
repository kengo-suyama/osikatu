import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-bulk-read-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });
const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "free", effectivePlan: "free", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

const notifications = {
  items: [
    { id: "nt_1", type: "test", title: "Unread1", body: "b", linkUrl: null, notifyAt: "2026-02-08T10:00:00+09:00", readAt: null, createdAt: "2026-02-08T10:00:00+09:00", sourceType: null, sourceId: null, sourceMeta: null, openPath: null },
    { id: "nt_2", type: "test", title: "Read1", body: "b", linkUrl: null, notifyAt: "2026-02-08T11:00:00+09:00", readAt: "2026-02-08T12:00:00+09:00", createdAt: "2026-02-08T11:00:00+09:00", sourceType: null, sourceId: null, sourceMeta: null, openPath: null },
  ],
  nextCursor: null,
};

test("bulk read all and unread filter", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/me/notifications?**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(notifications) }));
  await page.route("**/api/me/notifications/read-all", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ markedCount: 1 }) }));

  await page.goto("/notifications", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="notification-list"]')).toBeVisible({ timeout: 15_000 });

  // Unread filter toggle
  const filterBtn = page.locator('[data-testid="notification-filter-unread"]');
  await expect(filterBtn).toBeVisible();

  // Read-all button visible when unread exists
  const readAllBtn = page.locator('[data-testid="notification-read-all"]');
  await expect(readAllBtn).toBeVisible();

  // Click read-all
  await readAllBtn.click();

  // After read-all, the button should disappear (unreadCount becomes 0)
  await expect(readAllBtn).toHaveCount(0, { timeout: 5_000 });
});
