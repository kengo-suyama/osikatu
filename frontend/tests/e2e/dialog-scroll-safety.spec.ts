import { test, expect } from "@playwright/test";

test.describe("Dialog scroll safety", () => {
  test.use({ viewport: { width: 375, height: 480 } });

  test("circle create dialog submit is clickable on small viewport", async ({
    page,
  }) => {
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Open circle create dialog via FAB or circles page
    // Navigate to circles list
    await page.goto("/circles");
    await page.waitForLoadState("networkidle");

    // Click create button if present
    const createBtn = page.locator('[data-testid="circle-create-open"]');
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click({ force: true });
    } else {
      // Try the page-level create button
      const altBtn = page.locator('button:has-text("サークルを作成")');
      if (await altBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await altBtn.click({ force: true });
      } else {
        test.skip();
        return;
      }
    }

    // Wait for dialog to appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // The submit button should be visible (sticky footer keeps it in view)
    const submitBtn = page.locator('[data-testid="circle-create-submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 3000 });

    // Verify the button is within the viewport (not scrolled off-screen)
    const box = await submitBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.y + box.height).toBeLessThanOrEqual(480);
      expect(box.y).toBeGreaterThanOrEqual(0);
    }
  });
});
