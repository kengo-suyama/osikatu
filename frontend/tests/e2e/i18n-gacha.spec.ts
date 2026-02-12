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

const uniqueDeviceId = (prefix: string) =>
  prefix + "-" + Date.now() + "-" + process.pid + "-" + Math.floor(Math.random() * 1000);

test.describe("i18n gacha item names", () => {
  test("gacha page shows English text when locale is en", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-i18n-gacha");
    await ensureOnboardingDone(request, deviceId);

    await page.addInitScript((id: string) => {
      localStorage.setItem("osikatu:device:id", id);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
      localStorage.setItem("osikatu:locale", "en");
    }, deviceId);

    await page.goto("/gacha", { waitUntil: "domcontentloaded" });

    // Wait for hydration
    await expect(page.locator('[data-testid="gacha-hydrated"]')).toBeAttached({ timeout: 15_000 });

    // Title should be in English
    await expect(page.locator("text=Seal Gacha")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Open Seal")).toBeVisible();

    console.log("[PASS] Gacha page shows English i18n text");
  });

  test("gacha page shows Japanese text by default", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-i18n-gacha-ja");
    await ensureOnboardingDone(request, deviceId);

    await page.addInitScript((id: string) => {
      localStorage.setItem("osikatu:device:id", id);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    }, deviceId);

    await page.goto("/gacha", { waitUntil: "domcontentloaded" });

    await expect(page.locator('[data-testid="gacha-hydrated"]')).toBeAttached({ timeout: 15_000 });

    await expect(page.locator("text=封印札ガチャ")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=封印札を開く")).toBeVisible();

    console.log("[PASS] Gacha page shows Japanese i18n text by default");
  });
});
