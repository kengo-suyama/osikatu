import { test, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers/actions";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

test.describe("gacha personal cinematic", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-gacha-cin-001");
      localStorage.setItem("osikatu:data-source", "api");
    });

    await page.route("**/api/me", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({
          id: 1,
          userId: 1,
          deviceId: "device-e2e-gacha-cin-001",
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
          ui: { themeId: "light", specialBgEnabled: false },
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
            category: "idol",
            isPrimary: true,
            nickname: null,
            birthday: null,
            heightCm: null,
            weightKg: null,
            bloodType: null,
            accentColor: null,
            origin: null,
            role: null,
            charmPoint: null,
            quote: null,
            hobbies: [],
            likes: [],
            dislikes: [],
            skills: [],
            favoriteFoods: [],
            weakPoints: [],
            supplyTags: [],
            anniversaries: [],
            links: [],
            customFields: [],
            memo: null,
            imageUrl: null,
            imageFrameId: "none",
            updatedAt: null,
          },
        ]),
      })
    );

    for (const pattern of [
      "**/api/circles**",
      "**/api/me/notifications**",
      "**/api/me/fortune**",
      "**/api/me/oshi-actions/today",
      "**/api/me/logs**",
      "**/api/me/schedules**",
      "**/api/me/expenses-summary**",
      "**/api/me/budget",
      "**/api/events",
      "**/api/me/media/home**",
    ]) {
      await page.route(pattern, (r) =>
        r.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(
            pattern.includes("notifications")
              ? { items: [], nextCursor: null }
              : pattern.includes("fortune")
                ? {
                    date: "2026-02-09",
                    luckScore: 50,
                    luckyColor: "blue",
                    luckyItem: "pen",
                    message: "E2E",
                    goodAction: "share",
                    badAction: "skip",
                    updatedAt: null,
                  }
                : pattern.includes("oshi-actions")
                  ? {
                      dateKey: "2026-02-09",
                      actionText: "E2E",
                      completed: false,
                      completedAt: null,
                      currentTitleId: null,
                      actionTotal: 0,
                      streak: 0,
                    }
                  : pattern.includes("logs")
                    ? { items: [], nextCursor: null }
                    : pattern.includes("schedules")
                      ? { items: [] }
                      : pattern.includes("expenses")
                        ? {
                            month: "2026-02",
                            period: {
                              start: "2026-02-01",
                              end: "2026-02-28",
                            },
                            totalAmount: 0,
                            byOshi: [],
                          }
                        : pattern.includes("budget")
                          ? {
                              yearMonth: "2026-02",
                              budget: 0,
                              spent: 0,
                              updatedAt: null,
                            }
                          : pattern.includes("media")
                            ? { item: null }
                            : pattern.includes("events")
                              ? { ok: true }
                              : []
          ),
        })
      );
    }
  });

  test("full cinematic flow: start → cinematic → result → close", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/gacha", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page, "gacha-page");

    // Wait for hydration
    await page.waitForSelector('[data-testid="gacha-hydrated"]', {
      state: "attached",
      timeout: 15_000,
    });

    // Click start button
    const startBtn = page.locator('[data-testid="gacha-start"]');
    await expect(startBtn).toBeVisible();
    await startBtn.click({ force: true });

    // Result card appears after cinematic auto-completes (~2.8s)
    const result = page.locator('[data-testid="gacha-result"]');
    await expect(result).toBeVisible({ timeout: 15_000 });

    // Result shows 景品GET
    await expect(page.locator("text=景品GET")).toBeVisible();

    // Result item is rendered
    const resultItem = page.locator('[data-testid="gacha-result-item"]');
    await expect(resultItem).toBeVisible();

    // Close button returns to start
    const closeBtn = page.locator('[data-testid="gacha-close"]');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click({ force: true });

    // Back to start state
    await expect(startBtn).toBeVisible({ timeout: 5_000 });
  });

  test("gacha-page testid is always present", async ({ page }) => {
    await page.goto("/gacha", { waitUntil: "domcontentloaded" });
    await waitForPageReady(page, "gacha-page");

    const gachaPage = page.locator('[data-testid="gacha-page"]');
    await expect(gachaPage).toBeVisible();
    await expect(gachaPage).toHaveCount(1);
  });
});
