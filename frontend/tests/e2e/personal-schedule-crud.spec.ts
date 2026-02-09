import { test, expect } from "@playwright/test";

import { openDialogByTestId, safeClick, waitForPageReady } from "./helpers/actions";

const DEVICE_ID = "device-e2e-personal-schedule-001";
const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

test("personal schedule: create then delete (mocked)", async ({ page }) => {
  await page.addInitScript((d: string) => {
    localStorage.setItem("osikatu:device:id", d);
    localStorage.setItem("osikatu:data-source", "api");
  }, DEVICE_ID);

  let createRequests = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().endsWith("/api/me/schedules")) createRequests += 1;
  });

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
        ui: { themeId: "light", specialBgEnabled: false },
      }),
    })
  );

  await page.route("**/api/oshis**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    })
  );

  await page.route("**/api/events", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ ok: true }),
    })
  );

  await page.route("**/api/me/schedules**", async (route, request) => {
    const url = request.url();
    const method = request.method();

    if (method === "GET" && url.includes("/api/me/schedules")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [] }),
      });
      return;
    }

    if (method === "POST" && url.endsWith("/api/me/schedules")) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: successBody({
          id: "us_101",
          title: "E2E Schedule",
          startAt: "2026-02-09T03:00:00.000Z",
          endAt: null,
          isAllDay: false,
          note: null,
          location: null,
          remindAt: null,
          updatedAt: "2026-02-09T03:00:00.000Z",
        }),
      });
      return;
    }

    if (method === "DELETE" && url.includes("/api/me/schedules/101")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ deleted: true }),
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "NOT_FOUND", message: "not found" } }),
    });
  });

  await page.goto("/schedule?new=1", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "schedule-page");

  const dialog = await openDialogByTestId(page, "schedule-create");
  await expect(dialog).toBeVisible();

  // Empty submit should be blocked by UI validation (no request).
  await safeClick(dialog.locator('[data-testid="schedule-create-submit"]'));
  await expect(dialog.locator('[data-testid="schedule-title-error"]')).toBeVisible();
  expect(createRequests).toBe(0);

  await dialog.locator('[data-testid="schedule-form-title"]').fill("E2E Schedule");
  await dialog.locator('[data-testid="schedule-form-start"]').fill("2026-02-09T12:00");

  // End before start should be blocked by UI validation (no request).
  await dialog.locator('[data-testid="schedule-form-end"]').fill("2026-02-09T11:00");
  await safeClick(dialog.locator('[data-testid="schedule-create-submit"]'));
  await expect(dialog.locator('[data-testid="schedule-datetime-error"]')).toBeVisible();
  expect(createRequests).toBe(0);

  // Fix and submit successfully.
  await dialog.locator('[data-testid="schedule-form-end"]').fill("");
  await safeClick(dialog.locator('[data-testid="schedule-create-submit"]'));
  expect(createRequests).toBe(1);

  await expect(page.locator('[data-testid="schedule-item"][data-schedule-id="us_101"]')).toBeVisible({
    timeout: 15_000,
  });

  page.once("dialog", (d) => d.accept());
  await safeClick(page.locator('[data-testid="schedule-delete"][data-schedule-id="us_101"]'));

  await expect(page.locator('[data-testid="schedule-item"][data-schedule-id="us_101"]')).toHaveCount(0);
});
