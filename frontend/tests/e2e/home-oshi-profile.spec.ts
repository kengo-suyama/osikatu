import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => console.log(`[PASS] ${message}`);
const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
};

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) throw new Error(`onboarding skip failed: ${res.status()}`);
};

const ensureOshi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error(`list oshis failed: ${listRes.status()}`);
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json", "Content-Type": "application/json" },
    data: { name: "E2E\u63A8\u3057", category: "\u30A2\u30A4\u30C9\u30EB" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data ?? null;
};

test.describe("home oshi profile card", () => {
  test("oshi profile card is visible", async ({ page, request }) => {
    const deviceId = `device-e2e-oshi-profile-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });
      const card = page.locator('[data-testid="home-oshi-card"]');
      await expect(card).toBeVisible({ timeout: 45_000 });
      logPass("Oshi profile card is visible");
    } catch (e) {
      logFail("Oshi profile card is visible", e);
    }
  });

  test("card shows empty state or profile content", async ({ page, request }) => {
    const deviceId = `device-e2e-oshi-profile-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });
      const card = page.locator('[data-testid="home-oshi-card"]');
      await expect(card).toBeVisible({ timeout: 45_000 });

      const empty = card.locator('[data-testid="home-oshi-empty"]');
      const name = card.locator('[data-testid="home-oshi-name"]');

      const emptyVisible = await empty.isVisible().catch(() => false);
      const nameVisible = await name.isVisible().catch(() => false);

      if (emptyVisible) {
        await expect(empty).toContainText("\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u3092\u8A2D\u5B9A\u3057\u3088\u3046");
        logPass("Empty state shown correctly");
      } else if (nameVisible) {
        await expect(name).not.toBeEmpty();
        logPass("Profile content shown with name");
      } else {
        logFail("Neither empty state nor profile content visible", new Error("unexpected state"));
      }
    } catch (e) {
      logFail("Card shows empty state or profile content", e);
    }
  });

  test("edit button is visible and has correct text", async ({ page, request }) => {
    const deviceId = `device-e2e-oshi-profile-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });
      const edit = page.locator('[data-testid="home-oshi-edit"]');
      await expect(edit).toBeVisible({ timeout: 45_000 });
      await expect(edit).toContainText("\u7DE8\u96C6");
      logPass("Edit button visible with correct text");
    } catch (e) {
      logFail("Edit button visible", e);
    }
  });

  test("card title says oshi profile", async ({ page, request }) => {
    const deviceId = `device-e2e-oshi-profile-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });
      const card = page.locator('[data-testid="home-oshi-card"]');
      await expect(card).toBeVisible({ timeout: 45_000 });
      await expect(card).toContainText("\u63A8\u3057\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB");
      logPass("Card title says oshi profile");
    } catch (e) {
      logFail("Card title says oshi profile", e);
    }
  });
});
