import { test, expect } from "@playwright/test";

test.describe("Schedule month view + search", () => {
  test("month grid is visible and can navigate months", async ({ page }) => {
    await page.goto("/schedule");
    await page.waitForLoadState("networkidle");
    const grid = page.locator('[data-testid="schedule-month-grid"]');
    await expect(grid).toBeVisible({ timeout: 10_000 });
    const label = page.locator('[data-testid="schedule-month-label"]');
    const initialText = await label.textContent();
    expect(initialText).toBeTruthy();
    await grid.locator("button", { hasText: "→" }).click();
    const newText = await label.textContent();
    expect(newText).not.toBe(initialText);
  });

  test("search input is visible", async ({ page }) => {
    await page.goto("/schedule");
    await page.waitForLoadState("networkidle");
    const search = page.locator('[data-testid="schedule-search"]');
    await expect(search).toBeVisible({ timeout: 10_000 });
  });
});
