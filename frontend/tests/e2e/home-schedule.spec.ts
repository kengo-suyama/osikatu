import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();
const DEVICE_ID = "device-e2e-schedule-home-001";

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
      if (url.includes("/api/") || url.includes("/home")) {
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
  throw new Error(`Frontend server is not running on ${FRONTEND_BASE}.`);
};

const ensureOnboardingDone = async (request: Parameters<typeof test>[1]["request"]) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to skip onboarding: ${res.status()} ${res.url()}`);
  }
};

const ensureOshi = async (request: Parameters<typeof test>[1]["request"]) => {
  const res = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to list oshis: ${res.status()} ${res.url()}`);
  }
  const body = await res.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: {
      "X-Device-Id": DEVICE_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: { name: "スケテスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) {
    throw new Error(`Failed to create oshi: ${createRes.status()} ${createRes.url()}`);
  }
  const created = await createRes.json();
  return created?.success?.data ?? null;
};

const createSchedule = async (
  request: Parameters<typeof test>[1]["request"],
  payload: { title: string; startAt: string; location?: string }
) => {
  const res = await request.post(`${API_BASE}/api/me/schedules`, {
    headers: {
      "X-Device-Id": DEVICE_ID,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: payload,
  });
  if (!res.ok()) {
    throw new Error(`Failed to create schedule: ${res.status()} ${res.url()}`);
  }
  const body = await res.json();
  return body?.success?.data ?? null;
};

const deleteSchedule = async (request: Parameters<typeof test>[1]["request"], id: string) => {
  try {
    const numId = id.replace(/^us_/, "");
    await request.delete(`${API_BASE}/api/me/schedules/${numId}`, {
      headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
    });
  } catch {
    // ignore
  }
};

test.describe("home schedule summary", () => {
  test("schedule summary card is visible on home", async ({ page, request }) => {
    attachDiagnostics(page, "home-schedule");
    await assertFrontendUp(request);

    await ensureOnboardingDone(request);

    const oshi = await ensureOshi(request);
    if (!oshi) throw new Error("Could not ensure oshi");

    // Create a future schedule
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startAt = tomorrow.toISOString();
    const title = "テストライブ予定";
    const location = "東京ドーム";
    const schedule = await createSchedule(request, { title, startAt, location });

    await page.addInitScript((deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    }, DEVICE_ID);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      const summaryCard = page.locator('[data-testid="home-schedule-summary"]');
      await expect(summaryCard).toBeVisible({ timeout: 45_000 });
      logPass("Schedule summary card is visible");

      const items = page.locator('[data-testid="home-schedule-item"]');
      const target = items.filter({ hasText: title });
      await expect(target).toBeVisible({ timeout: 45_000 });
      await expect(target).toContainText(location);
      logPass("Schedule item is visible with location");

      const allLink = summaryCard.locator('a[href="/schedule"]');
      await expect(allLink).toBeVisible();
      await allLink.click();
      await expect(page).toHaveURL(/\/schedule/);
      logPass("Schedule link navigates to /schedule");
    } catch (error) {
      logFail("Home schedule summary checks", error);
    }

    // Cleanup
    await deleteSchedule(request, schedule.id);
  });
});
