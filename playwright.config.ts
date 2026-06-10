import { defineConfig, devices } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

/**
 * Playwright configuration.
 * TH-002: pnpm test:e2e must pass at least one smoke test confirming the SPA root renders.
 * webServer manages the dev server lifecycle so tests don't require a manually started server.
 *
 * Projects:
 *  - chromium: smoke + a11y (public routes) — uses the local dev/preview server
 *  - real-stack: E2E against compose.full.yaml with real Keycloak auth (QAL-E2E-001/002)
 *  - real-stack-staff: same compose stack, uses staff storageState for import upload spec
 *
 * Note: package.json has "type": "module", so __dirname is not available — use
 * fileURLToPath(import.meta.url) instead.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_STATE_DIR = path.join(__dirname, "e2e/real-stack/storageState");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : undefined,
  reporter: "html",
  // T-WU7.3: globalSetup runs once (top-level) before ANY test project executes.
  // NOTE: globalSetup is a top-level config key only — project-level globalSetup is silently
  // ignored by Playwright. Running before the chromium project is harmless (it exits fast if
  // real-stack services are unavailable; storageState files remain as empty stubs).
  globalSetup: process.env["REAL_STACK"]
    ? path.join(__dirname, "e2e/real-stack/global-setup.ts")
    : undefined,
  use: {
    // Base URL for the dev server started by webServer below
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      testMatch: ["**/e2e/smoke.spec.ts", "**/e2e/a11y/**/*.spec.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    // ── Real-stack projects — require compose.full.yaml running ──────────────
    // T-WU7.3: globalSetup (top-level above) performs real OIDC login and writes storageState per role.
    // All real-stack specs load the student storageState by default.
    {
      name: "real-stack",
      testMatch: [
        "**/e2e/real-stack/dashboard.spec.ts",
        "**/e2e/real-stack/catalog.spec.ts",
        "**/e2e/real-stack/curriculum.spec.ts",
        "**/e2e/real-stack/progress.spec.ts",
        "**/e2e/real-stack/simulation.spec.ts",
        "**/e2e/real-stack/authed-axe-sweep.spec.ts",
      ],
      use: {
        ...devices["Desktop Chrome"],
        // Base URL points to the frontend container (port 5173 mapped from compose)
        baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:5173",
        // Student storageState — real session cookie from globalSetup OIDC login
        storageState: path.join(STORAGE_STATE_DIR, "student.json"),
        trace: "on-first-retry",
      },
    },
    // real-stack-staff: same stack, uses staff storageState for import upload spec
    {
      name: "real-stack-staff",
      testMatch: ["**/e2e/real-stack/import.spec.ts"],
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:5173",
        // Staff storageState for STAFF import upload test
        storageState: path.join(STORAGE_STATE_DIR, "staff.json"),
        trace: "on-first-retry",
      },
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
