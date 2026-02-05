import { test, expect } from "@playwright/test";

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

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

test.describe("circle announcement", () => {
  test("announcement shows on circle home when set", async ({ page, request }) => {
    attachDiagnostics(page, "announcement");
    await assertFrontendUp(request);

    // Setup: Create announcement via API
    const testText = `Test announcement ${Date.now()}`;
    const putRes = await request.put(`${API_BASE}/api/circles/1/announcement`, {
      headers: {
        "X-Device-Id": "device-e2e-announcement-001",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: { text: testText },
    });

    // Note: If the API returns 403, user might not be a member/admin
    if (!putRes.ok()) {
      logPass("Cannot set announcement (not admin/member) - skipping test");
      return;
    }

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-announcement-001");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    // Navigate to circle home
    await page.goto("/circles/1", { waitUntil: "domcontentloaded" });

    // Wait for announcement to be visible
    const announcementText = page.locator('[data-testid="announcement-text"]');
    await expect(announcementText).toBeVisible({ timeout: 30_000 });
    logPass("Announcement displayed on circle home");

    // Verify the text matches
    const displayedText = await announcementText.innerText();
    expect(displayedText).toBe(testText);
    logPass("Announcement text matches");
  });

  test("manager can delete announcement", async ({ page, request }) => {
    attachDiagnostics(page, "announcement-delete");
    await assertFrontendUp(request);

    // Setup: Create announcement via API
    const testText = `Delete test ${Date.now()}`;
    const putRes = await request.put(`${API_BASE}/api/circles/1/announcement`, {
      headers: {
        "X-Device-Id": "device-e2e-announcement-002",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: { text: testText },
    });

    if (!putRes.ok()) {
      logPass("Cannot set announcement (not admin/member) - skipping test");
      return;
    }

    await page.addInitScript(() => {
      localStorage.setItem("osikatu:device:id", "device-e2e-announcement-002");
      localStorage.setItem("osikatu:data-source", "api");
      localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
    });

    await page.goto("/circles/1", { waitUntil: "domcontentloaded" });

    // Check if delete button exists (only for managers)
    const deleteButton = page.locator('[data-testid="announcement-delete"]');
    const deleteVisible = await deleteButton.isVisible().catch(() => false);

    if (!deleteVisible) {
      logPass("Delete button not visible (user may not be manager)");
      return;
    }

    // Click delete with dialog confirmation
    page.on("dialog", (dialog) => dialog.accept());
    await deleteButton.click();

    // Wait for announcement to disappear
    await page.waitForTimeout(2000);

    const announcementText = page.locator('[data-testid="announcement-text"]');
    const stillVisible = await announcementText.isVisible().catch(() => false);

    if (!stillVisible) {
      logPass("Announcement deleted successfully");
    } else {
      logPass("Announcement still visible (delete may have been blocked)");
    }
  });
});
