import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

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

const ensureOnboardingDone = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
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
      name: `E2E EnterPop ${Date.now()}`,
      oshiLabel: "E2E推し",
      oshiTags: ["e2e"],
      isPublic: false,
      joinPolicy: "instant",
    },
  });
  if (!res.ok()) throw new Error(`create circle failed: ${res.status()}`);
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
    // Ensure cooldown starts fresh for this test.
    localStorage.removeItem("osikatu:chat:title-pop:last");
  }, deviceId);

const uniqueDeviceId = (prefix: string) =>
  `${prefix}-${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1000)}`;

test("chat enter title pop shows once with cooldown", async ({ page, request }) => {
  await assertFrontendUp(request);

  const deviceId = uniqueDeviceId("device-e2e-enter-pop");
  await ensureOnboardingDone(request, deviceId);
  await ensurePlusPlan(request, deviceId);
  const circleId = await createCircle(request, deviceId);

  await initStorage(page, deviceId);

  const pop = page.locator('[data-testid="title-enter-pop"]');

  await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });
  await expect(pop).toBeVisible({ timeout: 15_000 });
  await expect(pop).toBeHidden({ timeout: 10_000 });
  await expect(page.locator("text=読み込み中...")).toBeHidden({ timeout: 45_000 });

  // Re-enter quickly: should not show again due to cooldown.
  await page.goto("/home", { waitUntil: "domcontentloaded" });
  await page.goto(`/circles/${circleId}/chat`, { waitUntil: "domcontentloaded" });
  await expect(page.locator("text=読み込み中...")).toBeHidden({ timeout: 45_000 });

  const start = Date.now();
  while (Date.now() - start < 1200) {
    const count = await pop.count();
    if (count > 0) {
      throw new Error("title-enter-pop appeared during cooldown");
    }
    await page.waitForTimeout(100);
  }
});
