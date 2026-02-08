import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Click a locator safely, retrying with force:true if the first attempt fails.
 * Handles framer-motion and other animation-related click blocking.
 */
export async function safeClick(
  locator: Locator,
  options?: { timeout?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 10_000;
  try {
    await locator.click({ timeout });
  } catch {
    await locator.click({ force: true, timeout });
  }
}

/**
 * Wait for a toast message containing the given text to appear.
 * Returns the matching locator.
 */
export async function waitForToast(
  page: Page,
  text: string,
  options?: { timeout?: number },
): Promise<Locator> {
  const timeout = options?.timeout ?? 10_000;
  const toast = page.locator(`text=${text}`);
  await expect(toast).toBeVisible({ timeout });
  return toast;
}

/**
 * Click an element by data-testid and wait for a dialog to appear.
 * Retries with dispatchEvent and evaluate fallback for framer-motion.
 */
export async function openDialogByTestId(
  page: Page,
  testid: string,
  options?: { timeout?: number },
): Promise<Locator> {
  const timeout = options?.timeout ?? 15_000;
  const trigger = page.locator(`[data-testid="${testid}"]`);
  await expect(trigger).toBeVisible({ timeout });

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await trigger.click({ timeout: 3_000 });
    } catch {
      await trigger.dispatchEvent("click");
    }

    const dialog = page.getByRole("dialog");
    try {
      await expect(dialog).toBeVisible({ timeout: 5_000 });
      return dialog;
    } catch {
      // Fallback: JS-level click
      await page.evaluate((tid) => {
        const el = document.querySelector(
          `[data-testid="${tid}"]`,
        ) as HTMLElement | null;
        el?.click();
      }, testid);
      await page.waitForTimeout(1_000);
      if (await dialog.isVisible().catch(() => false)) {
        return dialog;
      }
    }
  }
  throw new Error(
    `Dialog did not open after clicking [data-testid="${testid}"]`,
  );
}

/**
 * Wait for the page to be ready: a specific testid element is visible.
 * Useful as a guard before further interactions.
 */
export async function waitForPageReady(
  page: Page,
  testid: string,
  options?: { timeout?: number },
): Promise<Locator> {
  const timeout = options?.timeout ?? 30_000;
  const element = page.locator(`[data-testid="${testid}"]`);
  await expect(element).toBeVisible({ timeout });
  return element;
}

/**
 * Assert that a locator is visible and has a stable bounding box
 * (no layout shift within stabilityMs).
 */
export async function expectVisibleStable(
  locator: Locator,
  options?: { timeout?: number; stabilityMs?: number },
): Promise<void> {
  const timeout = options?.timeout ?? 15_000;
  const stabilityMs = options?.stabilityMs ?? 300;

  await expect(locator).toBeVisible({ timeout });

  const box1 = await locator.boundingBox();
  await locator.page().waitForTimeout(stabilityMs);
  const box2 = await locator.boundingBox();

  if (box1 && box2) {
    const dx = Math.abs(box1.x - box2.x);
    const dy = Math.abs(box1.y - box2.y);
    if (dx > 2 || dy > 2) {
      throw new Error(
        `Element not stable: shifted by (${dx}, ${dy})px in ${stabilityMs}ms`,
      );
    }
  }
}
