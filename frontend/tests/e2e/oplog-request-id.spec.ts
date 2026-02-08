import { test, expect } from "@playwright/test";

const CIRCLE_ID = 8080;
const DEVICE_ID = "device-e2e-oplog-reqid-001";

const successBody = (data: unknown) =>
  JSON.stringify({ success: { data, meta: {} } });

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
    name: "E2E OpLog Circle",
    description: null,
    oshiLabel: "\u30C6\u30B9\u30C8\u63A8\u3057",
    oshiTag: "test",
    oshiTags: ["test"],
    isPublic: false,
    joinPolicy: "request",
    approvalRequired: true,
    iconUrl: null,
    maxMembers: 30,
    memberCount: 2,
    myRole: "owner",
    planRequired: "free",
    lastActivityAt: now,
    ui: { circleThemeId: null, specialBgEnabled: false, specialBgVariant: null },
    createdAt: now,
    updatedAt: now,
  };
};

const REQUEST_ID = "550e8400-e29b-41d4-a716-446655440000";

const logsData = {
  items: [
    {
      id: "lg_1001",
      action: "chat_message.create",
      circleId: String(CIRCLE_ID),
      actorUserId: 1,
      targetType: null,
      targetId: null,
      meta: { request_id: REQUEST_ID, mediaCount: 0 },
      createdAt: new Date().toISOString(),
    },
    {
      id: "lg_1002",
      action: "join_request.create",
      circleId: String(CIRCLE_ID),
      actorUserId: 2,
      targetType: null,
      targetId: null,
      meta: {},
      createdAt: new Date().toISOString(),
    },
  ],
  nextCursor: null,
};

test.describe("oplog request_id display", () => {
  test("circle logs show request_id when present in meta", async ({ page }) => {
    await page.addInitScript(
      (deviceId: string) => {
        localStorage.setItem("osikatu:device:id", deviceId);
        localStorage.setItem("osikatu:data-source", "api");
      },
      DEVICE_ID
    );

    await page.route("**/api/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseMe()) })
    );

    await page.route(new RegExp(`/api/circles/${CIRCLE_ID}$`), (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody(baseCircle()) })
    );

    await page.route(
      new RegExp(`/api/circles/${CIRCLE_ID}/logs`),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: successBody(logsData),
        })
    );

    await page.route("**/api/oshis**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: successBody([]) })
    );

    await page.goto(`/circles/${CIRCLE_ID}/logs`, { waitUntil: "domcontentloaded" });

    // Wait for logs to load
    const reqIdEl = page.locator('[data-testid="oplog-request-id"]').first();
    await expect(reqIdEl).toBeVisible({ timeout: 15_000 });

    // Should contain the request_id text
    await expect(reqIdEl).toContainText(REQUEST_ID);

    // Copy button should be visible
    const copyBtn = page.locator('[data-testid="oplog-request-id-copy"]').first();
    await expect(copyBtn).toBeVisible();

    // Second log (no request_id) should NOT have the request_id element
    const allReqIds = page.locator('[data-testid="oplog-request-id"]');
    await expect(allReqIds).toHaveCount(1);
  });
});
