import { test, expect } from "@playwright/test";

const CIRCLE_ID = 6060;
const DEVICE_ID = "device-e2e-settlement-vr-001";

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
    name: "E2E VoidReplace Circle",
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
    ui: { circleThemeId: null, specialBgEnabled: false, specialBgVariant: null },
    createdAt: now,
    updatedAt: now,
  };
};

const baseMembers = [
  { id: 11, userId: 1001, nickname: "Aoi", avatarUrl: null, initial: "A", role: "owner" },
  { id: 22, userId: 1002, nickname: "Miki", avatarUrl: null, initial: "M", role: "admin" },
  { id: 33, userId: 1003, nickname: "Ren", avatarUrl: null, initial: "R", role: "member" },
];

const emptyBalances = { items: [], totals: { totalExpensesYen: 0, expenseCount: 0 } };
const emptySuggestions = { items: [], generatedAt: new Date().toISOString() };

const oldExpense = {
  id: 9001,
  circleId: CIRCLE_ID,
  createdBy: 11,
  payerMemberId: 11,
  title: "旧立替",
  amountYen: 6000,
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
  ],
  createdAt: new Date().toISOString(),
};

const newExpense = {
  id: 9002,
  circleId: CIRCLE_ID,
  createdBy: 11,
  payerMemberId: 11,
  title: "旧立替",
  amountYen: 9000,
  splitType: "equal",
  occurredOn: "2026-02-08",
  note: null,
  status: "active",
  voidedAt: null,
  voidedByMemberId: null,
  replacedByExpenseId: null,
  replacesExpenseId: 9001,
  shares: [
    { memberId: 11, memberSnapshotName: "Aoi", shareYen: 4500 },
    { memberId: 22, memberSnapshotName: "Miki", shareYen: 4500 },
  ],
  createdAt: new Date().toISOString(),
};

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

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [], members: baseMembers }),
      })
  );
  // Prevent oshi fallback data
  await page.route("**/api/oshis**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
  );
};

test.describe("settlement void+replace", () => {
  test("void and replace shows new expense in list", async ({ page }) => {
    await setupBase(page);

    let replaced = false;

    // Intercept void endpoint
    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses/9001/void$`),
      (route) => {
        replaced = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({
            voided: { ...oldExpense, status: "void", voidedAt: new Date().toISOString(), replacedByExpenseId: 9002 },
            replacement: newExpense,
          }),
        });
      }
    );

    // Expenses endpoint: returns old before replace, new after
    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses(\\?.*)?$`),
      (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const items = replaced ? [newExpense] : [oldExpense];
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody({ items, nextCursor: null }),
        });
      }
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`),
      (route) => route.fulfill({ status: 200, contentType: "application/json", body: successBody(emptyBalances) })
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`),
      (route) => route.fulfill({ status: 200, contentType: "application/json", body: successBody(emptySuggestions) })
    );

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="settlement-page"]')).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('[data-testid="settlement-expenses-loaded"]')).toBeVisible({ timeout: 10_000 });

    // Old expense should be visible
    await expect(page.locator('[data-testid="settlement-expense-9001"]')).toContainText("旧立替", { timeout: 10_000 });

    // Click void+replace open button
    const openBtn = page.locator('[data-testid="settlement-expense-void-replace-open"]');
    await expect(openBtn).toBeVisible();
    await openBtn.click();

    // Dialog should appear
    const dialog = page.locator('[data-testid="settlement-void-replace-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Change amount to 9000
    const totalInput = page.locator('[data-testid="settlement-void-replace-total"]');
    await totalInput.clear();
    await totalInput.fill("9000");

    // Submit
    await page.locator('[data-testid="settlement-void-replace-submit"]').click();

    // Dialog closes
    await expect(dialog).toBeHidden({ timeout: 10_000 });

    // New expense should appear after refresh
    await expect(page.locator('[data-testid="settlement-expenses-loaded"]')).toHaveAttribute(
      "data-count", "1", { timeout: 10_000 }
    );
    await expect(page.locator('[data-testid="settlement-expense-9002"]')).toBeVisible({ timeout: 10_000 });

    // Old expense should be gone (voided = removed from active list)
    await expect(page.locator('[data-testid="settlement-expense-9001"]')).toHaveCount(0);

    expect(replaced).toBe(true);
  });
});
