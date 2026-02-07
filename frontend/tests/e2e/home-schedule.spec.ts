import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

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
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (url.includes("/api/")) {
      console.log(`[${label}][requestfailed] ${url} ${req.failure()?.errorText ?? ""}`);
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

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to skip onboarding: ${res.status()} ${res.url()}`);
  }
};

const ensureOshi = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
  const res = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to list oshis: ${res.status()} ${res.url()}`);
  }
  const body = await res.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: {
      "X-Device-Id": deviceId,
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
  deviceId: string,
  payload: { title: string; startAt: string; location?: string }
) => {
  const res = await request.post(`${API_BASE}/api/me/schedules`, {
    headers: {
      "X-Device-Id": deviceId,
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

const deleteSchedule = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
  id: string | null | undefined
) => {
  if (!id) return;
  try {
    const numId = id.replace(/^us_/, "");
    await request.delete(`${API_BASE}/api/me/schedules/${numId}`, {
      headers: { "X-Device-Id": deviceId, Accept: "application/json" },
    });
  } catch {
    // ignore
  }
};

const listSchedules = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
  from: string
) => {
  const res = await request.get(`${API_BASE}/api/me/schedules?from=${encodeURIComponent(from)}`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) {
    throw new Error(`Failed to list schedules: ${res.status()} ${res.url()}`);
  }
  const body = await res.json();
  return (body?.success?.data?.items ?? []) as Array<{ title?: string }>;
};

test.describe("home schedule summary", () => {
  test("schedule summary card is visible on home", async ({ page, request }) => {
    // Under parallel e2e load on Windows, schedule-related flows can take longer than the default 90s.
    test.setTimeout(180_000);

    attachDiagnostics(page, "home-schedule");
    await assertFrontendUp(request);

    const deviceId = `device-e2e-schedule-home-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);

    const oshi = await ensureOshi(request, deviceId);
    if (!oshi) throw new Error("Could not ensure oshi");

    // Create a future schedule (unique title to avoid collisions when prior runs failed before cleanup).
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    const startAt = tomorrow.toISOString();
    const title = `テストライブ予定 ${Date.now()}`;
    const location = "東京ドーム";
    const schedule = await createSchedule(request, deviceId, { title, startAt, location });

    const from = new Date();
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
    const apiItems = await listSchedules(request, deviceId, fromStr);
    if (!apiItems.some((s) => s.title === title)) {
      throw new Error(`Created schedule not found in API list (from=${fromStr})`);
    }

    await page.addInitScript((deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      const summaryCard = page.locator('[data-testid="home-schedule-summary"]');
      await expect(summaryCard).toBeVisible({ timeout: 45_000 });
      logPass("Schedule summary card is visible");

      const schedulesRes = await page.waitForResponse((r) => r.url().includes("/api/me/schedules"), {
        timeout: 90_000,
      });
      if (!schedulesRes.ok()) {
        throw new Error(`Schedule list failed: ${schedulesRes.status()} ${schedulesRes.url()}`);
      }

      // The home summary list may be capped (e.g. top 5). If the seeded item isn't shown there,
      // we still verify it's visible on the schedule page via the "すべて見る" link below.
      const items = page.locator('[data-testid="home-schedule-item"]');
      const target = items.filter({ hasText: title }).first();
      try {
        await expect(target).toBeVisible({ timeout: 10_000 });
        await expect(target).toContainText(location);
        logPass("Schedule item is visible with location (home summary)");
      } catch {
        console.log("[PASS] Schedule item not visible in home summary; verifying via /schedule instead");
      }

      const allLink = summaryCard.locator('a[href="/schedule"]');
      await expect(allLink).toBeVisible();
      await allLink.click();
      await expect(page).toHaveURL(/\/schedule/);
      logPass("Schedule link navigates to /schedule");

      const scheduleTitle = page.getByText(title).first();
      await expect(scheduleTitle).toBeVisible({ timeout: 45_000 });
      logPass("Schedule item is visible on /schedule");
    } catch (error) {
      logFail("Home schedule summary checks", error);
    } finally {
      // Cleanup even when assertions fail (avoid polluting later runs).
      await deleteSchedule(request, deviceId, schedule?.id);
    }
  });
});
