import { test, expect } from "@playwright/test";

const DEVICE_ID = "device-e2e-billing-gates-001";
const CIRCLE_ID = 555;

const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });
const errorBody = (code: string, message: string, details?: unknown) =>
  JSON.stringify({ error: { code, message, ...(details ? { details } : {}) } });

const baseMe = (plan: "free" | "plus") => ({
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
  ui: { themeId: "default", specialBgEnabled: false },
});

const baseCircle = (myRole: "owner" | "admin" | "member") => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Circle",
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
    ui: { circleThemeId: null, specialBgEnabled: false, specialBgVariant: null },
    createdAt: now,
    updatedAt: now,
  };
};

test.describe("Billing gates (mocked)", () => {
  test("free owner sees settlement paywall on 402 PLAN_REQUIRED", async ({ page }) => {
    await page.addInitScript((d: string) => {
      localStorage.setItem("osikatu:device:id", d);
      localStorage.setItem("osikatu:data-source", "api");
    }, DEVICE_ID);

    await page.route("**/api/me", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("free")) })
    );
    await page.route("**/api/oshis**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle("owner")) })
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements(\\?.*)?$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [], members: [] }) })
    );

    const planRequired = {
      status: 402,
      contentType: "application/json",
      body: errorBody("PLAN_REQUIRED", "Plus plan required for settlement expenses.", {
        requiredPlan: "plus",
      }),
    };
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses(\\?.*)?$`), (r) =>
      r.fulfill(planRequired)
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`), (r) =>
      r.fulfill(planRequired)
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`), (r) =>
      r.fulfill(planRequired)
    );

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="settlement-forbidden"]')).toBeVisible({ timeout: 30_000 });
  });

  test("plus owner can open settlement create dialog", async ({ page }) => {
    await page.addInitScript((d: string) => {
      localStorage.setItem("osikatu:device:id", d);
      localStorage.setItem("osikatu:data-source", "api");
    }, DEVICE_ID);

    await page.route("**/api/me", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("plus")) })
    );
    await page.route("**/api/oshis**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle("owner")) })
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements(\\?.*)?$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [], members: [] }) })
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements/expenses(\\?.*)?$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [] }) })
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements/balances$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [], totals: { totalExpensesYen: 0, expenseCount: 0 } }) })
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/settlements/suggestions$`), (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [], generatedAt: new Date().toISOString() }) })
    );

    await page.goto(`/circles/${CIRCLE_ID}/settlements`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="settlement-expenses"]')).toBeVisible({ timeout: 30_000 });
    await page.locator('[data-testid="settlement-create-open"]').click();
    await expect(page.locator('[data-testid="settlement-create-expense-dialog"]')).toBeVisible({ timeout: 10_000 });
  });

  test("pricing upgrade redirects to mocked checkout URL", async ({ page }) => {
    await page.addInitScript((d: string) => {
      localStorage.setItem("osikatu:device:id", d);
      localStorage.setItem("osikatu:data-source", "api");
    }, DEVICE_ID);

    await page.route("**/api/me", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("free")) })
    );
    await page.route("**/api/oshis**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );
    await page.route("**/api/billing/checkout", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody({ url: "/mock-checkout" }) })
    );

    await page.goto("/pricing", { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="pricing-upgrade"]').click();
    await page.waitForURL("**/mock-checkout", { timeout: 15_000 });
  });
});

