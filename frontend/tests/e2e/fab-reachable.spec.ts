import { test, expect } from "@playwright/test";

test.describe("FAB reachable on small viewport", () => {
  test.use({ viewport: { width: 320, height: 480 } });

  test("FAB is visible and clickable on small mobile viewport", async ({ page }) => {
    await page.goto("/home");

    const fab = page.locator('[data-testid="fab-oshi-profile"]');
    await fab.waitFor({ state: "visible", timeout: 5000 });

    // Verify FAB is within viewport bounds
    const box = await fab.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // FAB should not extend below the viewport (accounting for BottomNav ~64px)
      expect(box.y + box.height).toBeLessThan(480 - 50);
      // FAB should be within horizontal bounds
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(320);
    }

    // Verify it's actually clickable (force:true for framer-motion animation)
    await fab.click({ force: true });

    // Sheet should open
    const sheet = page.locator("text=推しプロフィール");
    await expect(sheet).toBeVisible({ timeout: 3000 });
  });
});
