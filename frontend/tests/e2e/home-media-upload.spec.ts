import { test, expect } from "@playwright/test";

import { waitForPageReady } from "./helpers/actions";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

test("home main media upload updates the preview immediately (mocked)", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("osikatu:device:id", "device-e2e-home-media-upload-001");
    localStorage.setItem("osikatu:data-source", "api");
  });

  await page.route("**/api/me", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        id: 1,
        userId: 1,
        deviceId: "device-e2e-home-media-upload-001",
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

  // Home background requests (keep it fast/stable).
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

  await page.route("**/api/me/media/home", async (route, request) => {
    if (request.method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ item: null }),
      });
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: successBody({
        item: {
          type: "image",
          url: "https://example.com/home-main.png",
          mime: "image/png",
          sizeBytes: 123,
          width: 800,
          height: 450,
          updatedAt: "2026-02-09T00:00:00.000Z",
        },
      }),
    });
  });

  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await waitForPageReady(page, "home-page");

  await expect(page.locator('[data-testid="home-main-media"]')).toBeVisible();

  const fileBuffer = Buffer.from(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000154010db2b50000000049454e44ae426082",
    "hex"
  );
  await page.setInputFiles('[data-testid="home-main-media-input"]', {
    name: "home.png",
    mimeType: "image/png",
    buffer: fileBuffer,
  });

  const img = page.locator('[data-testid="home-main-media-image"]');
  await expect(img).toBeVisible({ timeout: 15_000 });
  await expect(img).toHaveAttribute("src", "https://example.com/home-main.png");
});

