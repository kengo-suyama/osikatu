import { test, expect } from "@playwright/test";

const CIRCLE_ID = 8181;
const DEVICE_ID = "device-e2e-proposal-filter-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "free", effectivePlan: "free", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

const circle = { id: CIRCLE_ID, name: "Filter Circle", description: "t", myRole: "member", memberCount: 2, plan: "premium" };

const proposals = [
  { id: 201, circleId: CIRCLE_ID, createdByMemberId: 1, title: "Pending", startAt: "2026-03-01T10:00:00+09:00", endAt: null, isAllDay: false, note: null, location: null, status: "pending", reviewedByMemberId: null, reviewedAt: null, reviewComment: null, approvedScheduleId: null, createdAt: "2026-02-01T09:00:00+09:00" },
  { id: 202, circleId: CIRCLE_ID, createdByMemberId: 1, title: "Rejected", startAt: "2026-03-02T10:00:00+09:00", endAt: null, isAllDay: false, note: null, location: null, status: "rejected", reviewedByMemberId: 2, reviewedAt: "2026-02-02T09:00:00+09:00", reviewComment: "NG", approvedScheduleId: null, createdAt: "2026-02-01T09:00:00+09:00" },
  { id: 203, circleId: CIRCLE_ID, createdByMemberId: 1, title: "Approved", startAt: "2026-03-10T10:00:00+09:00", endAt: null, isAllDay: false, note: null, location: null, status: "approved", reviewedByMemberId: 2, reviewedAt: "2026-02-03T09:00:00+09:00", reviewComment: null, approvedScheduleId: 100, createdAt: "2026-02-01T09:00:00+09:00" },
];

test("proposal status filter shows only pending", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/circles/" + CIRCLE_ID, (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(circle) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/schedules**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/calendar**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/schedule-proposals/mine**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: proposals }) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/schedule-proposals?**", (r) => r.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "forbidden" } }) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/members**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }));

  await page.goto("/circles/" + CIRCLE_ID + "/calendar", { waitUntil: "domcontentloaded" });

  const mine = page.locator('[data-testid="schedule-proposal-mine"]');
  await expect(mine).toBeVisible({ timeout: 15_000 });

  // Initially all 3 proposals visible
  const items = mine.locator('[data-testid="proposal-item"]');
  await expect(items).toHaveCount(3);

  // Click pending filter
  await page.locator('[data-testid="proposal-filter-pending"]').click();
  await expect(items).toHaveCount(1);
});
