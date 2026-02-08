import { test, expect } from "@playwright/test";

const CIRCLE_ID = 9090;
const DEVICE_ID = "device-e2e-proposal-status-001";

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

const baseCircle = () => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Circle",
    description: null,
    oshiLabel: "推し",
    oshiTag: "oshi",
    oshiTags: ["oshi"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 3,
    myRole: "member",
    planRequired: "free",
    lastActivityAt: null,
    ui: { circleThemeId: null, specialBgEnabled: false, specialBgVariant: null },
    createdAt: now,
    updatedAt: now,
  };
};

test.describe("proposal mine status/reason", () => {
  test("rejected proposal shows reason", async ({ page }) => {
    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, DEVICE_ID);

    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }),
    );

    await page.route("**/api/oshis**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle()) }),
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/calendar(\\?.*)?$`), (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) }),
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals/mine(\\?.*)?$`), (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({
          items: [
            {
              id: 77,
              circleId: CIRCLE_ID,
              createdByMemberId: 1,
              title: "却下された提案",
              startAt: "2026-02-08T10:00:00+09:00",
              endAt: "2026-02-08T12:00:00+09:00",
              isAllDay: false,
              note: null,
              location: null,
              status: "rejected",
              reviewedByMemberId: 2,
              reviewedAt: "2026-02-08T11:00:00+09:00",
              reviewComment: "都合が合いません",
              approvedScheduleId: null,
              createdAt: "2026-02-08T09:00:00+09:00",
            },
          ],
        }),
      }),
    );

    // member gets 403 for listProposals; ignore in UI.
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals(\\?.*)?$`), (route) =>
      route.fulfill({ status: 403, contentType: "application/json", body: successBody({}) }),
    );

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    const mine = page.locator('[data-testid="schedule-proposal-mine"]');
    await expect(mine).toBeVisible({ timeout: 30_000 });

    const item = mine.locator('[data-testid^="schedule-proposal-item-"]').first();
    await expect(item.locator('[data-testid="proposal-status"]')).toContainText("却下");
    await expect(item.locator('[data-testid="proposal-rejected-reason"]')).toContainText("都合が合いません");
  });
});

