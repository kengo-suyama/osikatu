import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

const logPass = (message: string) => console.log(`[PASS] ${message}`);

const ensureOnboardingDone = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
) => {
  const res = await request.post(`${API_BASE}/api/me/onboarding/skip`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!res.ok()) throw new Error(`onboarding skip failed: ${res.status()}`);
};

const ensureOshi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string
): Promise<{ id: number; name: string }> => {
  const listRes = await request.get(`${API_BASE}/api/oshis`, {
    headers: { "X-Device-Id": deviceId, Accept: "application/json" },
  });
  if (!listRes.ok()) throw new Error(`list oshis failed: ${listRes.status()}`);
  const body = await listRes.json();
  const items = body?.success?.data ?? [];
  if (items.length > 0) return items[0];

  const createRes = await request.post(`${API_BASE}/api/oshis`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: { name: "E2E Search Oshi", category: "idol" },
  });
  if (!createRes.ok()) throw new Error(`create oshi failed: ${createRes.status()}`);
  const created = await createRes.json();
  return created?.success?.data;
};

const createDiaryViaApi = async (
  request: Parameters<typeof test>[1]["request"],
  deviceId: string,
  oshiId: number,
  data: { title: string; content: string; tags?: string[] }
) => {
  const payload: Record<string, unknown> = {
    oshi_id: oshiId,
    title: data.title,
    content: data.content,
    diary_date: new Date().toISOString().slice(0, 10),
  };
  if (data.tags) payload.tags = data.tags;

  const res = await request.post(`${API_BASE}/api/me/diaries`, {
    headers: {
      "X-Device-Id": deviceId,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    data: payload,
  });
  if (!res.ok()) throw new Error(`create diary failed: ${res.status()}`);
  const body = await res.json();
  return body?.success?.data;
};

// Selector that targets only the inner div (has data-diary-id), avoiding the MotionCard wrapper
const CARD_SEL = '[data-testid="log-diary-card"][data-diary-id]';

test.describe("log diary search & filter", () => {
  test("search bar and tag filter chips appear when diaries have tags", async ({
    page,
    request,
  }) => {
    const deviceId = `device-e2e-diary-search-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    const oshi = await ensureOshi(request, deviceId);

    // Seed two diaries with different tags via API
    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: "Concert Report",
      content: "Amazing live show",
      tags: ["live", "concert"],
    });
    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: "Merch Haul",
      content: "Got new goods",
      tags: ["goods", "merch"],
    });

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    await page.goto("/log", { waitUntil: "domcontentloaded" });

    // Wait for diary cards to load
    const cards = page.locator(CARD_SEL);
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });

    // Search bar should be visible
    const searchInput = page.locator('[data-testid="log-search-input"]');
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    logPass("Search input is visible");

    // Tag filter chips should be visible
    const tagFilters = page.locator('[data-testid="log-tag-filters"]');
    await expect(tagFilters).toBeVisible({ timeout: 5_000 });
    logPass("Tag filter chips are visible");

    // Verify specific tag chips exist
    const chips = page.locator('[data-testid="log-tag-filter-chip"]');
    const chipCount = await chips.count();
    expect(chipCount).toBeGreaterThanOrEqual(2);
    logPass(`Found ${chipCount} tag filter chips`);
  });

  test("text search filters diary list", async ({ page, request }) => {
    const deviceId = `device-e2e-diary-search2-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    const oshi = await ensureOshi(request, deviceId);

    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: "SearchMatch Alpha",
      content: "Should appear in results",
      tags: ["alpha"],
    });
    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: "Other Entry Beta",
      content: "Should be filtered out",
      tags: ["beta"],
    });

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    await page.goto("/log", { waitUntil: "domcontentloaded" });

    const cards = page.locator(CARD_SEL);
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });

    // Both cards should be visible initially
    const initialCount = await cards.count();
    expect(initialCount).toBe(2);
    logPass("Both diaries visible initially");

    // Type search query
    const searchInput = page.locator('[data-testid="log-search-input"]');
    await searchInput.fill("SearchMatch");

    // Wait for debounce + API response
    await page.waitForTimeout(1500);

    // Should show only matching diary
    const filteredCards = page.locator(CARD_SEL);
    await expect(filteredCards).toHaveCount(1, { timeout: 10_000 });
    await expect(filteredCards.first()).toContainText("SearchMatch Alpha");
    logPass("Text search filters correctly");

    // Clear search
    const clearBtn = page.locator('[data-testid="log-search-clear"]');
    await clearBtn.click();
    await page.waitForTimeout(1500);

    // All diaries should reappear
    await expect(cards).toHaveCount(2, { timeout: 10_000 });
    logPass("Clearing search restores all diaries");
  });

  test("tag filter chip filters diary list", async ({ page, request }) => {
    const deviceId = `device-e2e-diary-tagfilter-${Date.now()}`;
    await ensureOnboardingDone(request, deviceId);
    const oshi = await ensureOshi(request, deviceId);

    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: "Live Report",
      content: "Great concert",
      tags: ["live"],
    });
    await createDiaryViaApi(request, deviceId, oshi.id, {
      title: "Shopping Day",
      content: "Bought merch",
      tags: ["goods"],
    });

    await page.addInitScript((did: string) => {
      localStorage.setItem("osikatu:device:id", did);
      localStorage.setItem("osikatu:data-source", "api");
    }, deviceId);

    await page.goto("/log", { waitUntil: "domcontentloaded" });

    const cards = page.locator(CARD_SEL);
    await expect(cards.first()).toBeVisible({ timeout: 30_000 });
    expect(await cards.count()).toBe(2);
    logPass("Both diaries visible initially");

    // Click the "live" tag chip
    const liveChip = page.locator('[data-testid="log-tag-filter-chip"][data-tag="live"]');
    await expect(liveChip).toBeVisible({ timeout: 5_000 });
    await liveChip.click();

    // Wait for API response
    await page.waitForTimeout(1500);

    // Only "Live Report" should be visible
    await expect(cards).toHaveCount(1, { timeout: 10_000 });
    await expect(cards.first()).toContainText("Live Report");
    logPass("Tag filter shows only matching diary");

    // Click same chip again to deselect
    await liveChip.click();
    await page.waitForTimeout(1500);

    // All diaries should reappear
    await expect(cards).toHaveCount(2, { timeout: 10_000 });
    logPass("Deselecting tag filter restores all diaries");
  });
});
