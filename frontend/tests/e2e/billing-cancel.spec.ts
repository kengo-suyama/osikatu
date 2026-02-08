import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
};

const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
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

test.describe("billing cancel flow", () => {
  test("cancel plan sets user to free", async ({ page, request }) => {
    attachDiagnostics(page, "billing-cancel");
    await assertFrontendUp(request);

    const deviceId = `device-e2e-billing-${Date.now()}-${process.pid}-${Math.floor(Math.random() * 1000)}`;

    // Setup: Set user plan to plus first via API
    let setupRes: Awaited<ReturnType<typeof request.put>> | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        setupRes = await request.put(`${API_BASE}/api/me/plan`, {
          headers: {
            "X-Device-Id": deviceId,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          data: { plan: "plus" },
          timeout: 30_000,
        });
        if (setupRes.ok()) break;
      } catch {
        // retry
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!setupRes) throw new Error("Setup: request.put(/api/me/plan) did not return a response");
    expect(setupRes.ok()).toBeTruthy();

    // Verify setup
    const checkRes = await request.get(`${API_BASE}/api/me/plan`, {
      headers: {
        "X-Device-Id": deviceId,
        Accept: "application/json",
      },
      timeout: 30_000,
    });
    const checkData = await checkRes.json();
    expect(checkData.success?.data?.plan).toBe("plus");
    logPass("Setup: user plan set to plus");

    // Cancel the plan
    const cancelRes = await request.post(`${API_BASE}/api/me/cancel`, {
      headers: {
        "X-Device-Id": deviceId,
        Accept: "application/json",
      },
      timeout: 30_000,
    });
    expect(cancelRes.ok()).toBeTruthy();
    const cancelData = await cancelRes.json();
    expect(cancelData.success?.data?.plan).toBe("free");
    expect(cancelData.success?.data?.planStatus).toBe("canceled");
    logPass("Cancel: plan changed to free with canceled status");

    // Verify quotas and features are returned
    const verifyRes = await request.get(`${API_BASE}/api/me/plan`, {
      headers: {
        "X-Device-Id": deviceId,
        Accept: "application/json",
      },
      timeout: 30_000,
    });
    const verifyData = await verifyRes.json();
    const data = verifyData.success?.data;

    expect(data?.plan).toBe("free");
    expect(data?.quotas).toBeDefined();
    expect(data?.features).toBeDefined();
    expect(data?.quotas?.oshiMax).toBe(10);
    expect(data?.quotas?.scheduleMax).toBe(10);
    expect(data?.quotas?.albumMax).toBe(50);
    expect(data?.features?.adsEnabled).toBe(true);
    logPass("Verify: quotas and features returned correctly for free plan");
  });

  test("ads banner shows for free user when enabled", async ({ page, request }) => {
    attachDiagnostics(page, "ads-banner");
    await assertFrontendUp(request);

    // Ensure user is free
    await request.post(`${API_BASE}/api/me/cancel`, {
      headers: {
        "X-Device-Id": "device-e2e-ads-001",
        Accept: "application/json",
      },
    });

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-ads-001");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
      localStorage.setItem(
        "osikatu:me",
        JSON.stringify({ plan: "free", effectivePlan: "free" })
      );
    });

    await page.goto("/home", { waitUntil: "domcontentloaded" });

    // Note: Ad banner visibility depends on NEXT_PUBLIC_ADS_ENABLED
    // In E2E env, this should typically be "0" to avoid flaky tests
    // This test verifies the component renders when conditions are met
    const adBanner = page.locator('[data-testid="ad-banner"]');
    const adsEnabled = process.env.NEXT_PUBLIC_ADS_ENABLED === "1";

    if (adsEnabled) {
      await expect(adBanner).toBeVisible({ timeout: 10_000 });
      logPass("Ad banner visible for free user (ads enabled)");
    } else {
      // When ads are disabled, banner should not be visible
      const count = await adBanner.count();
      expect(count).toBe(0);
      logPass("Ad banner hidden (ads disabled in E2E)");
    }
  });
});
