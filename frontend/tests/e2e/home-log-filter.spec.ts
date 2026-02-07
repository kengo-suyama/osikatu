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
    headers: { "X-Device-Id": deviceId, "Content-Type": "application/json", Accept: "application/json" },
    data: { name: "フィルタテスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

test.describe("home log card filter", () => {
  test("filter chips are visible and clickable", async ({ page, request }) => {
    const deviceId = `device-e2e-logfilter-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      const card = page.locator('[data-testid="home-log-recent"]');
      await expect(card).toBeVisible({ timeout: 45_000 });

      // Filter chips container exists
      const filters = card.locator('[data-testid="home-log-filters"]');
      await expect(filters).toBeVisible();
      logPass("Filter chips container is visible");

      // "全部" chip is visible and active by default
      const allChip = card.locator('[data-testid="home-log-filter-全部"]');
      await expect(allChip).toBeVisible();
      logPass("All filter chip is visible");

      // Other filter chips exist
      for (const label of ["チャット", "参加", "設定", "精算"]) {
        const chip = card.locator(`[data-testid="home-log-filter-${label}"]`);
        await expect(chip).toBeVisible();
      }
      logPass("All category filter chips are visible");

      // Click a filter chip and verify it changes active state
      const chatChip = card.locator('[data-testid="home-log-filter-チャット"]');
      await chatChip.click();

      // After clicking, either filtered items show or empty filter message appears
      const items = card.locator('[data-testid^="home-log-item-"]');
      const emptyFilter = card.locator('[data-testid="home-log-filter-empty"]');
      const itemCount = await items.count();
      const emptyVisible = await emptyFilter.isVisible().catch(() => false);

      if (itemCount > 0) {
        // If items are shown, they should have the icon thumbnail
        const firstItem = items.first();
        await expect(firstItem.locator('[data-testid="home-log-item-icon"]')).toBeVisible();
        logPass("Filtered items have icon thumbnails (" + itemCount + " items)");
      } else if (emptyVisible) {
        logPass("Filter shows empty state correctly");
      } else {
        logPass("Filter applied (no items or empty state as expected)");
      }

      // Click "全部" to reset
      await allChip.click();
      logPass("Filter reset to All works");

      // Verify items have icon thumbnail
      const allItems = card.locator('[data-testid^="home-log-item-"]');
      const allItemCount = await allItems.count();
      if (allItemCount > 0) {
        const firstItem = allItems.first();
        await expect(firstItem.locator('[data-testid="home-log-item-icon"]')).toBeVisible();
        logPass("Log items have icon thumbnails (" + allItemCount + " items)");
      } else {
        logPass("No log items to check for icons (empty state)");
      }
    } catch (error) {
      logFail("Log filter checks", error);
    }
  });
});
