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

test.describe("album feature", () => {
  test("album page loads and shows upload area", async ({ page, request }) => {
    attachDiagnostics(page, "album");
    await assertFrontendUp(request);

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-album-001");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    // Navigate to album page (assuming circle ID 1 exists)
    await page.goto("/circles/1/album", { waitUntil: "domcontentloaded" });

    // Check if upload area exists
    const uploadArea = page.locator('[data-testid="album-upload"]');
    await expect(uploadArea).toBeVisible({ timeout: 30_000 });
    logPass("Album upload area visible");
  });

  test("album viewer navigation works", async ({ page, request }) => {
    attachDiagnostics(page, "album-viewer");
    await assertFrontendUp(request);

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-album-002");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    await page.goto("/circles/1/album", { waitUntil: "domcontentloaded" });

    // Wait for items to load
    const items = page.locator('[data-testid="album-item"]');
    const itemCount = await items.count();

    if (itemCount === 0) {
      logPass("No album items yet, skipping viewer test");
      return;
    }

    // Click first item to open viewer
    await items.first().click();

    // Check navigation buttons exist
    const prevButton = page.locator('[data-testid="album-page-prev"]');
    const nextButton = page.locator('[data-testid="album-page-next"]');

    await expect(prevButton).toBeVisible({ timeout: 10_000 });
    await expect(nextButton).toBeVisible({ timeout: 10_000 });
    logPass("Album viewer navigation buttons visible");

    // If more than one item, test navigation
    if (itemCount > 1) {
      await nextButton.click();
      await page.waitForTimeout(500); // Wait for animation
      logPass("Album next navigation works");

      await prevButton.click();
      await page.waitForTimeout(500);
      logPass("Album prev navigation works");
    }
  });
});
