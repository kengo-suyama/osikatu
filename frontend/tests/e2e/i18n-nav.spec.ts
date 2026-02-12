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

test.describe("i18n core navigation", () => {
  test("nav shows English labels when locale is en", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-i18n-nav");
    await ensureOnboardingDone(request, deviceId);

    // Set locale to English in localStorage
    await page.addInitScript((id: string) => {
      localStorage.setItem("osikatu:device:id", id);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
      localStorage.setItem("osikatu:locale", "en");
    }, deviceId);

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Bottom nav should show English labels
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 15_000 });

    // Check for English nav text
    await expect(nav.locator("text=Home")).toBeVisible({ timeout: 10_000 });
    await expect(nav.locator("text=Log")).toBeVisible();
    await expect(nav.locator("text=Money")).toBeVisible();
    await expect(nav.locator("text=Schedule")).toBeVisible();
    await expect(nav.locator("text=Album")).toBeVisible();
    await expect(nav.locator("text=Settings")).toBeVisible();

    console.log("[PASS] i18n nav shows English labels");
  });

  test("nav shows Japanese labels by default", async ({ page, request }) => {
    await assertFrontendUp(request);

    const deviceId = uniqueDeviceId("device-e2e-i18n-nav-ja");
    await ensureOnboardingDone(request, deviceId);

    await page.addInitScript((id: string) => {
      localStorage.setItem("osikatu:device:id", id);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
      // No locale set -> defaults to ja
    }, deviceId);

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 15_000 });

    await expect(nav.locator("text=ホーム")).toBeVisible({ timeout: 10_000 });
    await expect(nav.locator("text=ログ")).toBeVisible();

    console.log("[PASS] i18n nav shows Japanese labels by default");
  });
});
