import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8000").trim();
const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const DEVICE_ID = process.env.PLAYWRIGHT_DEVICE_ID ?? "device-e2e-001";
const CIRCLE_ID = 123;

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
};

const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
};

const attachDiagnostics = (page: Parameters<typeof test>[1]["page"], label: string) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[${label}][console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[${label}][pageerror] ${error.message}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = response.url();
      if (url.includes("/api/")) {
        console.log(`[${label}][response ${status}] ${url}`);
      }
    }
  });
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
    `Frontend server is not running on ${FRONTEND_BASE}. Start with npm run dev -- -p 3103 or set E2E_BASE_URL.`
  );
};

const successBody = (data: unknown) =>
  JSON.stringify({
    success: {
      data,
      meta: {},
    },
  });

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
  ui: {
    themeId: "default",
    specialBgEnabled: false,
  },
});

const baseCircle = (myRole: "owner" | "admin" | "member") => {
  const now = new Date().toISOString();
  return {
    id: CIRCLE_ID,
    name: "E2E Circle",
    description: null,
    oshiLabel: "推し",
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

const logsUrl = new RegExp(`/api/circles/${CIRCLE_ID}/logs(\\?.*)?$`);
const circleUrl = new RegExp(`/api/circles/${CIRCLE_ID}$`);

const seedLocalStorage = async (page: Parameters<typeof test>[1]["page"]) => {
  await page.addInitScript(
    ([deviceId, apiBase]) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", apiBase);
    },
    [DEVICE_ID, API_BASE]
  );
};

test("circle logs forbidden when plan is free", async ({ page, request }) => {
  attachDiagnostics(page, "circle-logs-free");
  await assertFrontendUp(request);
  await seedLocalStorage(page);

  let logsRequested = false;

  await page.route("**/api/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe("free")),
    });
  });

  await page.route(circleUrl, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle("owner")),
    });
  });

  await page.route(logsUrl, (route) => {
    logsRequested = true;
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "UNEXPECTED", message: "unexpected" } }),
    });
  });

  await page.goto(`/circles/${CIRCLE_ID}/logs`, { waitUntil: "domcontentloaded" });

  try {
    await expect(
      page.locator("text=Plusのオーナー/管理者のみご利用いただけます。")
    ).toBeVisible({ timeout: 30_000 });
    await page.waitForTimeout(500);
    expect(logsRequested).toBeFalsy();
    logPass("/circles/:id/logs shows forbidden for free plan");
  } catch (error) {
    logFail("/circles/:id/logs shows forbidden for free plan", error);
  }
});

test("circle logs visible for plus owner", async ({ page, request }) => {
  attachDiagnostics(page, "circle-logs-plus");
  await assertFrontendUp(request);
  await seedLocalStorage(page);

  const logItem = {
    id: "lg_e2e_001",
    action: "chat_message.create",
    circleId: String(CIRCLE_ID),
    actorUserId: 7,
    targetType: "chat_message",
    targetId: "msg_001",
    meta: {},
    createdAt: new Date().toISOString(),
  };

  await page.route("**/api/me", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseMe("plus")),
    });
  });

  await page.route(circleUrl, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody(baseCircle("owner")),
    });
  });

  await page.route(logsUrl, (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: successBody({
        items: [logItem],
        nextCursor: null,
      }),
    });
  });

  const logResponse = page.waitForResponse((response) => logsUrl.test(response.url()), {
    timeout: 30_000,
  });
  await page.goto(`/circles/${CIRCLE_ID}/logs`, { waitUntil: "domcontentloaded" });

  try {
    await expect(page.locator("text=サークル操作ログ")).toBeVisible({ timeout: 30_000 });
    await page.locator("text=30日").click();
    await logResponse;
    await expect(page.locator("text=#7 がチャットを送信しました")).toBeVisible({
      timeout: 30_000,
    });
    logPass("/circles/:id/logs shows log item for plus owner");
  } catch (error) {
    logFail("/circles/:id/logs shows log item for plus owner", error);
  }
});
