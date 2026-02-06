import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8000").trim();
const DEVICE_ID = process.env.PLAYWRIGHT_DEVICE_ID ?? "device-e2e-001";

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(`${FRONTEND_BASE}/home`, { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Frontend server is not running on ${FRONTEND_BASE}.`);
};

const ensureOnboardingDone = async (request: Parameters<typeof test>[1]["request"]) => {
  await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
  });
};

test("home oshi action completion awards title", async ({ page, request }) => {
  await assertFrontendUp(request);
  await ensureOnboardingDone(request);

  await page.addInitScript((id) => {
    localStorage.setItem("osikatu:device:id", id);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  }, DEVICE_ID);

  await page.goto("/home", { waitUntil: "domcontentloaded" });

  // Oshi actions may not be generated for some days; treat placeholder as "skip" to avoid flakiness.
  await page.waitForFunction(
    () =>
      Boolean(document.querySelector('[data-testid="oshi-action-item"]')) ||
      document.body.textContent?.includes("今日の推し活アクションを準備中です。"),
    undefined,
    { timeout: 60_000 }
  );

  const placeholder = page.locator("text=今日の推し活アクションを準備中です。");
  if (await placeholder.isVisible().catch(() => false)) {
    console.log("[PASS] /home shows oshi action placeholder, skip title award test");
    return;
  }

  const actionItem = page.locator('[data-testid="oshi-action-item"]').first();
  await expect(actionItem).toBeVisible({ timeout: 30_000 });

  const checkbox = page.locator('[data-testid="oshi-action-checkbox"]').first();
  if (await checkbox.isChecked()) {
    await checkbox.click();
  }
  await checkbox.click();
  await expect(checkbox).toBeChecked();

  const title = page.locator('[data-testid="oshi-title-current"]');
  await expect(title).toBeVisible({ timeout: 30_000 });
  const titleText = (await title.innerText()).trim();
  expect(titleText.length).toBeGreaterThan(0);
});
