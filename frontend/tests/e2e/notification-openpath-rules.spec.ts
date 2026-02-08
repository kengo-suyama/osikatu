import { test, expect } from "@playwright/test";

const CIRCLE_ID = 4242;

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
    oshiLabel: "推し",
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

const setupBase = async (page: Parameters<typeof test>[1]["page"]) => {
  await page.addInitScript(() => {
    localStorage.setItem("osikatu:device:id", "device-e2e-openpath-001");
    localStorage.setItem("osikatu:data-source", "api");
  });

  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe("plus")),
    }),
  );

  // Keep header/nav background fetches stable.
  await page.route("**/api/circles", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    }),
  );
  await page.route("**/api/oshis", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    }),
  );

  // Calendar destination mocks (avoid noisy errors after navigation).
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle("owner")),
    }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/calendar(\\?.*)?$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [] }),
    }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals/mine(\\?.*)?$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [] }),
    }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/schedule-proposals(\\?.*)?$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [] }),
    }),
  );
};

const makeNotification = (openPath: string) => ({
  id: "nt_2001",
  type: "proposal.approved",
  title: "E2E Circle — 予定提案が承認されました",
  body: "「テスト提案」が承認されました。",
  linkUrl: null,
  notifyAt: null,
  readAt: null,
  createdAt: new Date().toISOString(),
  sourceType: "scheduleProposal",
  sourceId: 42,
  sourceMeta: { circleId: CIRCLE_ID },
  openPath,
});

test.describe("notification openPath rules (UI)", () => {
  test("member uses tab=mine", async ({ page }) => {
    await setupBase(page);

    await page.route("**/api/me/notifications**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({
          items: [makeNotification(`/circles/${CIRCLE_ID}/calendar?tab=mine`)],
          nextCursor: null,
        }),
      }),
    );

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible({ timeout: 30_000 });
    await item.click();

    await page.waitForURL(new RegExp(`/circles/${CIRCLE_ID}/calendar\\?tab=mine`), {
      timeout: 10_000,
    });
  });

  test("manager uses tab=proposals", async ({ page }) => {
    await setupBase(page);

    await page.route("**/api/me/notifications**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({
          items: [makeNotification(`/circles/${CIRCLE_ID}/calendar?tab=proposals`)],
          nextCursor: null,
        }),
      }),
    );

    await page.goto("/notifications", { waitUntil: "domcontentloaded" });

    const item = page.locator('[data-testid="notification-item"]').first();
    await expect(item).toBeVisible({ timeout: 30_000 });
    await item.click();

    await page.waitForURL(new RegExp(`/circles/${CIRCLE_ID}/calendar\\?tab=proposals`), {
      timeout: 10_000,
    });
  });
});

