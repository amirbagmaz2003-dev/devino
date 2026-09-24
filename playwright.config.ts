import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against an already-running local preview — start it first
 * with `npm run preview` (OpenNext build + wrangler, local D1/KV). The
 * admin tests also need ADMIN_PASSWORD in the environment, matching .dev.vars.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:8787",
    ...devices["Desktop Chrome"],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : {},
  },
});
