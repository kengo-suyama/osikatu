import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8000").trim();
const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const DEVICE_ID = process.env.PLAYWRIGHT_DEVICE_ID ?? "device-e2e-001";
const CIRCLE_ID = 123;

const successBody = (data: unknown) =>
  JSON.stringify({
    success: {
      data,
      meta: {},
    },
  });

const baseMe = (plan: "free" | "plus" = "plus") => ({
  id: 1,
  name: "E2E User",
  email: "e2e@example.com",
  plan,
  effectivePlan: plan,
  trialEndsAt: null,
  profile: {
    displayName: null,
    avatarUrl: null,
    bio: null,
    prefectureCode: null,
    onboardingCompleted: true,
  },
  ui: {
    themeId: "default",
    specialBgEnabled: false,
  },
});

const baseCircle = (myRole: "owner" | "admin" | "member" = "owner") => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Circle",
    description: null,
    oshiLabel: "\u63A8\u3057",
    oshiTag: "oshi",
    oshiTags: ["oshi"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 3,
    myRole,
    planRequired: "free",
    lastActivityAt: null,
    ui: {
      circleThemeId: null,
      specialBgEnabled: false,
      specialBgVariant: null,
    },
    createdAt: now,
    updatedAt: now,
  };
};

const circleUrl = new RegExp(`/api/circles/${CIRCLE_ID}$`);
const calendarUrl = new RegExp(`/api/circles/${CIRCLE_ID}/calendar(\\?.*)?$`);
const proposalsUrl = new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals$`);
const proposalsMineUrl = new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals/mine(\\?.*)?$`);
const proposalApproveUrl = new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals/\\d+/approve$`);
const proposalRejectUrl = new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals/\\d+/reject$`);
const notificationsUrl = /\/api\/me\/notifications/;

