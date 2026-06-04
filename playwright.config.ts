import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 * TH-002: pnpm test:e2e must pass at least one smoke test confirming the SPA root renders.
 * webServer manages the dev server lifecycle so tests don't require a manually started server.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",
  use: {
    // Base URL for the dev server started by webServer below
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Use preview server (avoids needing --host, runs on a fixed port)
    command: "pnpm build && pnpm preview --port 5174",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
});
