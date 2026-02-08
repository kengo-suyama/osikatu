import { test, expect } from "@playwright/test";

const CIRCLE_ID = 777;
const DEVICE_ID = "device-e2e-pins-001";

const successBody = (data: unknown) => JSON.stringify({ success: { data, meta: {} } });

const baseMe = () => ({
  id: 1,
  name: "E2E User",
  email: "e2e@example.com",
  plan: "plus",
  effectivePlan: "plus",
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
    name: "E2E Pins Circle",
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
    myRole: "owner",
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

  let pins: any[] = [];

  await page.route("**/api/me", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }),
  );

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle()),
    }),
  );

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/posts(\\?.*)?$`), (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
  );

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins$`), async (route) => {
    const method = route.request().method();
    if (method === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: successBody(pins) });
      return;
    }
    throw new Error(`REGRESSION: pins-v1 write called: ${method} ${route.request().url()}`);
  });

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins/\\d+(/unpin)?$`), async (route) => {
    throw new Error(`REGRESSION: pins-v1 write called: ${route.request().method()} ${route.request().url()}`);
  });

  await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins-v2$`), async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback();
      return;
    }

    const now = new Date().toISOString();
    const payload = route.request().postDataJSON?.() as { body?: string } | undefined;
    const body = payload?.body ?? "";

    const createdPin = {
      id: 9001,
      circleId: CIRCLE_ID,
      createdByMemberId: 1,
      title: body.split("\n")[0] ?? "(無題)",
      url: null,
      body,
      checklistJson: null,
      sortOrder: null,
      pinnedAt: now,
      updatedAt: now,
      createdAt: now,
      sourcePostId: 456,
    };
    pins = [createdPin, ...pins];

    await route.fulfill({ status: 201, contentType: "application/json", body: successBody(createdPin) });
  });
};

test.describe("circle pins", () => {
  test("v1 write endpoints are never called during pin lifecycle", async ({ page }) => {
    let v1WriteCalled = false;

    await page.addInitScript(
      (deviceId: string) => {
        localStorage.setItem("osikatu:device:id", deviceId);
        localStorage.setItem("osikatu:data-source", "api");
      },
      DEVICE_ID,
    );

    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) }),
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle()) }),
    );
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/posts(\\?.*)?$`), (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) }),
    );

    // v1 write trap: if any POST/PATCH/unpin hits /pins (not /pins-v2), set flag and return 500
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins$`), async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) });
        return;
      }
      v1WriteCalled = true;
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "V1_TRAP", message: "v1 write called" } }) });
    });
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins/\\d+(/unpin)?$`), async (route) => {
      v1WriteCalled = true;
      await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { code: "V1_TRAP", message: "v1 write called" } }) });
    });

    // v2 write: normal mock
    const now = new Date().toISOString();
    const mockPin = {
      id: 8001, circleId: CIRCLE_ID, createdByMemberId: 1,
      title: "v1 trap test", url: null, body: "v1 trap test",
      checklistJson: null, sortOrder: null,
      pinnedAt: now, updatedAt: now, createdAt: now, sourcePostId: 800,
    };
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins-v2$`), async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 201, contentType: "application/json", body: successBody(mockPin) });
        return;
      }
      await route.fallback();
    });
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins-v2/\\d+$`), async (route) => {
      if (route.request().method() === "PATCH") {
        await route.fulfill({ status: 200, contentType: "application/json", body: successBody(mockPin) });
        return;
      }
      await route.fallback();
    });
    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}/pins-v2/\\d+/unpin$`), async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: successBody({ ok: true }) });
    });

    await page.goto(`/circles/${CIRCLE_ID}/pins`, { waitUntil: "domcontentloaded" });
    const root = page.locator('[data-testid="circle-pins"]');
    await expect(root).toBeVisible({ timeout: 30_000 });

    // Trigger a create via the UI
    await page.locator('[data-testid="pins-add"]').click();
    const dialog = page.locator('[data-testid="pin-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-testid="pin-title"]').fill("v1 trap test");
    await page.locator('[data-testid="pin-save"]').click();

    // Wait for the create to process
    await page.waitForTimeout(2_000);

    // Assert: v1 was never called
    expect(v1WriteCalled).toBe(false);
  });

  test("manager can create a pin and it appears in the list", async ({ page }) => {
    await setupMocks(page);

    await page.goto(`/circles/${CIRCLE_ID}/pins`, { waitUntil: "domcontentloaded" });

    const root = page.locator('[data-testid="circle-pins"]');
    await expect(root).toBeVisible({ timeout: 30_000 });

    await page.locator('[data-testid="pins-add"]').click();

    const dialog = page.locator('[data-testid="pin-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    await page.locator('[data-testid="pin-title"]').fill("集合場所");
    await page.locator('[data-testid="pin-url"]').fill("https://example.com/meet");
    await page.locator('[data-testid="pin-body"]').fill("- [ ] 〇〇改札\n- [x] チケット発券");

    await page.locator('[data-testid="pin-save"]').click();

    const item = page.locator('[data-testid="pin-item-456"]');
    await expect(item).toBeVisible({ timeout: 15_000 });
    await expect(item).toContainText("集合場所");
    await expect(item).toContainText("https://example.com/meet");
    await expect(item).toContainText("チェックリスト");
    await expect(item).toContainText("チケット発券");
  });
});
