import { test, expect } from "@playwright/test";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

test.describe("language selection page", () => {
  test("shows language options and saves selection", async ({ page }) => {
    await page.goto(`${BASE}/language`);

    const langPage = page.locator('[data-testid="language-page"]');
    await expect(langPage).toBeVisible({ timeout: 15_000 });

    // All 5 languages should be visible
    for (const id of ["ja", "en", "ko", "es", "zh-Hant"]) {
      await expect(page.locator(`[data-testid="language-option-${id}"]`)).toBeVisible();
    }

    // Select English
    await page.locator('[data-testid="language-option-en"]').click();

    // Confirm
    const confirmBtn = page.locator('[data-testid="language-confirm"]');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Should navigate away
    await page.waitForURL(/\/settings/, { timeout: 10_000 });

    // Verify locale stored
    const locale = await page.evaluate(() => localStorage.getItem("osikatu:locale"));
    expect(locale).toBe("en");
  });
});