const seedLocalStorage = async (page: Parameters<typeof test>[1]["page"]) => {
  await page.addInitScript(
    ([deviceId, apiBase]) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", apiBase);
    },
    [DEVICE_ID, API_BASE],
  );
};

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(`${FRONTEND_BASE}/home`, { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Frontend not running on ${FRONTEND_BASE}`);
};

const makeProposal = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  circleId: CIRCLE_ID,
  createdByMemberId: 2,
  title: "テスト提案",
  startAt: "2026-03-01T10:00:00+09:00",
  endAt: "2026-03-01T12:00:00+09:00",
  isAllDay: false,
  note: "場所は後日",
  location: "渋谷",
  status: "pending",
  reviewedByMemberId: null,
  reviewedAt: null,
  reviewComment: null,
  approvedScheduleId: null,
  createdAt: new Date().toISOString(),
  ...overrides,
});

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
  id: "nt_1001",
  type: "proposal.approved",
  title: "E2E Circle — 予定提案が承認されました",
  body: "「テスト提案」が承認されました。",
  linkUrl: `/circles/${CIRCLE_ID}/calendar`,
  notifyAt: null,
  readAt: null,
  createdAt: new Date().toISOString(),
  sourceType: "scheduleProposal",
  sourceId: 42,
  ...overrides,
});

test.describe("proposal notification flow", () => {
  test("approve creates notification visible on /notifications", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);

    const proposal = makeProposal({ id: 42, title: "通知テスト提案" });
    let notificationCreated = false;

    // Mock: me (plus, owner)
    await page.route("**/api/me", (route) => {
      if (route.request().url().includes("/notifications")) return route.fallthrough();
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("plus")) });
    });
    await page.route(circleUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle("owner")) }),
    );

    // Calendar
    let calendarItems: unknown[] = [];
    await page.route(calendarUrl, (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: calendarItems }) });
    });

    // Proposals mine → empty
    await page.route(proposalsMineUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }),
    );

    // Proposals list → one pending
    await page.route(proposalsUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [proposal] }) }),
    );

    // Approve endpoint
    await page.route(proposalApproveUrl, async (route) => {
      const approved = { ...proposal, status: "approved", reviewedByMemberId: 1, reviewedAt: new Date().toISOString(), approvedScheduleId: "cs_999" };
      calendarItems = [{
        id: "cs_999",
        circleId: CIRCLE_ID,
        title: "通知テスト提案",
        startAt: proposal.startAt,
        endAt: proposal.endAt,
        isAllDay: false,
        note: proposal.note,
        location: proposal.location,
        participants: [],
        updatedAt: new Date().toISOString(),
      }];
      notificationCreated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ proposal: approved, schedule: { id: "cs_999", title: "通知テスト提案" } }),
      });
    });

    // Notifications endpoint — returns notification after approve
    await page.route(notificationsUrl, (route) => {
      if (notificationCreated) {
        const notification = makeNotification({
          title: "E2E Circle — 予定提案が承認されました",
          body: "「通知テスト提案」が承認されました。",
        });
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [notification], nextCursor: null }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [], nextCursor: null }),
        });
      }
    });

    // Go to calendar, approve the proposal
    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    const proposalList = page.locator('[data-testid="schedule-proposal-list"]');
    await expect(proposalList).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("text=通知テスト提案")).toBeVisible({ timeout: 5_000 });

    const approveBtn = page.locator('[data-testid="schedule-proposal-approve-42"]');
    await expect(approveBtn).toBeVisible({ timeout: 5_000 });
    await approveBtn.click();

    // Toast
    await expect(page.locator("text=承認しました")).toBeVisible({ timeout: 10_000 });

    // Navigate to /notifications
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    // See the notification
    const notificationItem = page.locator('[data-testid="notification-item"]');
    await expect(notificationItem.first()).toBeVisible({ timeout: 30_000 });
    await expect(notificationItem.first()).toContainText("承認");
    await expect(notificationItem.first()).toContainText("通知テスト提案");
  });

  test("reject creates notification visible on /notifications", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);

    const proposal = makeProposal({ id: 55, title: "却下テスト提案" });
    let notificationCreated = false;

    // Mock: me (plus, owner)
    await page.route("**/api/me", (route) => {
      if (route.request().url().includes("/notifications")) return route.fallthrough();
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("plus")) });
    });
    await page.route(circleUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle("owner")) }),
    );

    let calendarItems: unknown[] = [];
    await page.route(calendarUrl, (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: calendarItems }) });
    });

    await page.route(proposalsMineUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }),
    );

    await page.route(proposalsUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [proposal] }) }),
    );

    // Reject endpoint
    await page.route(proposalRejectUrl, async (route) => {
      const rejected = { ...proposal, status: "rejected", reviewedByMemberId: 1, reviewedAt: new Date().toISOString() };
      notificationCreated = true;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ proposal: rejected }),
      });
    });

    // Notifications endpoint
    await page.route(notificationsUrl, (route) => {
      if (notificationCreated) {
        const notification = makeNotification({
          id: "nt_1002",
          type: "proposal.rejected",
          title: "E2E Circle — 予定提案が却下されました",
          body: "「却下テスト提案」が却下されました。",
        });
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [notification], nextCursor: null }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items: [], nextCursor: null }),
        });
      }
    });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    const proposalList = page.locator('[data-testid="schedule-proposal-list"]');
    await expect(proposalList).toBeVisible({ timeout: 30_000 });

    const rejectBtn = page.locator('[data-testid="schedule-proposal-reject-55"]');
    await expect(rejectBtn).toBeVisible({ timeout: 5_000 });
    await rejectBtn.click();

    await expect(page.locator("text=却下しました")).toBeVisible({ timeout: 10_000 });

    // Navigate to /notifications
    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    const notificationItem = page.locator('[data-testid="notification-item"]');
    await expect(notificationItem.first()).toBeVisible({ timeout: 30_000 });
    await expect(notificationItem.first()).toContainText("却下");
    await expect(notificationItem.first()).toContainText("却下テスト提案");
  });
});
