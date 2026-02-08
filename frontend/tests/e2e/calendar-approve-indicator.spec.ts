import { test, expect } from "@playwright/test";

const CIRCLE_ID = 9090;
const DEVICE_ID = "device-e2e-approve-ind-001";
const PROPOSAL_ID = 501;

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1,
  name: "E2E Manager",
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

const circle = {
  id: CIRCLE_ID,
  name: "Approve Circle",
  description: "test",
  myRole: "owner",
  memberCount: 3,
  plan: "premium",
};

const pendingProposal = {
  id: PROPOSAL_ID,
  circleId: CIRCLE_ID,
  createdByMemberId: 2,
  title: "\u627F\u8A8D\u5F85\u3061\u306E\u63D0\u6848",
  startAt: "2026-03-10T14:00:00+09:00",
  endAt: "2026-03-10T16:00:00+09:00",
  isAllDay: false,
  note: null,
  location: null,
  status: "pending" as const,
  reviewedByMemberId: null,
  reviewedAt: null,
  reviewComment: null,
  approvedScheduleId: null,
  createdAt: "2026-03-01T09:00:00+09:00",
};

const approvedSchedule = {
  id: "cs_999",
  circleId: CIRCLE_ID,
  title: "\u627F\u8A8D\u5F85\u3061\u306E\u63D0\u6848",
  startAt: "2026-03-10T14:00:00+09:00",
  endAt: "2026-03-10T16:00:00+09:00",
  isAllDay: false,
  note: null,
  location: null,
  visibility: "members",
  createdAt: "2026-03-01T09:00:00+09:00",
  updatedAt: "2026-03-01T09:00:00+09:00",
};

test.describe("calendar approve indicator", () => {
  test("approve proposal then calendar-items-ready updates", async ({ page }) => {
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

    let approveCallCount = 0;

    // Initially: no schedules
    // After approve: one schedule returned
    await page.route(`**/api/circles/${CIRCLE_ID}/schedules**`, (route) => {
      const items = approveCallCount > 0 ? [approvedSchedule] : [];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items }),
      });
    });

    // My proposals (empty for manager)
    await page.route(`**/api/circles/${CIRCLE_ID}/schedule-proposals/mine**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) })
    );

    // Pending proposals list
    await page.route(`**/api/circles/${CIRCLE_ID}/schedule-proposals?**`, (route) => {
      const items = approveCallCount > 0 ? [] : [pendingProposal];
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items }),
      });
    });

    // Approve endpoint
    await page.route(`**/api/circles/${CIRCLE_ID}/schedule-proposals/${PROPOSAL_ID}/approve`, (route) => {
      approveCallCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({
          proposal: { ...pendingProposal, status: "approved", reviewedByMemberId: 1, reviewedAt: new Date().toISOString() },
          schedule: { id: "cs_999", title: pendingProposal.title },
        }),
      });
    });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    // Initially: calendar-items-ready with count 0
    const readyEl = page.locator('[data-testid="calendar-items-ready"]');
    await expect(readyEl).toBeVisible({ timeout: 15_000 });
    await expect(readyEl).toHaveAttribute("data-count", "0");

    // Pending proposals section should be visible
    const proposalList = page.locator('[data-testid="schedule-proposal-list"]');
    await expect(proposalList).toBeVisible({ timeout: 10_000 });

    // Click approve button
    const approveBtn = page.locator(`[data-testid="schedule-proposal-approve-${PROPOSAL_ID}"]`);
    await expect(approveBtn).toBeVisible();
    await approveBtn.click();

    // After approval, calendar-items-ready should update with count 1
    await expect(readyEl).toHaveAttribute("data-count", "1", { timeout: 10_000 });

    // The approved schedule should be visible in the list
    await expect(page.locator('text=\u627F\u8A8D\u5F85\u3061\u306E\u63D0\u6848').first()).toBeVisible();
  });
});
