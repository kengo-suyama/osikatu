import { test, expect } from "@playwright/test";

const CIRCLE_ID = 8080;
const DEVICE_ID = "device-e2e-proposal-ux-001";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

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

const circle = {
  id: CIRCLE_ID,
  name: "Test Circle",
  description: "test",
  myRole: "member",
  memberCount: 3,
  plan: "premium",
};

const rejectedProposal = {
  id: 101,
  circleId: CIRCLE_ID,
  createdByMemberId: 1,
  title: "\u5374\u4E0B\u3055\u308C\u305F\u63D0\u6848",
  startAt: "2026-03-01T14:00:00+09:00",
  endAt: "2026-03-01T16:00:00+09:00",
  isAllDay: false,
  note: null,
  location: null,
  status: "rejected" as const,
  reviewedByMemberId: 2,
  reviewedAt: "2026-02-28T10:00:00+09:00",
  reviewComment: "\u65E5\u7A0B\u304C\u5408\u3044\u307E\u305B\u3093",
  approvedScheduleId: null,
  createdAt: "2026-02-27T09:00:00+09:00",
};

const pendingProposal = {
  id: 102,
  circleId: CIRCLE_ID,
  createdByMemberId: 1,
  title: "\u5BE9\u67FB\u4E2D\u306E\u63D0\u6848",
  startAt: "2026-03-05T10:00:00+09:00",
  endAt: null,
  isAllDay: false,
  note: null,
  location: null,
  status: "pending" as const,
  reviewedByMemberId: null,
  reviewedAt: null,
  reviewComment: null,
  approvedScheduleId: null,
  createdAt: "2026-02-28T09:00:00+09:00",
};

test.describe("calendar proposal UX for member", () => {
  test("rejected proposal shows status and reason", async ({ page }) => {
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

    await page.route(`**/api/circles/${CIRCLE_ID}`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(circle) })
    );

    // Circle schedules (empty for simplicity)
    await page.route(`**/api/circles/${CIRCLE_ID}/schedules**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) })
    );

    // My proposals - includes rejected with reason and pending
    await page.route(`**/api/circles/${CIRCLE_ID}/schedule-proposals/mine**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [rejectedProposal, pendingProposal] }),
      })
    );

    // Pending proposals list (member gets 403 - normal)
    await page.route(`**/api/circles/${CIRCLE_ID}/schedule-proposals?**`, (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: { code: "FORBIDDEN", message: "forbidden" } }) })
    );

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    // Wait for "\u81EA\u5206\u306E\u63D0\u6848" section
    const mineSection = page.locator('[data-testid="schedule-proposal-mine"]');
    await expect(mineSection).toBeVisible({ timeout: 15_000 });

    // Verify proposal items
    const proposalItems = mineSection.locator('[data-testid="proposal-item"]');
    await expect(proposalItems).toHaveCount(2);

    // First item: rejected proposal
    const rejectedItem = proposalItems.nth(0);
    const rejectedStatus = rejectedItem.locator('[data-testid="proposal-status"]');
    await expect(rejectedStatus).toHaveText("\u5374\u4E0B");

    // Rejected reason is visible
    const rejectedReason = rejectedItem.locator('[data-testid="proposal-rejected-reason"]');
    await expect(rejectedReason).toBeVisible();
    await expect(rejectedReason).toContainText("\u65E5\u7A0B\u304C\u5408\u3044\u307E\u305B\u3093");

    // Second item: pending proposal
    const pendingItem = proposalItems.nth(1);
    const pendingStatus = pendingItem.locator('[data-testid="proposal-status"]');
    await expect(pendingStatus).toHaveText("\u5BE9\u67FB\u4E2D");

    // Pending should NOT have rejected reason
    await expect(pendingItem.locator('[data-testid="proposal-rejected-reason"]')).toHaveCount(0);
  });
});
