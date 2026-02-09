import { test, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers/actions";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const DEVICE_ID = "device-e2e-inventory-001";

test("inventory unlocks can be applied (theme) and reflects on home", async ({ page }) => {
  let appliedThemeId = "light";

  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        id: 1,
        userId: 1,
        deviceId: DEVICE_ID,
        role: "user",
        name: "E2E",
        email: "e2e@example.com",
        plan: "free",
        planStatus: "active",
        effectivePlan: "free",
        trialEndsAt: null,
        profile: {
          displayName: null,
          avatarUrl: null,
          bio: null,
          prefectureCode: null,
          onboardingCompleted: true,
        },
        ui: { themeId: appliedThemeId, specialBgEnabled: false },
      }),
    })
  );

  await page.route("**/api/oshis**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([
        {
          id: 1,
          name: "Test Oshi",
          imageUrl: null,
          category: "idol",
          isPrimary: true,
          imageFrameId: "none",
        },
      ]),
    })
  );

  await page.route("**/api/circles**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    })
  );

  await page.route("**/api/me/inventory", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        balance: 100,
        items: [
          {
            id: 1,
            itemType: "theme",
            itemKey: "midnight",
            rarity: "SR",
            source: "gacha",
            acquiredAt: new Date().toISOString(),
          },
        ],
      }),
    })
  );

  await page.route("**/api/me/inventory/apply", async (r) => {
    let body: { itemType?: string; itemKey?: string } | null = null;
    try {
      body = r.request().postDataJSON() as { itemType?: string; itemKey?: string };
    } catch {
      body = null;
    }
    if (body?.itemType === "theme" && body?.itemKey === "midnight") {
      appliedThemeId = "midnight";
      await r.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ applied: { themeId: "midnight" } }),
      });
      return;
    }
    await r.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "INVENTORY_NOT_OWNED", message: "Item not owned." },
      }),
    });
  });

  // Avoid unrelated background fetches causing flaky UI while using real API server in CI.
  await page.route("**/api/me/budget", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        yearMonth: "2026-02",
        budget: 0,
        spent: 0,
        updatedAt: null,
      }),
    })
  );
  await page.route("**/api/me/notifications**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [], nextCursor: null }),
    })
  );
  await page.route("**/api/me/fortune**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        date: "2026-02-09",
        luckScore: 50,
        luckyColor: "blue",
        luckyItem: "pen",
        message: "E2E",
        goodAction: "share",
        badAction: "skip",
        updatedAt: null,
      }),
    })
  );
  await page.route("**/api/me/oshi-actions/today", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        dateKey: "2026-02-09",
        actionText: "E2E",
        completed: false,
        completedAt: null,
        currentTitleId: null,
        actionTotal: 0,
        streak: 0,
      }),
    })
  );

  await page.route("**/api/me/ui-settings", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ themeId: "midnight", specialBgEnabled: false }),
    })
  );

  await page.goto("/settings", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "settings-page");
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="settings-hydrated"]')),
    undefined,
    { timeout: 30_000 }
  );

  const card = page.locator('[data-testid="inventory-card"]');
  await expect(card).toBeVisible();

  const midnightRow = card.locator('[data-testid="inventory-item"]', {
    hasText: "midnight",
  });
  await expect(midnightRow).toBeVisible();
  await midnightRow.locator('[data-testid="inventory-apply"]').click();

  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "midnight",
    undefined,
    { timeout: 10_000 }
  );

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-testid="home-page"]')).toBeVisible({
    timeout: 45_000,
  });

  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "midnight",
    undefined,
    { timeout: 10_000 }
  );
});
