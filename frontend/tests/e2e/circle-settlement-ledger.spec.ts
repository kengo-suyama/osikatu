import { test, expect } from "@playwright/test";

const CIRCLE_ID = 4242;
const DEVICE_ID = "device-e2e-settlement-ledger-001";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const errorBody = (code: string, message: string) =>
  JSON.stringify({ error: { code, message, details: {} } });

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

const baseCircle = (myRole: "owner" | "admin" | "member" = "member") => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Settlement Circle",
    description: null,
    oshiLabel: "テスト推し",
    oshiTag: "test",
    oshiTags: ["test"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 3,
    myRole,
    planRequired: "free",
    lastActivityAt: now,
    ui: {
      circleThemeId: null,
      specialBgEnabled: false,
      specialBgVariant: null,
    },
    createdAt: now,
    updatedAt: now,
  };
};

const setupMocks = async (page: Parameters<typeof test>[1]["page"]) => {
  await page.addInitScript(
    (deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
    },
    DEVICE_ID
  );

  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe()),
    })
  );

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle("member")),
    })
  );

  const expenses = {
    items: [
      {
        id: 9001,
        circleId: CIRCLE_ID,
        createdBy: 1,
        payerMemberId: 11,
        title: "遠征交通費",
        amountYen: 10000,
        splitType: "equal",
        occurredOn: "2026-02-08",
        note: null,
        status: "active",
        voidedAt: null,
        voidedByMemberId: null,
        replacedByExpenseId: null,
        replacesExpenseId: null,
        shares: [
          { memberId: 11, memberSnapshotName: "Aoi", shareYen: 4000 },
          { memberId: 22, memberSnapshotName: "Miki", shareYen: 3000 },
          { memberId: 33, memberSnapshotName: "Ren", shareYen: 3000 },
        ],
        createdAt: "2026-02-08T00:00:00.000Z",
      },
    ],
    nextCursor: null,
  };

  const balances = {
    items: [
      { memberId: 11, displayName: "Aoi", paidYen: 10000, owedYen: 4000, netYen: 6000 },
      { memberId: 22, displayName: "Miki", paidYen: 0, owedYen: 3000, netYen: -3000 },
      { memberId: 33, displayName: "Ren", paidYen: 0, owedYen: 3000, netYen: -3000 },
    ],
    totals: { totalExpensesYen: 10000, expenseCount: 1 },
  };

  const suggestions = {
    items: [
      { fromMemberId: 22, toMemberId: 11, amountYen: 3000 },
      { fromMemberId: 33, toMemberId: 11, amountYen: 3000 },
    ],
    generatedAt: "2026-02-08T00:00:00.000Z",
  };

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses(\\?.*)?$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody(expenses),
      })
  );

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody(balances),
      })
  );

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody(suggestions),
      })
  );
};

test.describe("circle settlement ledger (read-only)", () => {
  test("plus member can see expenses, balances, and suggestions", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="settlement-page"]')).toBeVisible({
      timeout: 30_000,
    });

    await expect(page.locator('[data-testid="settlement-expenses"]')).toBeVisible();
    await expect(page.locator('[data-testid="settlement-balances"]')).toBeVisible();
    await expect(page.locator('[data-testid="settlement-suggestions"]')).toBeVisible();

    await expect(page.locator('[data-testid="settlement-expense-9001"]')).toContainText(
      "遠征交通費"
    );
    await expect(page.locator('[data-testid="settlement-balance-11"]')).toContainText("Aoi");
    await expect(page.locator('[data-testid="settlement-suggestion-0"]')).toContainText("Miki");
  });

  test("free circle (or no plus) shows forbidden", async ({ page }) => {
    await page.addInitScript(
      (deviceId: string) => {
        localStorage.setItem("osikatu:device:id", deviceId);
        localStorage.setItem("osikatu:data-source", "api");
      },
      DEVICE_ID
    );

    await page.route("**/api/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ ...baseMe(), plan: "free", effectivePlan: "free" }),
      })
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody(baseCircle("member")),
      })
    );

    // Simulate the backend PlanGate 403.
    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses(\\?.*)?$`),
      (route) =>
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: errorBody("PLAN_REQUIRED", "Plus plan required for settlement expenses."),
        })
    );
    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`),
      (route) =>
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: errorBody("PLAN_REQUIRED", "Plus plan required for settlement expenses."),
        })
    );
    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`),
      (route) =>
        route.fulfill({
          status: 403,
          contentType: "application/json",
          body: errorBody("PLAN_REQUIRED", "Plus plan required for settlement expenses."),
        })
    );

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="settlement-forbidden"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.locator('[data-testid="settlement-expenses"]')).toHaveCount(0);
  });
});
