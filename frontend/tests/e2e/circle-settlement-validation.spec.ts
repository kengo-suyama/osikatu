import { test, expect } from "@playwright/test";

const CIRCLE_ID = 7070;
const DEVICE_ID = "device-e2e-settlement-val-001";

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
    name: "E2E Validation Circle",
    description: null,
    oshiLabel: "\u30C6\u30B9\u30C8\u63A8\u3057",
    oshiTag: "test",
    oshiTags: ["test"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 2,
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
];

const setupRoutes = async (page: Parameters<typeof test>[1]["page"]) => {
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

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle()) })
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

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses`),
    (route) => {
      if (route.request().method() !== "GET") return route.continue();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [], nextCursor: null }),
      });
    }
  );

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [], totals: { totalExpensesYen: 0, expenseCount: 0 } }),
      })
  );

  await page.route(
    new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`),
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [], generatedAt: new Date().toISOString() }),
      })
  );

  await page.route("**/api/oshis**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
  );
};

test.describe("settlement UI validation", () => {
  test("fixed split with mismatched sum disables submit and shows error", async ({ page }) => {
    await setupRoutes(page);

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="settlement-page"]')).toBeVisible({ timeout: 30_000 });

    // Open create dialog
    await page.locator('[data-testid="settlement-create-open"]').click();
    const dialog = page.locator('[data-testid="settlement-create-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Fill title
    await dialog.locator("input").first().fill("\u30C6\u30B9\u30C8\u7ACB\u66FF");

    // Fill amount 10000
    await page.locator('[data-testid="settlement-create-total"]').fill("10000");

    // Switch to fixed
    await page.locator('[data-testid="settlement-create-method-fixed"]').click();

    // Wait for share inputs to render
    await expect(dialog.locator('input[type="number"][inputmode="numeric"]').nth(1)).toBeVisible({ timeout: 3_000 });

    // Get all numeric inputs in dialog: [0]=total, [1..N]=shares
    const numInputs = dialog.locator('input[type="number"]');

    // Enter mismatched shares: 3000 + 5000 = 8000 != 10000
    await numInputs.nth(1).fill("3000");
    await numInputs.nth(2).fill("5000");

    // Error should be visible
    const errorEl = page.locator('[data-testid="settlement-create-error"]');
    await expect(errorEl).toBeVisible({ timeout: 5_000 });

    // Submit should be disabled
    const submit = page.locator('[data-testid="settlement-create-submit"]');
    await expect(submit).toBeDisabled();

    // Fix shares: 5000 + 5000 = 10000
    await numInputs.nth(1).fill("5000");

    // Error should disappear
    await expect(errorEl).toBeHidden({ timeout: 5_000 });

    // Submit should be enabled
    await expect(submit).toBeEnabled({ timeout: 5_000 });
  });
});
