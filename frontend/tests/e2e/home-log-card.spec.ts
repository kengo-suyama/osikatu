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
    data: { name: "ログテスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

test.describe("home log card (recent activities)", () => {
  test("log card is visible with correct structure", async ({ page, request }) => {
    const deviceId = `device-e2e-logcard-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      // Card exists with correct testid
      const card = page.locator('[data-testid="home-log-recent"]');
      await expect(card).toBeVisible({ timeout: 45_000 });
      logPass("Log card is visible with data-testid");

      // Card has title "最近の活動"
      await expect(card).toContainText("最近の活動");
      logPass("Card has correct title");

      // Check empty state or items
      const items = card.locator('[data-testid^="home-log-item-"]');
      const emptyMsg = card.locator("text=まだ活動がありません");
      const itemCount = await items.count();

      if (itemCount > 0) {
        // Items have category badge and title
        const firstItem = items.first();
        await expect(firstItem.locator('[data-testid="home-log-item-category"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="home-log-item-title"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="home-log-item-date"]')).toBeVisible();
        logPass("Log items have category/title/date testids (" + itemCount + " items)");
      } else {
        await expect(emptyMsg).toBeVisible();
        logPass("Empty state is shown correctly");
      }

      // "もっと見る" link navigates to /logs
      const moreLink = page.locator('[data-testid="home-log-more"]');
      await expect(moreLink).toBeVisible();
      await expect(moreLink).toContainText("もっと見る");
      await moreLink.click();
      await page.waitForURL(/\/logs/, { timeout: 10_000 });
      logPass("More link navigates to /logs");
    } catch (error) {
      logFail("Log card checks", error);
    }
  });
});
