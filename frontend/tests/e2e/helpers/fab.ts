import type { Page, Locator } from "@playwright/test";

/**
 * Click the oshi profile FAB and wait for the sheet dialog to open.
 * Uses dispatchEvent + evaluate fallback with retry to handle
 * framer-motion drag handlers that can block normal clicks.
 */
export async function clickFabAndWaitForDialog(
  page: Page,
  testid = "fab-oshi-profile",
): Promise<Locator> {
  const fab = page.locator(`[data-testid="${testid}"]`);
  for (let attempt = 0; attempt < 3; attempt++) {
    await fab.dispatchEvent("click");
    const dialog = page.getByRole("dialog");
    const visible = await dialog.isVisible().catch(() => false);
    if (visible) return dialog;
    await page.waitForTimeout(1000);
    // Retry: evaluate-based click
    await page.evaluate((tid) => {
      const el = document.querySelector(`[data-testid="${tid}"]`) as HTMLElement | null;
      el?.click();
    }, testid);
    await page.waitForTimeout(1000);
    const visible2 = await page.getByRole("dialog").isVisible().catch(() => false);
    if (visible2) return page.getByRole("dialog");
  }
  throw new Error("FAB click did not open dialog after retries");
}
