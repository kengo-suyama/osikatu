import { test, expect } from "@playwright/test";

import { openDialogByTestId, safeClick, waitForPageReady } from "./helpers/actions";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

test("album modal: upload -> save -> delete (mocked)", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("osikatu:device:id", "device-e2e-album-001");
    localStorage.setItem("osikatu:data-source", "api");
  });

  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        id: 1,
        userId: 1,
        deviceId: "device-e2e-album-001",
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

  // Home background requests.
  await page.route("**/api/circles**", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
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
  await page.route("**/api/me/logs**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [], nextCursor: null }),
    })
  );
  await page.route("**/api/me/schedules**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [] }),
    })
  );
  await page.route("**/api/me/expenses-summary**", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        month: "2026-02",
        period: { start: "2026-02-01", end: "2026-02-28" },
        totalAmount: 0,
        byOshi: [],
      }),
    })
  );
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
  await page.route("**/api/events", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ ok: true }),
    })
  );

  await page.route("**/api/me/album**", async (route, request) => {
    const url = request.url();
    const method = request.method();

    if (method === "GET" && url.endsWith("/api/me/album")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ items: [] }),
      });
      return;
    }

    if (method === "POST" && url.endsWith("/api/me/album")) {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: successBody({
          id: 101,
          date: "2026-02-09",
          note: "E2E album",
          media: [
            {
              id: "m1",
              type: "image",
              url: "https://example.com/album.png",
              name: "album.png",
              mime: "image/png",
              sizeBytes: 1,
              width: 1,
              height: 1,
            },
          ],
          createdAt: "2026-02-09T00:00:00.000Z",
        }),
      });
      return;
    }

    if (method === "DELETE" && url.includes("/api/me/album/101")) {
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

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "home-page");

  const dialog = await openDialogByTestId(page, "nav-album");
  await expect(dialog).toBeVisible();

  await dialog.getByPlaceholder("思い出メモ").fill("E2E album");

  const fileBuffer = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154010db2b50000000049454e44ae426082",
    "hex"
  );
  await page.setInputFiles('[data-testid="album-upload-input"]', {
    name: "album.png",
    mimeType: "image/png",
    buffer: fileBuffer,
  });

  await safeClick(dialog.locator('[data-testid="album-save"]'));
  await expect(page.locator('[data-testid="album-upload-success"]')).toBeVisible({ timeout: 10_000 });
  await expect(dialog.locator('[data-testid="album-list"]')).toBeVisible({ timeout: 10_000 });
  await expect(dialog.locator('[data-testid="album-entry"][data-entry-id="101"]')).toBeVisible({
    timeout: 15_000,
  });

  await safeClick(dialog.locator('[data-testid="album-entry-delete"][data-entry-id=\"101\"]'));
  await expect(
    dialog.locator('[data-testid="album-saved-list"] >> text=まだ保存されたアルバムがありません。')
  ).toBeVisible({ timeout: 15_000 });
});
