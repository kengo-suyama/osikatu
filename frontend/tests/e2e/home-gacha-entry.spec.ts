import { test, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers/actions";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

test("home gacha button navigates to /gacha", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("osikatu:device:id", "device-e2e-gacha-001");
    localStorage.setItem("osikatu:data-source", "api");
  });

  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        id: 1, userId: 1, deviceId: "device-e2e-gacha-001",
        role: "user", name: "E2E", email: "e2e@example.com",
        plan: "free", planStatus: "active", effectivePlan: "free",
        trialEndsAt: null,
        profile: { displayName: null, avatarUrl: null, bio: null, prefectureCode: null, onboardingCompleted: true },
        ui: { themeId: "light", specialBgEnabled: false },
      }),
    })
  );

  await page.route("**/api/oshis**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([{
        id: 1, name: "Test Oshi", category: "idol", isPrimary: true,
        nickname: null, birthday: null, heightCm: null, weightKg: null,
        bloodType: null, accentColor: null, origin: null, role: null,
        charmPoint: null, quote: null, hobbies: [], likes: [], dislikes: [],
        skills: [], favoriteFoods: [], weakPoints: [], supplyTags: [],
        anniversaries: [], links: [], customFields: [], memo: null,
        imageUrl: null, imageFrameId: "none", updatedAt: null,
      }]),
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
          pattern.includes("notifications") ? { items: [], nextCursor: null }
          : pattern.includes("fortune") ? { date: "2026-02-09", luckScore: 50, luckyColor: "blue", luckyItem: "pen", message: "E2E", goodAction: "share", badAction: "skip", updatedAt: null }
          : pattern.includes("oshi-actions") ? { dateKey: "2026-02-09", actionText: "E2E", completed: false, completedAt: null, currentTitleId: null, actionTotal: 0, streak: 0 }
          : pattern.includes("logs") ? { items: [], nextCursor: null }
          : pattern.includes("schedules") ? { items: [] }
          : pattern.includes("expenses") ? { month: "2026-02", period: { start: "2026-02-01", end: "2026-02-28" }, totalAmount: 0, byOshi: [] }
          : pattern.includes("budget") ? { yearMonth: "2026-02", budget: 0, spent: 0, updatedAt: null }
          : pattern.includes("media") ? { item: null }
          : pattern.includes("events") ? { ok: true }
          : []
        ),
      })
    );
  }

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "home-page");

  const gachaBtn = page.locator('[data-testid="home-gacha-cta"]');
  await expect(gachaBtn).toBeVisible();
  await gachaBtn.click();

  await page.waitForURL(/\/gacha/, { timeout: 10_000 });
});
