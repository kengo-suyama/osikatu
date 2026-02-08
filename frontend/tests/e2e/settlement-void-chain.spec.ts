import { test, expect } from "@playwright/test";

const CIRCLE_ID = 8181;
const DEVICE_ID = "device-e2e-void-chain-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "plus", effectivePlan: "plus", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

const circle = { id: CIRCLE_ID, name: "Void Chain Circle", description: "t", myRole: "owner", memberCount: 2, plan: "premium" };

const expenses = [
  { id: 10, circleId: CIRCLE_ID, title: "Normal", amountYen: 1000, occurredOn: "2026-02-01", payerMemberId: 1, splitType: "equal", voidedAt: null, replacedByExpenseId: null, participants: [], createdAt: "2026-02-01T09:00:00+09:00" },
  { id: 11, circleId: CIRCLE_ID, title: "Voided", amountYen: 2000, occurredOn: "2026-02-02", payerMemberId: 1, splitType: "equal", voidedAt: "2026-02-03T10:00:00+09:00", replacedByExpenseId: null, participants: [], createdAt: "2026-02-02T09:00:00+09:00" },
  { id: 12, circleId: CIRCLE_ID, title: "Replaced", amountYen: 3000, occurredOn: "2026-02-03", payerMemberId: 1, splitType: "equal", voidedAt: "2026-02-04T10:00:00+09:00", replacedByExpenseId: 13, participants: [], createdAt: "2026-02-03T09:00:00+09:00" },
];

test("voided and replaced expenses show status badges", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/circles/" + CIRCLE_ID, (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(circle) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/members**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [{ id: 1, userId: 1, nickname: "Owner", initial: "O", role: "owner" }] }) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/settlements**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/settlement-expenses**", (r) => {
    return r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: expenses, balances: { items: [], totals: null }, suggestions: { items: [], generatedAt: null } }) });
  });

  await page.goto("/circles/" + CIRCLE_ID + "/settlements", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="settlement-expenses-loaded"]')).toBeVisible({ timeout: 15_000 });

  // Normal expense has no status badge
  const normal = page.locator('[data-testid="settlement-expense-10"]');
  await expect(normal).toBeVisible();
  await expect(normal.locator('[data-testid="settlement-expense-status"]')).toHaveCount(0);

  // Voided expense shows 取消済 badge
  const voided = page.locator('[data-testid="settlement-expense-11"]');
  await expect(voided).toBeVisible();
  await expect(voided.locator('[data-testid="settlement-expense-status"]')).toBeVisible();
  await expect(voided.locator('[data-testid="settlement-expense-status"]')).toHaveText("取消済");

  // Replaced expense shows both badges
  const replaced = page.locator('[data-testid="settlement-expense-12"]');
  await expect(replaced).toBeVisible();
  await expect(replaced.locator('[data-testid="settlement-expense-status"]')).toBeVisible();
  await expect(replaced.locator('[data-testid="settlement-expense-replaced"]')).toBeVisible();
});
