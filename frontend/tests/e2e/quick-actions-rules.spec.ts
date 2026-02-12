import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(FRONTEND_BASE + "/home", { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Frontend server is not running on " + FRONTEND_BASE + ".");
};

const ensureOnboardingDone = async (request: Parameters<typeof test>[1]["request"], deviceId: string) => {
  await request.post(API_BASE + "/api/me/onboarding/skip", {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
};

const initStorage = (page: Parameters<typeof test>[1]["page"], deviceId: string) =>
  page.addInitScript((id: string) => {
    localStorage.setItem("osikatu:device:id", id);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  }, deviceId);

const uniqueDeviceId = (prefix: string) =>
  prefix + "-" + Date.now() + "-" + process.pid + "-" + Math.floor(Math.random() * 1000);

test.describe("Quick actions visibility rules", () => {
  test("quick actions section renders with testids", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-qa");
    await ensureOnboardingDone(request, deviceId);

    await initStorage(page, deviceId);

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Quick actions section should be visible
    const section = page.locator('[data-testid="quick-actions-section"]');
    await expect(section).toBeVisible({ timeout: 15_000 });

    // Core actions (log, schedule, money) should always be present
    await expect(page.locator('[data-testid="quick-action-log"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-action-schedule"]')).toBeVisible();
    await expect(page.locator('[data-testid="quick-action-money"]')).toBeVisible();

    // Oshi image action should be present
    await expect(page.locator('[data-testid="quick-action-oshi-image"]')).toBeVisible();

    console.log("[PASS] Quick actions visibility rules working");
  });
});
