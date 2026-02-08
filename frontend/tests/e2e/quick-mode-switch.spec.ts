import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();
const CIRCLE_ID = 999;

const logPass = (message: string) => console.log(`[PASS] ${message}`);

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) throw new Error("onboarding skip failed: " + res.status());
};

const ensureOshi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
) => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error("list oshis failed: " + listRes.status());
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json", Accept: "application/json" },
    data: { name: "QMSテスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error("create oshi failed: " + createRes.status());
  const created = await createRes.json();
  return created?.success?.data;
};

const mockCircle = () => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E QMS Circle",
    description: null,
    oshiLabel: "テスト推し",
    oshiTag: "test",
    oshiTags: ["test"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 5,
    myRole: "member",
    planRequired: "free",
    lastActivityAt: now,
    ui: { circleThemeId: null, specialBgEnabled: false, specialBgVariant: null },
    createdAt: now,
    updatedAt: now,
  };
};

/**
 * Mock only /api/circles (list) since circle creation needs Plus plan.
 * All other API calls go to the real backend.
 */
const setupCircleMock = async (page: Parameters<typeof test>[1]["page"]) => {
  // Intercept circles list: the browser fetches same-origin /api/circles
  await page.route(/\/api\/circles(\?.*)?$/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([mockCircle()]),
    }),
  );

  // Also intercept circle detail so navigation commits even when the circle doesn't exist on the real backend.
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(mockCircle()),
    }),
  );

  // Pins are now fetched from /pins for hub preview.
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins`), (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
  );
};

/**
 * Extended mocks: circles list + circle detail + hub sub-endpoints.
 * Needed when verifying the circle hub page actually renders.
 */
const setupCircleHubMocks = async (page: Parameters<typeof test>[1]["page"]) => {
  await setupCircleMock(page);

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(mockCircle()),
    }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/chat/messages`), (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/posts`), (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/announcement`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ circleId: CIRCLE_ID, text: null, updatedAt: null, updatedBy: null }),
    }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/logs`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [], nextCursor: null }),
    }),
  );
  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/owner`), (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
};

test.describe("quick mode switch", () => {
  test("clicking circle button navigates to circle hub", async ({ page, request }) => {
    const deviceId = `device-e2e-qms1-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    await setupCircleMock(page);

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    const qms = page.locator('[data-testid="quick-mode-switch"]');
    await expect(qms).toBeVisible({ timeout: 45_000 });
    logPass("QuickModeSwitch is visible");

    // Wait for circles data to load (移動 button only appears when circles loaded)
    const goBtn = page.locator('[data-testid="quick-mode-go"]');
    await expect(goBtn).toBeVisible({ timeout: 30_000 });
    logPass("Circles data loaded");

    // Click 移動 button to navigate to the circle hub
    await goBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}`, { timeout: 15_000, waitUntil: "commit" });
    logPass("Navigated to circle hub via QuickModeSwitch");
  });

  test("clicking personal button sets personal mode", async ({ page, request }) => {
    const deviceId = `device-e2e-qms2-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript(
      (params: { did: string; cid: string }) => {
        localStorage.setItem("osikatu:device:id", params.did);
        localStorage.setItem("osikatu:data-source", "api");
        localStorage.setItem("osikatu.quickMode", "circle");
        localStorage.setItem("osikatu.lastCircleId", params.cid);
        localStorage.setItem("osikatu:circle:selected", params.cid);
      },
      { did: deviceId, cid: String(CIRCLE_ID) },
    );

    await setupCircleMock(page);

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    const qms = page.locator('[data-testid="quick-mode-switch"]');
    await expect(qms).toBeVisible({ timeout: 45_000 });
    logPass("QuickModeSwitch is visible in circle mode");

    // Wait for circles data to load
    const goBtn = page.locator('[data-testid="quick-mode-go"]');
    await expect(goBtn).toBeVisible({ timeout: 30_000 });
    logPass("Circles data loaded");

    const personalBtn = page.locator('[data-testid="quick-mode-personal"]');
    await personalBtn.click();

    // Verify localStorage was updated to personal mode
    await expect(async () => {
      const mode = await page.evaluate(() => localStorage.getItem("osikatu.quickMode"));
      expect(mode).toBe("personal");
    }).toPass({ timeout: 5_000 });
    logPass("Personal mode set after clicking personal button");
  });
  test("personal to circle transition shows circle hub screen", async ({ page, request }) => {
    const deviceId = `device-e2e-qms3-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    await setupCircleHubMocks(page);

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    const goBtn = page.locator('[data-testid="quick-mode-go"]');
    await expect(goBtn).toBeVisible({ timeout: 45_000 });
    logPass("QuickModeSwitch loaded with circles");

    await goBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}`, { timeout: 15_000, waitUntil: "commit" });
    logPass("URL changed to circle hub");

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });
    logPass("CircleHomeScreen is visible after mode switch");
  });
});
