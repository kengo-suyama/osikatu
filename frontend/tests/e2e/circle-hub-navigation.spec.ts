import { test, expect } from "@playwright/test";

const CIRCLE_ID = 123;
const DEVICE_ID = "device-e2e-hub-001";

const logPass = (message: string) => console.log(`[PASS] ${message}`);

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1,
  name: "E2E User",
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

const baseCircle = () => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Hub Circle",
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
    ui: {
      circleThemeId: null,
      specialBgEnabled: false,
      specialBgVariant: null,
    },
    createdAt: now,
    updatedAt: now,
  };
};

const setupMocks = async (page: Parameters<typeof test>[1]["page"]) => {
  await page.addInitScript(
    (deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
    },
    DEVICE_ID,
  );

  const circleUrl = new RegExp(`/api/circles/${CIRCLE_ID}$`);
  const postsUrl = new RegExp(`/api/circles/${CIRCLE_ID}/posts`);
  const pinsUrl = new RegExp(`/api/circles/${CIRCLE_ID}/pins`);
  const chatUrl = new RegExp(`/api/circles/${CIRCLE_ID}/chat/messages`);
  const announcementUrl = new RegExp(`/api/circles/${CIRCLE_ID}/announcement`);
  const logsUrl = new RegExp(`/api/circles/${CIRCLE_ID}/logs`);
  const ownerUrl = new RegExp(`/api/circles/${CIRCLE_ID}/owner`);

  await page.route("**/api/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe()),
    }),
  );

  await page.route(circleUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle()),
    }),
  );

  await page.route(chatUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    }),
  );

  await page.route(postsUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    }),
  );

  await page.route(pinsUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody([]),
    }),
  );

  await page.route(announcementUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ circleId: CIRCLE_ID, text: null, updatedAt: null, updatedBy: null }),
    }),
  );

  await page.route(logsUrl, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [], nextCursor: null }),
    }),
  );

  await page.route(ownerUrl, (route) =>
    route.fulfill({ status: 404, contentType: "application/json", body: "{}" }),
  );
};

test.describe("circle hub navigation", () => {
  test("hub displays circle name and navigation cards", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });
    logPass("Circle hub is visible");

    await expect(hub.locator("text=E2E Hub Circle")).toBeVisible();
    logPass("Circle name displayed");

    await expect(page.locator('[data-testid="circle-hub-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-hub-calendar"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-hub-members"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-hub-album"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-hub-settlements"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-hub-pins"]')).toBeVisible();
    await expect(page.locator('[data-testid="circle-hub-logs"]')).toBeVisible();
    logPass("All navigation cards visible");
  });

  test("clicking chat navigates to chat page", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const chatBtn = page.locator('[data-testid="circle-hub-chat"]');
    await chatBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/chat`, { timeout: 15_000 });
    logPass("Navigated to chat page via hub");
  });

  test("clicking calendar navigates to calendar page", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const calBtn = page.locator('[data-testid="circle-hub-calendar"]');
    await calBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/calendar`, { timeout: 15_000 });
    logPass("Navigated to calendar page via hub");
  });

  test("clicking album navigates to album page", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const albumBtn = page.locator('[data-testid="circle-hub-album"]');
    await albumBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/album`, { timeout: 15_000 });
    logPass("Navigated to album page via hub");
  });

  test("clicking members navigates to members page", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const membersBtn = page.locator('[data-testid="circle-hub-members"]');
    await membersBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/members`, { timeout: 15_000 });
    logPass("Navigated to members page via hub");
  });

  test("clicking pins navigates to pins page", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const pinsBtn = page.locator('[data-testid="circle-hub-pins"]');
    await pinsBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/pins`, { timeout: 15_000 });
    await expect(page.locator("text=遠征情報（ピン）")).toBeVisible({ timeout: 15_000 });
    logPass("Navigated to pins page via hub");
  });

  test("clicking logs navigates to logs page (free plan shows forbidden)", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const logsBtn = page.locator('[data-testid="circle-hub-logs"]');
    await logsBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/logs`, { timeout: 15_000 });
    await expect(page.locator("text=サークル操作ログ")).toBeVisible({ timeout: 15_000 });
    await expect(
      page.locator("text=Plusのオーナー/管理者のみご利用いただけます。")
    ).toBeVisible({ timeout: 15_000 });
    logPass("Navigated to logs page via hub (free plan forbidden)");
  });

  test("clicking settings navigates to settings page (manager)", async ({ page }) => {
    await setupMocks(page);

    // Override me with plus plan and circle with owner role
    await page.route("**/api/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ ...baseMe(), plan: "plus", effectivePlan: "plus" }),
      }),
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: successBody({ ...baseCircle(), myRole: "owner" }),
      }),
    );

    await page.goto(`/circles/${CIRCLE_ID}`, { waitUntil: "domcontentloaded" });

    const hub = page.locator('[data-testid="circle-home"]');
    await expect(hub).toBeVisible({ timeout: 30_000 });

    const settingsBtn = page.locator('[data-testid="circle-hub-settings"]');
    await expect(settingsBtn).toBeVisible({ timeout: 10_000 });
    await settingsBtn.click();

    await page.waitForURL(`**/circles/${CIRCLE_ID}/settings`, { timeout: 15_000 });
    logPass("Navigated to settings page via hub (manager)");
  });
});
