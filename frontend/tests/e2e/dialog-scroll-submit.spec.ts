import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = (plan: "free" | "plus") => ({
  id: 1,
  name: "E2E User",
  email: "e2e@example.com",
  plan,
  effectivePlan: plan,
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

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) throw new Error("onboarding skip failed: " + res.status());
};

test.describe("dialog scroll + submit", () => {
  test("small viewport: circle create dialog scrolls and submit is clickable", async ({
    page,
    request,
  }) => {
    await page.setViewportSize({ width: 390, height: 420 });

    const deviceId = `device-e2e-dialog-scroll-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    await page.route("**/api/me", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe("plus")) }),
    );
    await page.route("**/api/oshis**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
    );

    const createdCircleId = 8123;
    const now = new Date().toISOString();
    const createdCircle = {
      id: createdCircleId,
      name: "E2E Created Circle",
      description: null,
      oshiLabel: "テスト推し",
      oshiTag: "test",
      oshiTags: ["test"],
      isPublic: false,
      joinPolicy: "request",
      approvalRequired: true,
      iconUrl: null,
      maxMembers: 30,
      memberCount: 1,
      myRole: "owner",
      planRequired: "plus",
      lastActivityAt: now,
      ui: { circleThemeId: null, specialBgEnabled: false, specialBgVariant: null },
      createdAt: now,
      updatedAt: now,
    };

    await page.route(/\/api\/circles(\?.*)?$/, async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(createdCircle),
        });
        return;
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) });
    });

    await page.route(new RegExp(`/api/circles/${createdCircleId}$`), (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(createdCircle) }),
    );

    await page.route(new RegExp(`/api/circles/${createdCircleId}/invite$`), (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({
          id: 1,
          circleId: createdCircleId,
          code: "12345678",
          expiresAt: null,
          maxUses: null,
          usedCount: 0,
          createdAt: now,
        }),
      }),
    );

    await page.goto("/home", { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="circle-create-cta"]').click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // The content must be scrollable within the dialog (not off-screen).
    await expect
      .poll(async () => dialog.evaluate((el) => el.scrollHeight > el.clientHeight), { timeout: 10_000 })
      .toBe(true);

    await dialog.hover();
    await page.mouse.wheel(0, 1200);
    await expect
      .poll(async () => dialog.evaluate((el) => el.scrollTop > 0), { timeout: 10_000 })
      .toBe(true);

    await dialog.getByPlaceholder("サークル名（必須）").fill("E2E Circle Name");
    await dialog.getByPlaceholder("推し対象（必須）例：なにわ男子 / 原神 / ソラ").fill("テスト推し");

    const tagInput = dialog.getByPlaceholder("推しタグを追加（最大3つ）");
    await tagInput.scrollIntoViewIfNeeded();
    await tagInput.fill("test");
    await tagInput.press("Enter");

    const submit = dialog.getByRole("button", { name: "作成する" });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeEnabled();

    await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/circles") && req.method() === "POST", {
        timeout: 10_000,
      }),
      submit.click(),
    ]);

    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10_000 });
  });
});

