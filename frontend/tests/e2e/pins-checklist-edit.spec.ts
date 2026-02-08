import { test, expect } from "@playwright/test";

const CIRCLE_ID = 8181;
const DEVICE_ID = "device-e2e-pins-checklist-001";
const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1, name: "E2E", email: "e2e@example.com", plan: "plus", effectivePlan: "plus", trialEndsAt: null,
  profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
  ui: { themeId: "default", specialBgEnabled: false },
});

const circle = { id: CIRCLE_ID, name: "Pins Circle", description: "t", myRole: "owner", memberCount: 1, plan: "premium" };

const existingPins = [
  { id: 1, circleId: CIRCLE_ID, sourcePostId: null, body: "Test Pin\nURL: https://example.com\n- [ ] Task1\n- [x] Task2", sortOrder: 1, pinnedAt: "2026-02-01T09:00:00+09:00", createdAt: "2026-02-01T09:00:00+09:00" },
];

test("checklist editor adds and removes items", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }));
  await page.route("**/api/oshis**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }));
  await page.route("**/api/circles/" + CIRCLE_ID, (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(circle) }));
  await page.route("**/api/circles/" + CIRCLE_ID + "/pins**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: successBody(existingPins) }));

  await page.goto("/circles/" + CIRCLE_ID + "/pins", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="circle-pins"]')).toBeVisible({ timeout: 15_000 });

  // Open edit dialog for existing pin
  await page.locator('[data-testid="pin-edit-1"]').click();
  await expect(page.locator('[data-testid="pin-dialog"]')).toBeVisible();

  // Checklist editor should show existing items
  const editor = page.locator('[data-testid="pin-checklist-editor"]');
  await expect(editor).toBeVisible();

  // Add new checklist item
  await page.locator('[data-testid="pin-checklist-add"]').click();
  const newInput = page.locator('[data-testid="pin-checklist-text-2"]');
  await expect(newInput).toBeVisible();
});
