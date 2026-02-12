import { test, expect } from "@playwright/test";
import { promises as fs } from "fs";

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
): Promise<{ id: number; name: string }> => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error(`list oshis failed: ${listRes.status()}`);
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: { name: "E2E Log Oshi", category: "idol" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

const createDiaryViaApi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
  oshiId: number,
  data: { title: string; content: string; tags?: string[] }
) => {
  const payload: Record<string, unknown> = {
    oshi_id: oshiId,
    title: data.title,
    content: data.content,
    diary_date: new Date().toISOString().slice(0, 10),
  };
  if (data.tags) payload.tags = data.tags;

  const res = await request.post(`${API_BASE}/api/me/diaries`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: payload,
  });
  if (!res.ok()) throw new Error(`create diary failed: ${res.status()}`);
  const body = await res.json();
  return body?.success?.data;
};

const writeTinyPng = async (outPath: string) => {
  // 1x1 PNG (transparent)
  const base64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAI/6UO4AAAAASUVORK5CYII=";
  await fs.writeFile(outPath, Buffer.from(base64, "base64"));
};

test.describe("log features: photos + tags + search filters", () => {
  test("photo upload works and hasPhoto filter shows only diaries with photos", async (
    { page, request },
    testInfo
  ) => {
    const deviceId = `device-e2e-log-photos-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    const oshi = await ensureOshi(request, deviceId);

    const noPhotoTitle = `No Photo ${Date.now()}`;
    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: noPhotoTitle,
      content: "No attachments",
    });

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/log", { waitUntil: "domcontentloaded" });

      const cards = page.locator('[data-testid="log-diary-card"][data-diary-id]');
      await expect(cards.first()).toBeVisible({ timeout: 30_000 });
      await expect(cards.filter({ hasText: noPhotoTitle }).first()).toBeVisible({
        timeout: 15_000,
      });

      const photoPath = testInfo.outputPath("tiny.png");
      await writeTinyPng(photoPath);

      const withPhotoTitle = `With Photo ${Date.now()}`;
      await page.locator('[data-testid="log-create-title"]').fill(withPhotoTitle);
      await page.locator('[data-testid="log-create-body"]').fill("Has photo");
      await page.locator('[data-testid="log-create-tags"]').fill("#photo #live");

      await page.locator('[data-testid="diary-photo-upload"]').setInputFiles(photoPath);

      const submitBtn = page.locator('[data-testid="log-create-submit"]');
      await expect(submitBtn).toBeEnabled({ timeout: 30_000 });

      const createRes = page.waitForResponse((res) => {
        return (
          res.url().includes("/api/me/diaries") &&
          res.request().method() === "POST" &&
          res.status() === 201
        );
      });
      await submitBtn.click();
      await createRes;

      const withPhotoCard = cards.filter({ hasText: withPhotoTitle }).first();
      await expect(withPhotoCard).toBeVisible({ timeout: 20_000 });
      await expect(withPhotoCard.locator('[data-testid="log-diary-images"]')).toBeVisible({
        timeout: 10_000,
      });
      logPass("Photo diary created and shows images");

      // hasPhoto filter
      const hasPhotoSwitch = page.locator('[data-testid="log-filter-hasphoto"]');
      await expect(hasPhotoSwitch).toBeVisible({ timeout: 5_000 });
      await hasPhotoSwitch.click();

      await expect(cards.filter({ hasText: noPhotoTitle })).toHaveCount(0, { timeout: 15_000 });
      await expect(withPhotoCard).toBeVisible({ timeout: 10_000 });
      logPass("hasPhoto filter shows only photo diary");

      // Tag filter still works on the filtered list
      const photoChip = page.locator(
        '[data-testid="log-tag-filter-chip"][data-tag="photo"]'
      );
      await expect(photoChip).toBeVisible({ timeout: 5_000 });
      await photoChip.click();
      await expect(cards.filter({ hasText: noPhotoTitle })).toHaveCount(0, { timeout: 10_000 });
      await expect(cards.filter({ hasText: withPhotoTitle }).first()).toBeVisible({
        timeout: 10_000,
      });
      logPass("Tag filter works with hasPhoto filter");

      // Search works with tag + hasPhoto filters
      const searchInput = page.locator('[data-testid="log-search-input"]');
      await expect(searchInput).toBeVisible({ timeout: 5_000 });
      await searchInput.fill("No Photo");
      await expect(cards).toHaveCount(0, { timeout: 15_000 });
      await expect(page.locator("text=条件に一致するログがありません")).toBeVisible({
        timeout: 15_000,
      });

      const activeFilters = page.locator('[data-testid="log-filter-active"]');
      await expect(activeFilters).toBeVisible({ timeout: 5_000 });
      await expect(activeFilters).toContainText(/No Photo/i);
      await expect(activeFilters).toContainText(/#photo/i);
      await expect(activeFilters).toContainText(/写真あり/);

      // Clear all filters and confirm list returns
      await page.locator('[data-testid="log-filter-clear-all"]').click();
      await expect(cards.filter({ hasText: noPhotoTitle }).first()).toBeVisible({ timeout: 15_000 });
      await expect(cards.filter({ hasText: withPhotoTitle }).first()).toBeVisible({
        timeout: 15_000,
      });
      logPass("Search + tag + hasPhoto filters show active summary, then clear restores list");
    } catch (e) {
      logFail("Photo upload + hasPhoto filter", e);
    }
  });
});
