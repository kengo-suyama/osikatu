import { defineConfig } from "@playwright/test";

const isChaos = process.env.E2E_CHAOS === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: isChaos ? 180_000 : 90_000,
  retries: process.env.CI ? 1 : 0,
  expect: {
    timeout: isChaos ? 30_000 : 10_000,
  },
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    headless: true,
    actionTimeout: isChaos ? 30_000 : 10_000,
    launchOptions: isChaos ? { slowMo: 200 } : {},
    viewport: { width: 1280, height: 720 },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  reporter: "line",
});
