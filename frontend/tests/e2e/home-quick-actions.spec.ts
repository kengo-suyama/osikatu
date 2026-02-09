import { test, expect } from "@playwright/test";

test.describe("Home quick actions", () => {
  test("quick action links navigate to correct pages", async ({ page }) => {
    await page.goto("/home");

    const actions = page.locator('[data-testid="home-quick-actions"]');
    await actions.waitFor({ state: "visible", timeout: 5000 });

    // Verify all 4 quick actions exist
    await expect(page.locator('[data-testid="qa-log"]')).toBeVisible();
    await expect(page.locator('[data-testid="qa-money"]')).toBeVisible();
    await expect(page.locator('[data-testid="qa-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="qa-album"]')).toBeVisible();

    // Test log navigation
    await page.locator('[data-testid="qa-log"]').click();
    await expect(page).toHaveURL(/\/log/);

    await page.goto("/home");

    // Test money navigation
    await page.locator('[data-testid="qa-money"]').click();
    await expect(page).toHaveURL(/\/money/);

    await page.goto("/home");

    // Test schedule navigation
    await page.locator('[data-testid="qa-schedule"]').click();
    await expect(page).toHaveURL(/\/schedule/);

    await page.goto("/home");

    // Test album navigation
    await page.locator('[data-testid="qa-album"]').click();
    await expect(page).toHaveURL(/\/album/);
  });
});
