import { test, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers/actions";

test.describe("language selection page", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("osikatu:locale");
    });
  });

  test("select language and confirm saves locale", async ({ page }) => {
    await page.goto("/language", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page, "language-page");
    await page.waitForSelector('[data-testid="language-hydrated"]', {
      state: "attached",
      timeout: 15_000,
    });

    // Default shows Japanese title
    await expect(page.locator("text=言語を選択")).toBeVisible();

    // Select English
    const enOption = page.locator('[data-testid="language-option-en"]');
    await expect(enOption).toBeVisible();
    await enOption.click();

    // Title changes to English
    await expect(page.locator("text=Choose language")).toBeVisible();

    // Confirm
    const confirmBtn = page.locator('[data-testid="language-confirm"]');
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Navigates to /home
    await page.waitForURL(/\/home/, { timeout: 10_000 });

    // Locale is stored
    const locale = await page.evaluate(() =>
      localStorage.getItem("osikatu:locale")
    );
    expect(locale).toBe("en");
  });

  test("all 5 language options are visible", async ({ page }) => {
    await page.goto("/language", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page, "language-page");

    for (const id of ["ja", "en", "ko", "es", "zh-Hant"]) {
      const option = page.locator(`[data-testid="language-option-${id}"]`);
      await expect(option).toBeVisible();
    }
  });
});
