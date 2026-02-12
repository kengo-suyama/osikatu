import { test, expect } from "@playwright/test";

test.describe("Share panel", () => {
  test("share panel visible on home with SNS buttons", async ({ page }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const panel = page.locator('[data-testid="share-panel"]');
    await expect(panel).toBeVisible({ timeout: 10000 });

    // All 5 platforms visible
    for (const id of ["x", "instagram", "tiktok", "youtube", "line"]) {
      await expect(
        page.locator(`[data-testid="share-btn-${id}"]`)
      ).toBeVisible();
    }
  });
});
