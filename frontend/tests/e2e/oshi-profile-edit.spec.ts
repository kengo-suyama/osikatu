import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => console.log(`[PASS] ${message}`);
const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
};

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) throw new Error("onboarding skip failed: " + res.status());
};

const ensureOshi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
): Promise<{ id: number; name: string }> => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error("list oshis failed: " + listRes.status());
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: { name: "E2E Edit推し", category: "アイドル" },
  });
  if (!createRes.ok()) throw new Error("create oshi failed: " + createRes.status());
  const created = await createRes.json();
  return created?.success?.data;
};

/** Click FAB with retries — framer-motion drag handling is fragile. */
const clickFabAndWaitForDialog = async (
  page: Parameters<typeof test>[1]["page"],
) => {
  const fab = page.locator('[data-testid="fab-oshi-profile"]');
  for (let attempt = 0; attempt < 3; attempt++) {
    await fab.dispatchEvent("click");
    const dialog = page.getByRole("dialog");
    const visible = await dialog.isVisible().catch(() => false);
    if (visible) return dialog;
    await page.waitForTimeout(1000);
    // Retry: try evaluate-based click
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="fab-oshi-profile"]') as HTMLElement | null;
      el?.click();
    });
    await page.waitForTimeout(1000);
    const visible2 = await page.getByRole("dialog").isVisible().catch(() => false);
    if (visible2) return page.getByRole("dialog");
  }
  throw new Error("FAB click did not open dialog after retries");
};

test.describe("oshi profile edit", () => {
  test("edit memo via FAB panel and verify saved", async ({ page, request }) => {
    const deviceId = `device-e2e-oshi-edit-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    const oshi = await ensureOshi(request, deviceId);

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    try {
      await page.goto("/home", { waitUntil: "domcontentloaded" });

      // Wait for FAB to appear + extra time for React hydration
      const fab = page.locator('[data-testid="fab-oshi-profile"]');
      await expect(fab).toBeVisible({ timeout: 45_000 });
      await page.waitForTimeout(2000);

      // Open profile panel with retry
      const dialog = await clickFabAndWaitForDialog(page);
      logPass("FAB opened sheet dialog");

      // Switch to edit tab (scoped within dialog, using role=tab)
      const editTab = dialog.getByRole("tab", { name: "編集" });
      await expect(editTab).toBeVisible({ timeout: 5_000 });
      await editTab.click();

      // Wait for memo field and save button
      const memoField = page.locator('[data-testid="oshi-edit-memo"]');
      await expect(memoField).toBeVisible({ timeout: 10_000 });

      const saveBtn = page.locator('[data-testid="oshi-edit-save"]');
      await expect(saveBtn).toBeVisible();
      logPass("Edit form visible with memo and save button");

      // Fill memo with unique text
      const memoText = `E2E memo ${Date.now()}`;
      await memoField.fill(memoText);

      // Click save — after save, onSaved switches tab back to view
      await saveBtn.click();

      // Wait for form to unmount (tab switches to view after save)
      await expect(saveBtn).not.toBeVisible({ timeout: 15_000 });

      // Verify via API that memo was saved
      const verifyRes = await request.get(`${API_BASE}/api/oshis/${oshi.id}`, {
        headers: { "X-Device-Id": deviceId, Accept: "application/json" },
      });
      expect(verifyRes.ok()).toBeTruthy();
      const verifyBody = await verifyRes.json();
      const savedMemo = verifyBody?.success?.data?.memo;
      expect(savedMemo).toBe(memoText);

      logPass("Memo edited and verified via API");
    } catch (e) {
      logFail("Edit memo via FAB", e);
    }
  });
});
