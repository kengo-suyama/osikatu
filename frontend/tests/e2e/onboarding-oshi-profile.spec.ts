import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const DEVICE_ID = "device-e2e-oshi-onboard-001";

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
};

const attachDiagnostics = (page: Parameters<typeof test>[1]["page"], label: string) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[${label}][console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[${label}][pageerror] ${error.message}`);
  });
};

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

/** Delete all oshis for this device so the gate appears */
const deleteAllOshis = async (request: Parameters<typeof test>[1]["request"]) => {
  try {
    const res = await request.get(`${API_BASE}/api/oshis`, {
      headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
    });
    const body = (await res.json()) as { success?: { data?: { id: number }[] } };
    const items = body?.success?.data ?? [];
    for (const item of items) {
      await request.delete(`${API_BASE}/api/oshis/${item.id}`, {
        headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
      });
    }
  } catch {
    // ignore – no oshis or endpoint issue
  }
};

test.describe("oshi onboarding", () => {
  test("gate appears when no oshis, create oshi, gate disappears, FAB visible", async ({
    page,
    request,
  }) => {
    attachDiagnostics(page, "oshi-onboard");
    await assertFrontendUp(request);
    await ensureOnboardingDone(request);
    await deleteAllOshis(request);

    await page.addInitScript((deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    }, DEVICE_ID);

    // Navigate to home
    await page.goto(`${FRONTEND_BASE}/home`, { waitUntil: "networkidle" });

    // 1. Onboarding gate should be visible
    const gate = page.locator('[data-testid="oshi-onboarding-gate"]');
    await expect(gate).toBeVisible({ timeout: 15000 });
    logPass("Onboarding gate visible when no oshis");

    // 2. Fill in oshi name
    const nameInput = page.locator('[data-testid="oshi-gate-name"]');
    await nameInput.fill("テスト推し");
    logPass("Oshi name filled");

    // 3. Select category
    const categorySelect = page.locator('[data-testid="oshi-gate-category"]');
    await categorySelect.selectOption("キャラ");
    logPass("Category selected");

    // 4. Submit
    const submitButton = page.locator('[data-testid="oshi-gate-submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    logPass("Submit clicked");

    // 5. Gate should disappear after creation
    await expect(gate).not.toBeVisible({ timeout: 15000 });
    logPass("Onboarding gate disappeared after oshi creation");

    // 6. FAB should be visible
    const fab = page.locator('[data-testid="fab-oshi-profile"]');
    await expect(fab).toBeVisible({ timeout: 10000 });
    logPass("FAB oshi-profile visible");

    // 7. Clicking FAB opens profile sheet (force: FAB has infinite bounce animation)
    await fab.click({ force: true });
    const sheetTitle = page.locator("text=推しプロフィール");
    await expect(sheetTitle).toBeVisible({ timeout: 10000 });
    logPass("FAB opens oshi profile sheet");

    // 8. Verify the oshi was created via API
    const apiRes = await request.get(`${API_BASE}/api/oshis`, {
      headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
    });
    const apiBody = (await apiRes.json()) as {
      success?: { data?: { name: string; category: string | null; isPrimary: boolean }[] };
    };
    const oshis = apiBody?.success?.data ?? [];
    expect(oshis.length).toBeGreaterThanOrEqual(1);
    const created = oshis.find((o) => o.name === "テスト推し");
    expect(created).toBeTruthy();
    expect(created?.category).toBe("キャラ");
    expect(created?.isPrimary).toBe(true);
    logPass("API confirms oshi created with category and isPrimary=true");
  });

  test("gate does NOT appear when oshis exist", async ({ page, request }) => {
    attachDiagnostics(page, "oshi-no-gate");
    await assertFrontendUp(request);
    await ensureOnboardingDone(request);

    // Ensure at least one oshi exists
    const listRes = await request.get(`${API_BASE}/api/oshis`, {
      headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
    });
    const listBody = (await listRes.json()) as { success?: { data?: { id: number }[] } };
    if ((listBody?.success?.data ?? []).length === 0) {
      await request.post(`${API_BASE}/api/oshis`, {
        headers: {
          "X-Device-Id": DEVICE_ID,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: JSON.stringify({ name: "既存推し" }),
      });
    }

    await page.addInitScript((deviceId: string) => {
      localStorage.setItem("osikatu:device:id", deviceId);
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    }, DEVICE_ID);

    await page.goto(`${FRONTEND_BASE}/home`, { waitUntil: "networkidle" });

    // Gate should NOT be visible
    const gate = page.locator('[data-testid="oshi-onboarding-gate"]');
    await expect(gate).not.toBeVisible({ timeout: 10000 });
    logPass("Onboarding gate NOT visible when oshis exist");

    // FAB should be visible
    const fab = page.locator('[data-testid="fab-oshi-profile"]');
    await expect(fab).toBeVisible({ timeout: 10000 });
    logPass("FAB visible when oshis exist");
  });
});
