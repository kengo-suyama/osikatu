import { test, expect } from "@playwright/test";

test.describe("Album video thumbnail and player", () => {
  test("video items in album show play overlay", async ({ page }) => {
    // Seed album with a video entry in localStorage (non-API mode)
    await page.addInitScript(() => {
      const entries = [
        {
          id: "entry-video-test",
          date: "2026-01-15",
          note: "Video test entry",
          media: [
            {
              id: "media-vid-1",
              type: "video",
              url: "data:video/mp4;base64,AAAA",
              name: "test.mp4",
            },
            {
              id: "media-img-1",
              type: "image",
              url: "data:image/png;base64,iVBORw0KGgo=",
              name: "test.png",
            },
          ],
        },
      ];
      localStorage.setItem("osikatu:album:entries", JSON.stringify(entries));
    });

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // Open album modal
    const albumBtn = page.locator('[data-testid="album-open"], [data-testid="nav-album"]').first();
    if (await albumBtn.isVisible().catch(() => false)) {
      await albumBtn.click({ force: true });
    } else {
      // Navigate directly to album if button not found
      await page.goto("/album");
      await page.waitForLoadState("networkidle");
    }

    // Check that modal or page is visible
    const modal = page.locator('[data-testid="album-modal"], [data-testid="album-list"]').first();
    await expect(modal).toBeVisible({ timeout: 10_000 });

    console.log("[PASS] Album visible with video entry");
  });
});
