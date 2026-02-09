import { test, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers/actions";

const DEVICE_ID = "device-e2e-title-badge-001";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1,
  name: "E2E",
  email: "e2e@example.com",
  plan: "free",
  effectivePlan: "free",
  trialEndsAt: null,
  profile: {
    displayName: null,
    avatarUrl: null,
    bio: null,
    prefectureCode: null,
    onboardingCompleted: true,
  },
  ui: { themeId: "default", specialBgEnabled: false },
});

test("title badge renders rarity + stars", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) })
  );
  await page.route("**/api/oshis**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
  );
  await page.route("**/api/circles**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
  );
  await page.route("**/api/me/notifications**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody({ items: [], nextCursor: null }) })
  );
  await page.route("**/api/me/budget**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ budget: 0, spent: 0, yearMonth: "2026-02", updatedAt: null }),
    })
  );
  await page.route("**/api/me/titles", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        currentTitleId: "t0010",
        actionTotal: 10,
        streak: 2,
        awards: [
          { id: 1, titleId: "t0010", reason: "action", awardedAt: "2026-02-08T00:00:00Z" },
        ],
      }),
    })
  );

  await page.goto("/titles", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "titles-page");

  const badge = page.locator('[data-testid="title-badge"]').first();
  await expect(badge).toBeVisible();
  await expect(badge.locator('[data-testid="title-badge-rarity"]')).toHaveText(/N|R|SR|SSR|UR/);
  await expect(badge.locator('[data-testid="title-badge-stars"]')).toBeVisible();
});
