import { test, expect } from "@playwright/test";

const CIRCLE_ID = 5050;
const DEVICE_ID = "device-e2e-settlement-write-001";

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

const baseCircle = () => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Settlement Write Circle",
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
    myRole: "owner",
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

const baseMembers = [
  { id: 11, userId: 1001, nickname: "Aoi", avatarUrl: null, initial: "A", role: "owner" },
  { id: 22, userId: 1002, nickname: "Miki", avatarUrl: null, initial: "M", role: "admin" },
  { id: 33, userId: 1003, nickname: "Ren", avatarUrl: null, initial: "R", role: "member" },
];

const emptyExpenses = { items: [], nextCursor: null };
const emptyBalances = { items: [], totals: { totalExpensesYen: 0, expenseCount: 0 } };
const emptySuggestions = { items: [], generatedAt: new Date().toISOString() };

const setupBase = async (page: Parameters<typeof test>[1]["page"]) => {
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
      body: successBody(baseCircle()),
    })
  );

  // Old settlement list endpoint (provides members)
  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [], members: baseMembers }),
      })
  );
};

test.describe("settlement expense write UI", () => {
  test("create equal-split expense appears in list", async ({ page }) => {
    await setupBase(page);

    let expensesList: unknown[] = [];
    let createCallCount = 0;

    // Mock expense endpoints (dynamic: returns current expensesList)
    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses$`),
      async (route) => {
        const method = route.request().method();
        if (method === "GET") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: successBody({ items: expensesList, nextCursor: null }),
          });
        }
        if (method === "POST") {
          createCallCount++;
          const newExpense = {
            id: 7001,
            circleId: CIRCLE_ID,
            createdBy: 11,
            payerMemberId: 11,
            title: "テスト立替",
            amountYen: 9000,
            splitType: "equal",
            occurredOn: "2026-02-08",
            note: null,
            status: "active",
            voidedAt: null,
            voidedByMemberId: null,
            replacedByExpenseId: null,
            replacesExpenseId: null,
            shares: [
              { memberId: 11, memberSnapshotName: "Aoi", shareYen: 3000 },
              { memberId: 22, memberSnapshotName: "Miki", shareYen: 3000 },
              { memberId: 33, memberSnapshotName: "Ren", shareYen: 3000 },
            ],
            createdAt: new Date().toISOString(),
          };
          expensesList = [newExpense];
          return route.fulfill({
            status: 201,
            contentType: "application/json",
            body: successBody({ expense: newExpense }),
          });
        }
        return route.continue();
      }
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(emptyBalances),
        })
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(emptySuggestions),
        })
    );

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator('[data-testid="settlement-page"]')).toBeVisible({
      timeout: 30_000,
    });

    // Click open create button
    const openBtn = page.locator('[data-testid="settlement-create-open"]');
    await expect(openBtn).toBeVisible({ timeout: 10_000 });
    await openBtn.click();

    // Dialog should appear
    const dialog = page.locator('[data-testid="settlement-create-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Verify equal method is default selected
    await expect(
      page.locator('[data-testid="settlement-create-method-equal"]')
    ).toBeVisible();

    // Fill form
    await dialog.locator('input[placeholder="例: 遠征交通費"]').fill("テスト立替");
    await page.locator('[data-testid="settlement-create-total"]').fill("9000");

    // Submit
    await page.locator('[data-testid="settlement-create-submit"]').click();

    // Wait for dialog to close
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // Expense should appear in list after refresh
    await expect(
      page.locator('[data-testid="settlement-expense-7001"]')
    ).toContainText("テスト立替", { timeout: 10_000 });

    expect(createCallCount).toBe(1);
  });

  test("void expense removes it from list", async ({ page }) => {
    await setupBase(page);

    const expense = {
      id: 8001,
      circleId: CIRCLE_ID,
      createdBy: 11,
      payerMemberId: 11,
      title: "取消対象",
      amountYen: 5000,
      splitType: "equal",
      occurredOn: "2026-02-08",
      note: null,
      status: "active",
      voidedAt: null,
      voidedByMemberId: null,
      replacedByExpenseId: null,
      replacesExpenseId: null,
      shares: [
        { memberId: 11, memberSnapshotName: "Aoi", shareYen: 2500 },
        { memberId: 22, memberSnapshotName: "Miki", shareYen: 2500 },
      ],
      createdAt: new Date().toISOString(),
    };

    let isVoided = false;

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses/8001/void$`),
      (route) => {
        isVoided = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({
            voided: { ...expense, status: "void", voidedAt: new Date().toISOString() },
          }),
        });
      }
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses(\\?.*)?$`),
      (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const items = isVoided ? [] : [expense];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items, nextCursor: null }),
        });
      }
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(emptyBalances),
        })
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(emptySuggestions),
        })
    );

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator('[data-testid="settlement-page"]')).toBeVisible({
      timeout: 30_000,
    });

    // The expense should be visible initially
    await expect(
      page.locator('[data-testid="settlement-expense-8001"]')
    ).toContainText("取消対象", { timeout: 10_000 });

    // Click void button
    const voidBtn = page.locator('[data-testid="settlement-expense-void"]');
    await expect(voidBtn).toBeVisible();
    await voidBtn.click();

    // After void + refresh, the expense should disappear
    await expect(
      page.locator('[data-testid="settlement-expense-8001"]')
    ).toHaveCount(0, { timeout: 10_000 });

    expect(isVoided).toBe(true);
  });
});
