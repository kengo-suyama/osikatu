import { test, expect } from "@playwright/test";

const CIRCLE_ID = 8181;
const DEVICE_ID = "device-e2e-oplog-filter-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "plus", effectivePlan: "plus", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

const circle = { id: CIRCLE_ID, name: "Log Circle", description: "t", myRole: "owner", memberCount: 1, plan: "premium" };

const logs = {
  items: [
    { id: "lg_001", action: "settlement.create", circleId: String(CIRCLE_ID), actorUserId: 1, targetType: null, targetId: null, meta: { request_id: "req-abc-111" }, createdAt: "2026-02-08T10:00:00+09:00" },
    { id: "lg_002", action: "pin.create", circleId: String(CIRCLE_ID), actorUserId: 1, targetType: null, targetId: null, meta: { request_id: "req-xyz-222" }, createdAt: "2026-02-08T11:00:00+09:00" },
    { id: "lg_003", action: "member.join", circleId: String(CIRCLE_ID), actorUserId: 1, targetType: null, targetId: null, meta: {}, createdAt: "2026-02-08T12:00:00+09:00" },
  ],
  nextCursor: null,
};

test("request_id filter narrows log list", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/circles/" + CIRCLE_ID, (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(circle) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/operation-logs**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(logs) }));

  await page.goto("/circles/" + CIRCLE_ID + "/logs", { waitUntil: "domcontentloaded" });

  const filter = page.locator('[data-testid="oplog-requestid-filter"]');
  await expect(filter).toBeVisible({ timeout: 15_000 });

  // Initially all 3 logs visible
  const requestIdBadges = page.locator('[data-testid="oplog-request-id"]');
  // Two logs have request_id badges, one does not
  await expect(requestIdBadges).toHaveCount(2);

  // Type filter for "abc" — should show only first log
  await filter.fill("abc");
  await expect(requestIdBadges).toHaveCount(1);
});
