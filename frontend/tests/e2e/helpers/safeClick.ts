import type { Locator } from "@playwright/test";

/**
 * Safe click that waits for the element to be stable before clicking.
 * In chaos mode (E2E_CHAOS=1), always uses force click to handle
 * animated elements.
 */
export async function safeClick(locator: Locator): Promise<void> {
  const isChaos = process.env.E2E_CHAOS === "1";
  if (isChaos) {
    await locator.click({ force: true });
  } else {
    await locator.click();
  }
}
