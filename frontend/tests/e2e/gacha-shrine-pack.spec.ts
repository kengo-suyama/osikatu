import { test, expect } from "@playwright/test";

import { safeClick, waitForPageReady } from "./helpers/actions";

const DEVICE_ID = "device-e2e-gacha-shrine-pack-001";

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

test("gacha shrine pack v1 modal phases render", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe()),
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
  await page.route("**/api/me/notifications**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [], nextCursor: null }),
    })
  );

  await page.goto("/gacha", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "gacha-page");
  await page.waitForFunction(
    () => Boolean(document.querySelector('[data-testid="gacha-hydrated"]')),
    undefined,
    { timeout: 30_000 }
  );

  await safeClick(page.locator('[data-testid="gacha-open-seal"]'));
  await expect(page.locator('[data-testid="gacha-seal-modal"]')).toBeVisible();

  await safeClick(page.locator('[data-testid="gacha-phase-charge"]'));
  await expect(page.locator('[data-testid="gacha-seal-charge"]')).toBeVisible();

  await safeClick(page.locator('[data-testid="gacha-phase-crack"]'));
  await expect(page.locator('[data-testid="gacha-seal-crack"]')).toBeVisible();

  await safeClick(page.locator('[data-testid="gacha-phase-burst"]'));
  await expect(page.locator('[data-testid="gacha-seal-burst"]')).toBeVisible();
  await expect(page.locator('[data-testid="gacha-shide"]')).toBeVisible();
});
