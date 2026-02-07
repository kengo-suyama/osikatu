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

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
};

const ensurePlusPlan = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
  await request.put(`${API_BASE}/api/me/plan`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: { plan: "plus" },
  });
};

const createCircle = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
  const res = await request.post(`${API_BASE}/api/circles`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: {
      name: `E2E Chat ${Date.now()}`,
      oshiLabel: "E2E推し",
      oshiTags: ["e2e"],
      isPublic: false,
      joinPolicy: "instant",
    },
  });
  if (!res.ok()) {
    throw new Error(`Failed to create circle: ${res.status()} ${res.url()}`);
  }
  const body = await res.json();
  const id = body?.success?.data?.id;
  if (!id) throw new Error("No circle id in response");
  return id as number;
};

const initStorage = (page: Parameters<typeof test>[1]["page"], deviceId: string) =>
  page.addInitScript((id: string) => {
    localStorage.setItem("osikatu:device:id", id);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  }, deviceId);

test.describe("chat stamp and media", () => {
  test("chat page has stamp button and input", async ({ page, request }) => {
    attachDiagnostics(page, "chat-stamp");
    await assertFrontendUp(request);

    const deviceId = "device-e2e-chat-001";
    await ensureOnboardingDone(request, deviceId);
    await ensurePlusPlan(request, deviceId);
    const circleId = await createCircle(request, deviceId);

    await initStorage(page, deviceId);

    await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });

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

    await initStorage(page, deviceId);
    await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });

    // Ensure the client has hydrated and initial chat fetch has completed.
    await expect(page.locator("text=読み込み中...")).toBeHidden({ timeout: 45_000 });

    // Wait for stamp button
    const stampButton = page.locator('[data-testid="chat-stamp-open"]');
    await expect(stampButton).toBeVisible({ timeout: 30_000 });

    // Click stamp button to open picker
    await stampButton.click();

    // Wait for stamp items to be visible (don't rely on Radix role structure; keep it selector-stable).
    const stampItems = page.locator('[data-testid="chat-stamp-item"]');
    await expect(stampItems.first()).toBeVisible({ timeout: 30_000 });

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

    await initStorage(page, deviceId);
    await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });

    // Ensure the client has hydrated and initial chat fetch has completed.
    await expect(page.locator("text=読み込み中...")).toBeHidden({ timeout: 45_000 });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 30_000 });
    await expect(chatInput).toBeEditable();

    const testMessage = `E2E test message ${Date.now()}`;
    await chatInput.fill(testMessage);
    await expect(chatInput).toHaveValue(testMessage);

    const sendButton = page.locator('[data-testid="chat-send"]');
    await expect(sendButton).toBeEnabled({ timeout: 45_000 });
    await sendButton.click();

    // Wait for message to appear
    const messageText = page.locator(`text=${testMessage}`);
    await expect(messageText).toBeVisible({ timeout: 30_000 });

    logPass("Text message sent and visible");
  });
});
