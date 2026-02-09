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

test.describe("A11y reduce motion", () => {
  test("reduce motion toggle sets data attribute and persists", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-a11y");
    await ensureOnboardingDone(request, deviceId);

    await initStorage(page, deviceId);

    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    // Card should be visible
    const card = page.locator('[data-testid="settings-reduce-motion-card"]');
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Toggle should exist
    const toggle = page.locator('[data-testid="settings-reduce-motion"]');
    await expect(toggle).toBeVisible();

    // Enable reduce motion
    await toggle.click();

    // Check data attribute on html element
    const attr = await page.evaluate(() => document.documentElement.dataset.reduceMotion);
    expect(attr).toBe("true");

    // Check localStorage persistence
    const stored = await page.evaluate(() => localStorage.getItem("osikatu:a11y:reduce-motion"));
    expect(stored).toBe("1");

    console.log("[PASS] A11y reduce motion toggle works");
  });
});
