import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8000").trim();
const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const DEVICE_ID = process.env.PLAYWRIGHT_DEVICE_ID ?? "device-e2e-001";
const CIRCLE_ID = 123;

const successBody = (data: unknown) =>
  JSON.stringify({
    success: {
      data,
      meta: {},
    },
  });

const baseMe = (plan: "free" | "plus" = "free") => ({
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
  ui: {
    themeId: "default",
    specialBgEnabled: false,
  },
});

const baseCircle = (myRole: "owner" | "admin" | "member" = "member") => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Circle",
    description: null,
    oshiLabel: "\u63A8\u3057",
    oshiTag: "oshi",
    oshiTags: ["oshi"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 3,
    myRole,
    planRequired: "free",
    lastActivityAt: null,
    ui: {
      circleThemeId: null,
      specialBgEnabled: false,
      specialBgVariant: null,
    },
    createdAt: now,
    updatedAt: now,
  };
};

const circleUrl = new RegExp(`/api/circles/${CIRCLE_ID}$`);
const calendarUrl = new RegExp(`/api/circles/${CIRCLE_ID}/calendar(\\?.*)?$`);

const seedLocalStorage = async (page: Parameters<typeof test>[1]["page"]) => {
  await page.addInitScript(
    ([deviceId, apiBase]) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", apiBase);
    },
    [DEVICE_ID, API_BASE],
  );
};

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(`${FRONTEND_BASE}/home`, { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Frontend server is not running on ${FRONTEND_BASE}. Start with npm run dev or set E2E_BASE_URL.`,
  );
};

const setupMocks = async (
  page: Parameters<typeof test>[1]["page"],
  options: { plan?: "free" | "plus"; role?: "owner" | "admin" | "member" } = {},
) => {
  const { plan = "free", role = "member" } = options;

  await page.route("**/api/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe(plan)),
    });
  });

  await page.route(circleUrl, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle(role)),
    });
  });

  await page.route(calendarUrl, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({ items: [] }),
    });
  });
};

test.describe("circle schedule member create navigation", () => {
  test("member with free plan sees schedule-create button", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);
    await setupMocks(page, { plan: "free", role: "member" });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    const createBtn = page.locator('[data-testid="schedule-create"]');
    await expect(createBtn).toBeVisible({ timeout: 30_000 });
    await expect(createBtn).toHaveText("予定を追加");
  });

  test("clicking schedule-create opens dialog with title input", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);
    await setupMocks(page, { plan: "free", role: "member" });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    const createBtn = page.locator('[data-testid="schedule-create"]');
    await expect(createBtn).toBeVisible({ timeout: 30_000 });
    await createBtn.click();

    const titleInput = page.locator('[data-testid="schedule-create-title"]');
    await expect(titleInput).toBeVisible({ timeout: 10_000 });

    const submitBtn = page.locator('[data-testid="schedule-create-submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
    await expect(submitBtn).toHaveText("追加する");
  });

  test("owner with plus plan also sees schedule-create button", async ({ page, request }) => {
    await assertFrontendUp(request);
    await seedLocalStorage(page);
    await setupMocks(page, { plan: "plus", role: "owner" });

    await page.goto(`/circles/${CIRCLE_ID}/calendar`, { waitUntil: "domcontentloaded" });

    const createBtn = page.locator('[data-testid="schedule-create"]');
    await expect(createBtn).toBeVisible({ timeout: 30_000 });
  });
});
