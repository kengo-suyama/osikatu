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
    data: { name: "通知テスト推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

test.describe("home notifications card", () => {
  test("notifications card is visible with correct structure", async ({ page, request }) => {
    const deviceId = `device-e2e-notif-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      // Card exists with correct testid
      const card = page.locator('[data-testid="home-notifications-card"]');
      await expect(card).toBeVisible({ timeout: 45_000 });
      logPass("Notifications card is visible");

      // Card has title "お知らせ"
      await expect(card).toContainText("お知らせ");
      logPass("Card has correct title");

      // Panel exists
      const panel = card.locator('[data-testid="home-notifications-panel"]');
      await expect(panel).toBeVisible();
      logPass("Notifications panel is visible");

      // Check empty state or items
      const items = card.locator('[data-testid^="home-notification-item-"]');
      const emptyMsg = card.locator('[data-testid="home-notifications-empty"]');
      const itemCount = await items.count();

      if (itemCount > 0) {
        const firstItem = items.first();
        await expect(firstItem.locator('[data-testid="home-notification-title"]')).toBeVisible();
        await expect(firstItem.locator('[data-testid="home-notification-body"]')).toBeVisible();
        logPass("Notification items have title/body (" + itemCount + " items)");
      } else {
        await expect(emptyMsg).toBeVisible();
        await expect(emptyMsg).toContainText("お知らせはありません");
        logPass("Empty state is shown correctly");
      }

      // "すべて見る" link navigates to /notifications
      const moreLink = card.locator('[data-testid="home-notifications-more"]');
      await expect(moreLink).toBeVisible();
      await moreLink.click();
      await page.waitForURL(/\/notifications/, { timeout: 10_000 });
      logPass("More link navigates to /notifications");
    } catch (error) {
      logFail("Notifications card checks", error);
    }
  });
});
