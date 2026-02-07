import { test, expect } from "@playwright/test";
import { resolve } from "path";

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
    data: { name: "E2E Diary Oshi", category: "idol" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

test.describe("log diary create", () => {
  test("form elements are visible with testids", async ({ page, request }) => {
    const deviceId = `device-e2e-diary-form-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/log", { waitUntil: "domcontentloaded" });

      const form = page.locator('[data-testid="log-create-form"]');
      await expect(form).toBeVisible({ timeout: 45_000 });

      await expect(page.locator('[data-testid="log-create-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="log-create-body"]')).toBeVisible();
      await expect(page.locator('[data-testid="log-create-tags"]')).toBeVisible();
      await expect(page.locator('[data-testid="log-create-images"]')).toBeVisible();
      await expect(page.locator('[data-testid="log-create-submit"]')).toBeVisible();

      logPass("All form elements visible with testids");
    } catch (e) {
      logFail("Form elements visible", e);
    }
  });

  test("create diary with title and content", async ({ page, request }) => {
    const deviceId = `device-e2e-diary-create-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/log", { waitUntil: "domcontentloaded" });

      const form = page.locator('[data-testid="log-create-form"]');
      await expect(form).toBeVisible({ timeout: 45_000 });

      // Wait for oshi loading to complete (button becomes enabled)
      const submitBtn = page.locator('[data-testid="log-create-submit"]');
      await expect(submitBtn).toBeEnabled({ timeout: 30_000 });

      // Fill form
      await page.locator('[data-testid="log-create-title"]').fill("E2E Test Diary");
      await page.locator('[data-testid="log-create-body"]').fill("Created by E2E test");
      await submitBtn.click();

      // Wait for card to appear
      const card = page.locator('[data-testid="log-diary-card"]').first();
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card).toContainText("E2E Test Diary");

      logPass("Diary created and visible in list");
    } catch (e) {
      logFail("Create diary", e);
    }
  });

  test("create diary with tags shows tag chips", async ({ page, request }) => {
    const deviceId = `device-e2e-diary-tags-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/log", { waitUntil: "domcontentloaded" });

      const form = page.locator('[data-testid="log-create-form"]');
      await expect(form).toBeVisible({ timeout: 45_000 });

      // Wait for oshi loading to complete (button becomes enabled)
      const submitBtn = page.locator('[data-testid="log-create-submit"]');
      await expect(submitBtn).toBeEnabled({ timeout: 30_000 });

      // Fill form with tags
      await page.locator('[data-testid="log-create-title"]').fill("Tagged Diary");
      await page.locator('[data-testid="log-create-body"]').fill("Has tags");
      await page.locator('[data-testid="log-create-tags"]').fill("#live #travel");
      await submitBtn.click();

      // Wait for card with tags
      const card = page.locator('[data-testid="log-diary-card"]').first();
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card).toContainText("Tagged Diary");

      const tagsEl = card.locator('[data-testid="log-diary-tags"]');
      await expect(tagsEl).toBeVisible({ timeout: 5_000 });
      await expect(tagsEl).toContainText("#live");
      await expect(tagsEl).toContainText("#travel");

      logPass("Diary with tags created and tags visible");
    } catch (e) {
      logFail("Create diary with tags", e);
    }
  });
});
