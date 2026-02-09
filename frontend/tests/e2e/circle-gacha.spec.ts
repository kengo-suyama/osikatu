import { test, expect } from "@playwright/test";

test.describe("Circle gacha", () => {
  const CIRCLE_ID = 1;

  test("start -> cinematic -> result with mocked API", async ({ page }) => {
    // Mock points endpoint
    await page.route(`**/api/circles/${CIRCLE_ID}/points`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: { data: { balance: 200 } },
        }),
      });
    });

    // Mock draw endpoint
    await page.route(
      `**/api/circles/${CIRCLE_ID}/gacha/draw`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: {
              data: {
                cost: 100,
                balance: 100,
                prize: {
                  itemType: "frame",
                  itemKey: "frame_pop_01",
                  rarity: "R",
                  isNew: true,
                },
              },
            },
          }),
        });
      }
    );

    await page.goto(`/circles/${CIRCLE_ID}/gacha`);
    await page.waitForLoadState("networkidle");

    // Points badge
    const points = page.locator('[data-testid="circle-gacha-points"]');
    await expect(points).toContainText("200 CP", { timeout: 5000 });

    // Click start
    const startBtn = page.locator('[data-testid="circle-gacha-start"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click({ force: true });

    // Cinematic phase
    const cinematic = page.locator('[data-testid="circle-gacha-cinematic"]');
    await expect(cinematic).toBeVisible({ timeout: 5000 });

    // Wait for result (cinematic auto-completes)
    const result = page.locator('[data-testid="circle-gacha-result"]');
    await expect(result).toBeVisible({ timeout: 15000 });

    // Result item
    const resultItem = page.locator('[data-testid="circle-gacha-result-item"]');
    await expect(resultItem).toContainText("frame_pop_01");
  });

  test("locale changes cinematic root class", async ({ page }) => {
    // Set locale to en
    await page.addInitScript(() => {
      localStorage.setItem("osikatu:locale", "en");
    });

    // Mock APIs
    await page.route(`**/api/circles/${CIRCLE_ID}/points`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: { data: { balance: 200 } },
        }),
      });
    });
    await page.route(
      `**/api/circles/${CIRCLE_ID}/gacha/draw`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: {
              data: {
                cost: 100,
                balance: 100,
                prize: {
                  itemType: "frame",
                  itemKey: "frame_pop_01",
                  rarity: "R",
                  isNew: true,
                },
              },
            },
          }),
        });
      }
    );

    await page.goto(`/circles/${CIRCLE_ID}/gacha`);
    await page.waitForLoadState("networkidle");

    const startBtn = page.locator('[data-testid="circle-gacha-start"]');
    await expect(startBtn).toBeVisible({ timeout: 5000 });
    await startBtn.click({ force: true });

    const cinematic = page.locator('[data-testid="circle-gacha-cinematic"]');
    await expect(cinematic).toBeVisible({ timeout: 5000 });

    // Should have en theme class
    await expect(cinematic).toHaveClass(/cinematic-arcane/, { timeout: 5000 });
  });
});
