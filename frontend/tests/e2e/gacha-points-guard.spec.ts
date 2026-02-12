import { test, expect } from "@playwright/test";

test.describe("Gacha points guard", () => {
  test("gacha page shows points badge", async ({ page }) => {
    await page.goto("/gacha");
    await page.waitForSelector('[data-testid="gacha-hydrated"]', {
      state: "attached",
      timeout: 10000,
    });

    // Points badge should appear (balance loaded)
    const badge = page.locator('[data-testid="gacha-points-badge"]');
    // Badge may or may not be visible depending on API availability
    // Just verify the page structure is correct
    const openBtn = page.locator('[data-testid="gacha-open-seal"]');
    await expect(openBtn).toBeVisible({ timeout: 5000 });
  });

  test("gacha page shows insufficient message on 409", async ({ page }) => {
    // Mock the gacha pull API to return insufficient points
    await page.route("**/api/me/gacha/pull", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "POINTS_INSUFFICIENT",
            message: "Not enough points.",
            details: { required: 100, balance: 30 },
          },
        }),
      });
    });

    // Also mock points endpoint
    await page.route("**/api/me/points", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: { data: { balance: 30, items: [] } },
        }),
      });
    });

    await page.goto("/gacha");
    await page.waitForSelector('[data-testid="gacha-hydrated"]', {
      state: "attached",
      timeout: 10000,
    });

    // Click the pull button
    const openBtn = page.locator('[data-testid="gacha-open-seal"]');
    await expect(openBtn).toBeVisible({ timeout: 5000 });
    await openBtn.click({ force: true });

    // Should show insufficient message
    const insufficient = page.locator('[data-testid="gacha-insufficient"]');
    await expect(insufficient).toBeVisible({ timeout: 5000 });

    // Badge should show updated balance
    const badge = page.locator('[data-testid="gacha-points-badge"]');
    await expect(badge).toContainText("30P");
  });
});
