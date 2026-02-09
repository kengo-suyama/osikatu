import { test, expect } from "@playwright/test";

test.describe("Title badge rarity + stars", () => {
  test("titles page shows badge with rarity and stars", async ({ page }) => {
    // Seed title history in localStorage (non-API mode)
    await page.addInitScript(() => {
      const history = [
        { dateKey: "2026-01-01", titleText: "推し活マスター", rarity: "rare", tags: ["推し活"] },
        { dateKey: "2026-01-02", titleText: "伝説の推し", rarity: "legendary", tags: ["伝説"] },
      ];
      const stats = {
        uniqueTitlesCount: 2,
        bestRarityEver: "legendary",
        totalEarnedCount: 2,
        seenTitleTexts: ["推し活マスター", "伝説の推し"],
        lastEarnedDate: "2026-01-02",
      };
      localStorage.setItem("osikatu:title:history", JSON.stringify(history));
      localStorage.setItem("osikatu:title:stats", JSON.stringify(stats));
    });

    await page.goto("/titles");
    await page.waitForLoadState("networkidle");

    // Page visible
    const titlesPage = page.locator('[data-testid="titles-page"]');
    await expect(titlesPage).toBeVisible({ timeout: 10000 });

    // At least one title badge should be rendered
    const badges = page.locator('[data-testid="title-badge"]');
    await expect(badges.first()).toBeVisible({ timeout: 5000 });

    // Verify rarity sub-badge
    const rarityBadge = page.locator('[data-testid="title-badge-rarity"]').first();
    await expect(rarityBadge).toBeVisible();

    // Verify stars exist on the legendary badge
    const stars = page.locator('[data-testid="title-badge-stars"]').first();
    await expect(stars).toBeVisible();
    // Stars should contain star characters
    await expect(stars).toContainText("★");
  });

  test("rarity color classes differ between R and SSR", async ({ page }) => {
    await page.addInitScript(() => {
      const history = [
        { dateKey: "2026-01-01", titleText: "レアな称号", rarity: "rare", tags: [] },
        { dateKey: "2026-01-02", titleText: "SSRな称号", rarity: "legendary", tags: [] },
      ];
      localStorage.setItem("osikatu:title:history", JSON.stringify(history));
      localStorage.setItem(
        "osikatu:title:stats",
        JSON.stringify({
          uniqueTitlesCount: 2,
          bestRarityEver: "legendary",
          totalEarnedCount: 2,
          seenTitleTexts: ["レアな称号", "SSRな称号"],
          lastEarnedDate: "2026-01-02",
        })
      );
    });

    await page.goto("/titles");
    await page.waitForLoadState("networkidle");

    const badges = page.locator('[data-testid="title-badge"]');
    await expect(badges).toHaveCount(2, { timeout: 5000 });

    // Different rarity badges should have different class names
    const first = badges.nth(0);
    const second = badges.nth(1);
    const firstClass = await first.getAttribute("class");
    const secondClass = await second.getAttribute("class");
    expect(firstClass).not.toBe(secondClass);
  });
});
