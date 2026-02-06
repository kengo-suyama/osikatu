import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
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
  throw new Error(`Frontend server is not running on ${FRONTEND_BASE}.`);
};

const stripBom = (value: string) => value.replace(/^\uFEFF/, "");
const parseJson = (value: string) => JSON.parse(stripBom(value)) as any;

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
};

const ensurePlusPlan = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.put(`${API_BASE}/api/me/plan`, {
    headers: {
      "X-Device-Id": deviceId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: { plan: "plus" },
  });
  expect(res.ok()).toBeTruthy();
};

const createCircle = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.post(`${API_BASE}/api/circles`, {
    headers: {
      "X-Device-Id": deviceId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: {
      name: `E2E Chat Circle ${Date.now()}`,
      oshiLabel: "推し",
      oshiTags: ["e2e-chat"],
      isPublic: false,
      joinPolicy: "instant",
    },
  });
  expect(res.ok()).toBeTruthy();
  const json = parseJson(await res.text());
  const id = json?.success?.data?.id;
  expect(typeof id).toBe("number");
  return id as number;
};

const waitForChatReady = async (page: Parameters<typeof test>[1]["page"]) => {
  const list = page.locator('[data-testid="chat-message-list"]');
  await expect(list).toBeVisible({ timeout: 30_000 });
};

test.describe("chat stamp and media", () => {
  test("chat page has stamp button and input", async ({ page, request }) => {
    attachDiagnostics(page, "chat-stamp");
    await assertFrontendUp(request);

    const deviceId = "device-e2e-chat-001";
    await ensureOnboardingDone(request, deviceId);
    await ensurePlusPlan(request, deviceId);
    const circleId = await createCircle(request, deviceId);

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-chat-001");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    // Navigate to chat page (newly created circle)
    await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });
    await waitForChatReady(page);

    // Check chat input exists
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 30_000 });
    logPass("Chat input visible");

    // Check send button exists
    const sendButton = page.locator('[data-testid="chat-send"]');
    await expect(sendButton).toBeVisible();
    logPass("Chat send button visible");

    // Check stamp button exists
    const stampButton = page.locator('[data-testid="chat-stamp-open"]');
    await expect(stampButton).toBeVisible();
    logPass("Chat stamp button visible");

    // Check attach button exists
    const attachButton = page.locator('[data-testid="chat-attach-image"]');
    await expect(attachButton).toBeVisible();
    logPass("Chat attach button visible");
  });

  test("stamp picker opens and shows stamps", async ({ page, request }) => {
    attachDiagnostics(page, "chat-stamp-picker");
    await assertFrontendUp(request);

    const deviceId = "device-e2e-chat-002";
    await ensureOnboardingDone(request, deviceId);
    await ensurePlusPlan(request, deviceId);
    const circleId = await createCircle(request, deviceId);

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-chat-002");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });
    await waitForChatReady(page);

    // Wait for stamp button
    const stampButton = page.locator('[data-testid="chat-stamp-open"]');
    await expect(stampButton).toBeVisible({ timeout: 30_000 });

    // Click stamp button to open picker
    await stampButton.click();

    // Wait for stamp items to be visible
    const stampItems = page.locator('[data-testid="chat-stamp-item"]');
    await expect(stampItems.first()).toBeVisible({ timeout: 10_000 });

    const count = await stampItems.count();
    expect(count).toBeGreaterThan(0);
    logPass(`Stamp picker shows ${count} stamps`);
  });

  test("can send text message", async ({ page, request }) => {
    attachDiagnostics(page, "chat-send-text");
    await assertFrontendUp(request);

    const deviceId = "device-e2e-chat-003";
    await ensureOnboardingDone(request, deviceId);
    await ensurePlusPlan(request, deviceId);
    const circleId = await createCircle(request, deviceId);

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-chat-003");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });
    await waitForChatReady(page);

    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 30_000 });

    const items = page.locator('[data-testid="chat-message-item"]');
    const beforeCount = await items.count();

    const testMessage = `E2E test message ${Date.now()}`;
    await chatInput.fill(testMessage);

    const sendButton = page.locator('[data-testid="chat-send"]');
    await expect(sendButton).toBeEnabled();

    // Add a tiny artificial delay so we can reliably observe "sending" disabled state.
    await page.route(`**/api/circles/${circleId}/chat/messages`, async (route, req) => {
      if (req.method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      await route.continue();
    });

    const sendResponse = page.waitForResponse((response) => {
      const req = response.request();
      return (
        req.method() === "POST" &&
        response.url().includes(`/api/circles/${circleId}/chat/messages`)
      );
    });

    await sendButton.click();

    await expect(sendButton).toBeDisabled();
    const res = await sendResponse;
    expect(res.ok()).toBeTruthy();
    await expect(chatInput).toHaveValue("");

    await expect(items).toHaveCount(beforeCount + 1, { timeout: 30_000 });
    await expect(items.last()).toContainText(testMessage);

    logPass("Text message sent, input cleared, and message rendered");
  });
});
