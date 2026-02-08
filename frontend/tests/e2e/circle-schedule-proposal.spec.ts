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

const errorBody = (code: string, message: string) =>
  JSON.stringify({
    error: { code, message },
  });

const baseMe = (plan: "free" | "plus" = "free") => ({
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

const baseCircle = (myRole: "owner" | "admin" | "member" = "member") => {
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

let proposalIdCounter = 100;

const makeProposal = (overrides: Record<string, unknown> = {}) => ({
  id: proposalIdCounter++,
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

test.describe("schedule proposal flow", () => {
  test("member submit falls back to proposal on 403", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);

    const createdProposal = makeProposal({ title: "オフ会提案" });

    // Mock: me (free, member)
    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("free")) }),
    );
    await page.route(circleUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle("member")) }),
    );

    // Calendar GET → empty, POST → 403
    await page.route(calendarUrl, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({ status: 403, contentType: "application/json", body: errorBody("FORBIDDEN", "Premium owner/admin only.") });
        return;
      }
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) });
    });

    // Proposals mine → empty initially
    await page.route(proposalsMineUrl, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }),
    );

    // Proposals list → 403 (member)
    await page.route(proposalsUrl, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({ status: 201, contentType: "application/json", body: successBody({ proposal: createdProposal }) });
        return;
      }
      route.fulfill({ status: 403, contentType: "application/json", body: errorBody("FORBIDDEN", "Premium owner/admin only.") });
    });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    // Open dialog
    const createBtn = page.locator('[data-testid="schedule-create"]');
    await expect(createBtn).toBeVisible({ timeout: 30_000 });
    await createBtn.click();

    // See hint
    const hint = page.locator('[data-testid="schedule-create-hint"]');
    await expect(hint).toBeVisible({ timeout: 10_000 });
    await expect(hint).toContainText("提案");

    // Fill form
    const titleInput = page.locator('[data-testid="schedule-create-title"]');
    await titleInput.fill("オフ会提案");
    const startInput = page.locator('input[type="datetime-local"]').first();
    await startInput.fill("2026-03-01T10:00");

    // Submit → 403 → proposal fallback
    const submitBtn = page.locator('[data-testid="schedule-create-submit"]');
    await submitBtn.click();

    // Toast: "提案を送信しました"
    await expect(page.locator("text=提案を送信しました")).toBeVisible({ timeout: 10_000 });

    // Dialog should have closed
    await expect(titleInput).not.toBeVisible({ timeout: 5_000 });
  });

  test("owner sees pending proposals and can approve", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);

    const proposal = makeProposal({ id: 42, title: "メンバー提案のオフ会" });

    // Mock: me (plus, owner)
    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("plus")) }),
    );
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
      // After approve, calendar should return the new schedule
      calendarItems = [{
        id: "cs_999",
        circleId: CIRCLE_ID,
        title: "メンバー提案のオフ会",
        startAt: proposal.startAt,
        endAt: proposal.endAt,
        isAllDay: false,
        note: proposal.note,
        location: proposal.location,
        participants: [],
        updatedAt: new Date().toISOString(),
      }];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ proposal: approved, schedule: { id: "cs_999", title: "メンバー提案のオフ会" } }),
      });
    });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    // See proposal list
    const proposalList = page.locator('[data-testid="schedule-proposal-list"]');
    await expect(proposalList).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("text=メンバー提案のオフ会")).toBeVisible({ timeout: 5_000 });

    // Approve
    const approveBtn = page.locator('[data-testid="schedule-proposal-approve-42"]');
    await expect(approveBtn).toBeVisible({ timeout: 5_000 });
    await approveBtn.click();

    // Toast: "承認しました"
    await expect(page.locator("text=承認しました")).toBeVisible({ timeout: 10_000 });

    // Proposal list should be gone (no more pending)
    await expect(proposalList).not.toBeVisible({ timeout: 5_000 });
  });
});
