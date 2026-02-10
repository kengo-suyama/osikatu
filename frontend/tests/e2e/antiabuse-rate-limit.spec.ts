import { test, expect } from "@playwright/test";

const API_BASE = (process.env.PLAYWRIGHT_API_BASE ?? "http://127.0.0.1:8001").trim();

test.describe("Anti-abuse rate limits", () => {
  test("gacha pull returns 429 when rate limited", async ({ request }) => {
    // Create a device via onboarding skip
    const deviceId = "device-e2e-abuse-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    await request.post(API_BASE + "/api/me/onboarding/skip", {
      headers: { "X-Device-Id": deviceId, Accept: "application/json" },
    });

    // Earn points first
    await request.post(API_BASE + "/api/me/points/earn", {
      headers: {
        "X-Device-Id": deviceId,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      data: { reason: "daily_login" },
    });

    // Pull gacha repeatedly - most will fail with insufficient points,
    // but after 10 attempts we should get 429
    let got429 = false;
    for (let i = 0; i < 15; i++) {
      const res = await request.post(API_BASE + "/api/me/gacha/pull", {
        headers: { "X-Device-Id": deviceId, Accept: "application/json" },
      });
      if (res.status() === 429) {
        got429 = true;
        break;
      }
    }

    expect(got429).toBe(true);
    console.log("[PASS] Gacha pull rate limit works");
  });
});
