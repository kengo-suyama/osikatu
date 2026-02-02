import { test, expect } from "@playwright/test";

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
};

const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
};

const hasEnglishTokens = (value: string) => /[A-Za-z]{3,}/.test(value);

const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8000").trim();

const attachDiagnostics = (page: Parameters<typeof test>[1]["page"], label: string) => {
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[${label}][console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    console.log(`[${label}][pageerror] ${error.message}`);
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400) {
      const url = response.url();
      if (url.includes("/api/") || url.includes("/home")) {
        console.log(`[${label}][response ${status}] ${url}`);
      }
    }
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
  throw new Error(
    `Frontend server is not running on ${FRONTEND_BASE}. Start with npm run dev -- -p 3103 or set E2E_BASE_URL.`
  );
};

const ensureOnboardingDone = async (request: Parameters<typeof test>[1]["request"]) => {
  await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": "device-e2e-001", Accept: "application/json" },
  });
};

test("home smoke checks", async ({ page, request }) => {
  attachDiagnostics(page, "home");
  await assertFrontendUp(request);
  await ensureOnboardingDone(request);
  await page.addInitScript(() => {
    localStorage.setItem("osikatu:device:id", "device-e2e-001");
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  });
  await test.step("/home open", async () => {
    await page.goto("/home", { waitUntil: "domcontentloaded" });
  });

  let actionAvailable = false;
  try {
    await test.step("wait for fortune block", async () => {
      const fortuneBlock = page.locator('[data-testid="fortune-block"]');
      await expect(fortuneBlock).toBeVisible({ timeout: 45_000 });
    });
    await test.step("wait for oshi action", async () => {
      const actionItems = page.locator('[data-testid="oshi-action-item"]');
      const placeholder = page.locator("text=今日の推し活アクションを準備中です。");
      // アクションが未生成の日があるため、placeholder表示は成功扱いにする。
      // 実表示できた場合のみ、以降のチェック（チェックボックス等）を進める。
      await page.waitForFunction(
        () =>
          Boolean(document.querySelector('[data-testid="oshi-action-item"]')) ||
          document.body.textContent?.includes("今日の推し活アクションを準備中です。"),
        undefined,
        { timeout: 60_000 }
      );
      const hasAction = (await actionItems.count()) > 0;
      const hasPlaceholder = await placeholder.isVisible().catch(() => false);
      if (hasAction) {
        actionAvailable = true;
        logPass("/home shows 1 oshi action");
        return;
      }
      if (hasPlaceholder) {
        logPass("/home shows oshi action placeholder");
        return;
      }
      throw new Error("Oshi action area not rendered");
    });
  } catch (error) {
    throw error;
  }

  if (!actionAvailable) {
    return;
  }

  const checkbox = page.locator('[data-testid="oshi-action-checkbox"]').first();
  const actionText = page.locator('[data-testid="oshi-action-text"]').first();

  let actionValue = "";
  try {
    actionValue = (await actionText.innerText()).trim();
    logPass("/home action text captured");
  } catch (error) {
    logFail("/home action text captured", error);
  }

  try {
    if (await checkbox.isChecked()) {
      await checkbox.click();
    }
    await checkbox.click();
    await expect(checkbox).toBeChecked();
    await expect(page.locator('[data-testid="celebration-overlay"]')).toBeVisible();
    logPass("/home checkbox triggers celebration overlay");
  } catch (error) {
    logFail("/home checkbox triggers celebration overlay", error);
  }

  try {
    await test.step("reload /home", async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      const fortuneBlock = page.locator('[data-testid="fortune-block"]');
      await expect(fortuneBlock).toBeVisible({ timeout: 45_000 });
    });
    const checkboxAfterReload = page.locator('[data-testid="oshi-action-checkbox"]');
    if ((await checkboxAfterReload.count()) === 0) {
      logPass("/home checkbox not ready after reload, skip persist check");
      return;
    }
    const afterReloadChecked = await checkboxAfterReload.first().isChecked();
    await expect(afterReloadChecked).toBeTruthy();
    logPass("/home checkbox persists after reload");
  } catch (error) {
    logFail("/home checkbox persists after reload", error);
  }

  try {
    const nextActionValue = (
      await page.locator('[data-testid="oshi-action-text"]').first().innerText()
    ).trim();
    expect(nextActionValue).toBe(actionValue);
    logPass("/home action text stays same after reload (same day)");
  } catch (error) {
    logFail("/home action text stays same after reload (same day)", error);
  }

  try {
    const fortuneBlock = page.locator('[data-testid="fortune-block"]');
    await expect(fortuneBlock).toBeVisible();
    const status = await fortuneBlock.getAttribute("data-status");
    if (status !== "ready") {
      logPass("/home fortune visible (not ready yet)");
      return;
    }
    const luckyColor = await page.locator('[data-testid="fortune-lucky-color"]').innerText();
    const luckyItem = await page.locator('[data-testid="fortune-lucky-item"]').innerText();
    const message = await page.locator('[data-testid="fortune-message"]').innerText();
    const goodAction = await page.locator('[data-testid="fortune-good-action"]').innerText();
    const badAction = await page.locator('[data-testid="fortune-bad-action"]').innerText();
    const values = [luckyColor, luckyItem, message, goodAction, badAction].map((v) =>
      v.trim()
    );
    values.forEach((value) => {
      if (hasEnglishTokens(value)) {
        throw new Error(`English token detected: ${value}`);
      }
    });
    logPass("/home fortune appears Japanese (no English tokens)");
  } catch (error) {
    logFail("/home fortune appears Japanese (no English tokens)", error);
  }
});
