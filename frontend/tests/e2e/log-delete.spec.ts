import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8000").trim();
const FRONTEND_BASE = (process.env.E2E_BASE_URL ?? "http://localhost:3000").trim();
const DEVICE_ID = process.env.PLAYWRIGHT_DEVICE_ID ?? "device-e2e-001";

const logPass = (message: string) => {
  console.log(`[PASS] ${message}`);
};

const logFail = (message: string, error: unknown) => {
  console.log(`[FAIL] ${message}`);
  throw error instanceof Error ? error : new Error(String(error));
};

const stripBom = (value: string) => value.replace(/^\uFEFF/, "");

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
      if (url.includes("/api/")) {
        console.log(`[${label}][response ${status}] ${url}`);
      }
    }
  });
};

const getLocalDateString = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
};

const assertFrontendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 30;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(`${FRONTEND_BASE}/log`, { timeout: 3000 });
      if (res.status() >= 200) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(
    `Frontend server is not running on ${FRONTEND_BASE}. Start with npm run dev -- -p 3100 or set E2E_BASE_URL.`
  );
};

const assertBackendUp = async (request: Parameters<typeof test>[1]["request"]) => {
  const attempts = 5;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await request.get(`${API_BASE}/api/oshis`, { timeout: 3000 });
      if (res.status() >= 200 && res.status() < 500) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  throw new Error(
    `Backend server is not running on ${API_BASE}. Start with php artisan serve --host=127.0.0.1 --port=8001 or set PLAYWRIGHT_API_BASE.`
  );
};

async function ensureOshiId(request: Parameters<typeof test>[1]["request"]): Promise<number> {
  const list = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
  });
  if (!list.ok()) {
    throw new Error(`Failed to list oshis: ${list.status()}`);
  }
  const listText = stripBom(await list.text());
  const listJson = JSON.parse(listText) as { success?: { data?: Array<{ id: number }> } };
  const existing = listJson.success?.data?.[0];
  if (existing?.id) return existing.id;

  const create = await request.post(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
    data: { name: "E2E Oshi" },
  });
  if (!create.ok()) {
    throw new Error(`Failed to create oshi: ${create.status()}`);
  }
  const createText = stripBom(await create.text());
  const createJson = JSON.parse(createText) as { success?: { data?: { id?: number } } };
  const id = createJson.success?.data?.id;
  if (!id) throw new Error("No oshi id in response");
  return id;
}

async function createDiary(
  request: Parameters<typeof test>[1]["request"],
  oshiId: number
): Promise<{ id: number; title: string; diaryDate: string }> {
  const title = `E2E delete ${Date.now()}`;
  const diaryDate = getLocalDateString();
  const res = await request.post(`${API_BASE}/api/me/diaries`, {
    headers: {
      "X-Device-Id": DEVICE_ID,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    data: {
      oshiId,
      title,
      content: "E2E content",
      diaryDate,
    },
  });
  if (!res.ok()) {
    throw new Error(`Failed to create diary: ${res.status()}`);
  }
  const text = stripBom(await res.text());
  const json = JSON.parse(text) as { success?: { data?: { id?: number } } };
  const id = json.success?.data?.id;
  if (!id) throw new Error("No diary id in response");
  return { id, title, diaryDate };
}

async function waitForDiaryVisibleInApi(
  request: Parameters<typeof test>[1]["request"],
  diaryId: number
) {
  const attempts = 10;
  for (let i = 0; i < attempts; i += 1) {
    const res = await request.get(`${API_BASE}/api/me/diaries`, {
      headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
    });
    if (res.ok()) {
      const text = stripBom(await res.text());
      const json = JSON.parse(text) as { success?: { data?: Array<{ id: number }> } };
      const exists = json.success?.data?.some((item) => item.id === diaryId);
      if (exists) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  throw new Error("Diary not visible in API list after retries");
}

async function ensureOnboardingDone(request: Parameters<typeof test>[1]["request"]) {
  await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": DEVICE_ID, Accept: "application/json" },
  });
}

test("log delete flow and 404 handling", async ({ page, context, request }) => {
  attachDiagnostics(page, "log-A");
  await assertFrontendUp(request);
  await assertBackendUp(request);
  await ensureOnboardingDone(request);
  const oshiId = await ensureOshiId(request);
  const diary = await createDiary(request, oshiId);
  await waitForDiaryVisibleInApi(request, diary.id);

  const pageB = await context.newPage();
  attachDiagnostics(pageB, "log-B");
  await page.addInitScript((id) => {
    localStorage.setItem("osikatu:device:id", id);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  }, DEVICE_ID);
  await pageB.addInitScript((id) => {
    localStorage.setItem("osikatu:device:id", id);
    localStorage.setItem("osikatu:data-source", "api");
    localStorage.setItem("osikatu:api-base-url", "http://127.0.0.1:8001");
  }, DEVICE_ID);
  const logUrl = `/log?date=${encodeURIComponent(diary.diaryDate)}`;
  await test.step("open /log with date", async () => {
    await page.goto(logUrl, { waitUntil: "domcontentloaded" });
    await pageB.goto(logUrl, { waitUntil: "domcontentloaded" });
  });

  try {
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="log-mode"]');
      return el?.getAttribute("data-mode") === "api";
    });
    await page.waitForResponse(
      (response) => response.url().includes("/api/me/diaries") && response.ok(),
      { timeout: 60_000 }
    );
    const deleteButton = page.locator(
      `[data-testid="diary-delete"][data-diary-id="${diary.id}"]`
    );
    await expect(deleteButton).toBeVisible();
    logPass("/log shows trash icon");
  } catch (error) {
    const titles = await page.locator("div.text-sm.font-semibold").allInnerTexts();
    console.log(`[log-A][debug] visible titles: ${titles.slice(0, 5).join(" | ")}`);
    logFail("/log shows trash icon", error);
  }

  try {
    page.once("dialog", (dialog) => dialog.accept());
    const deleteButton = page.locator(
      `[data-testid="diary-delete"][data-diary-id="${diary.id}"]`
    );
    const deleteResponse = page.waitForResponse((response) => {
      return response.url().includes(`/api/me/diaries/${diary.id}`);
    });
    await deleteButton.click();
    const response = await deleteResponse;
    if (!response.ok()) {
      throw new Error(`Delete diary failed: ${response.status()}`);
    }
    await expect(
      page.locator(`[data-testid="diary-delete"][data-diary-id="${diary.id}"]`)
    ).toHaveCount(0, { timeout: 30_000 });
    logPass("/log delete success removes item");
  } catch (error) {
    logFail("/log delete success removes item", error);
  }

  try {
    const deleteButtonB = pageB.locator(
      `[data-testid="diary-delete"][data-diary-id="${diary.id}"]`
    );
    await expect(deleteButtonB).toBeVisible({ timeout: 15_000 });
    pageB.once("dialog", (dialog) => dialog.accept());
    const deleteResponseB = pageB.waitForResponse((response) => {
      return response.url().includes(`/api/me/diaries/${diary.id}`);
    });
    await deleteButtonB.click();
    const responseB = await deleteResponseB;
    if (responseB.status() !== 404) {
      throw new Error(`Expected 404, got ${responseB.status()}`);
    }
    logPass("/log delete handles 404 without crash");
  } catch (error) {
    logFail("/log delete handles 404 without crash", error);
  }
});
