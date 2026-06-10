/**
 * Playwright globalSetup — QAL-E2E-001 (T-WU7.3)
 *
 * Performs a real OIDC login through Keycloak (authorization_code flow via the
 * Spring Security backend) for each seeded test role, then persists the resulting
 * browser session storage state to disk.
 *
 * How it works:
 *  1. Launch a temporary browser context.
 *  2. Navigate to the frontend root (/) — RequireAuth redirects to /login.
 *  3. Click "Iniciar sesión" — triggers window.location.assign("/oauth2/authorization/keycloak").
 *  4. Spring Security redirects the browser to Keycloak's login form.
 *  5. Fill in the seeded username/password and submit.
 *  6. Keycloak redirects back to the Spring callback (/login/oauth2/code/keycloak).
 *  7. Spring sets the session cookie and redirects to /dashboard.
 *  8. Persist storageState (cookies + localStorage) to storageState/<role>.json.
 *
 * Seed credentials (set in realm-export.json — T-WU7.1):
 *   student:  student@uniquindio.edu.co / Student_Dev_2024!
 *   staff:    staff@uniquindio.edu.co   / Staff_Dev_2024!
 *   admin:    admin@uniquindio.edu.co   / Admin_Dev_2024!
 *
 * DEC-6 (design): real browser flow is the primary strategy; ROPC is available
 * as a fallback (directAccessGrantsEnabled:true on brujula-frontend client) but
 * is NOT used here because we want to validate the real OIDC redirect.
 */

import { chromium, expect } from "@playwright/test";
import { writeFileSync, appendFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// package.json "type":"module" — __dirname is not available in ESM context
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://localhost:5173";
const STORAGE_STATE_DIR = path.join(__dirname, "storageState");

const ROLES = [
  {
    role: "student",
    email: "student@uniquindio.edu.co",
    password: "Student_Dev_2024!",
    storageStatePath: path.join(STORAGE_STATE_DIR, "student.json"),
  },
  {
    role: "staff",
    email: "staff@uniquindio.edu.co",
    password: "Staff_Dev_2024!",
    storageStatePath: path.join(STORAGE_STATE_DIR, "staff.json"),
  },
  {
    role: "admin",
    email: "admin@uniquindio.edu.co",
    password: "Admin_Dev_2024!",
    storageStatePath: path.join(STORAGE_STATE_DIR, "admin.json"),
  },
] as const;

// ── Health-wait helpers ───────────────────────────────────────────────────────

/**
 * Poll a URL until it returns a 2xx status or the timeout expires.
 * Uses fetch (built-in Node 18+). Does NOT throw on non-2xx during polling.
 */
async function waitForUrl(
  url: string,
  label: string,
  timeoutMs = 120_000,
  intervalMs = 3_000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[globalSetup] ${label} ready (${res.status})`);
        return;
      }
      last = `HTTP ${res.status}`;
    } catch (err) {
      last = String(err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`[globalSetup] Timed out waiting for ${label} at ${url}. Last error: ${last}`);
}

// ── Login per role ────────────────────────────────────────────────────────────

async function loginRole(opts: {
  role: string;
  email: string;
  password: string;
  storageStatePath: string;
}): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    log(`[globalSetup] Logging in as ${opts.role} (${opts.email})…\n`);

    // Navigate to root → RequireAuth redirects to /login.
    // Use "load" rather than "networkidle" — the SPA may make long-lived SSE/polling
    // requests that prevent "networkidle" from ever firing.
    await page.goto(FRONTEND_URL, { waitUntil: "load" });
    log(`[globalSetup] ${opts.role}: navigated to root, current URL: ${page.url()}\n`);

    // /login page should be visible with the login button
    await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible({
      timeout: 15_000,
    });
    log(`[globalSetup] ${opts.role}: login button visible\n`);

    // Click "Iniciar sesión" → triggers /oauth2/authorization/keycloak
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    log(`[globalSetup] ${opts.role}: clicked login button\n`);

    // Wait for Keycloak login form.
    // Keycloak 26 may redirect: /openid-connect/auth → /login-actions/authenticate.
    // Instead of matching a specific URL, wait for the #username input to be visible —
    // this is the definitive signal that the login form is ready regardless of URL changes.
    await page.waitForSelector("#username", { state: "visible", timeout: 30_000 });
    log(`[globalSetup] ${opts.role}: Keycloak login form reached, URL: ${page.url()}\n`);

    // Fill Keycloak login form.
    // Keycloak 26 renders labels with nested <span> so getByLabel can't match text directly.
    // Use stable HTML id selectors (#username / #password) instead.
    await page.locator("#username").fill(opts.email);
    await page.locator("#password").fill(opts.password);

    // Submit — Keycloak POSTs credentials and redirects back to the backend callback.
    // After Spring Security processes the callback (localhost:8080/login/oauth2/code/keycloak),
    // it redirects to "/" (defaultSuccessUrl). The browser lands on localhost:8080/ with a valid
    // session cookie. Navigate to the frontend with that session to complete the storageState.
    await page.locator("#kc-login").click();
    log(`[globalSetup] ${opts.role}: submitted credentials\n`);

    // Wait for Spring Security to process the callback and issue the session cookie.
    // The browser will be redirected to localhost:8080/ after successful OIDC login.
    await page.waitForURL(/localhost:8080/, { timeout: 30_000 });
    log(`[globalSetup] ${opts.role}: OIDC callback processed — on ${page.url()}\n`);

    // Navigate the browser to the frontend (localhost:5173). The session cookie
    // (scoped to 'localhost', not port-specific) will be sent with frontend requests.
    await page.goto(`${FRONTEND_URL}/dashboard`, { waitUntil: "load" });
    log(`[globalSetup] ${opts.role}: navigated to dashboard, URL: ${page.url()}\n`);

    // Confirm we are on /dashboard (not redirected back to /login)
    await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
    log(`[globalSetup] ${opts.role}: authenticated — on ${page.url()}\n`);

    // Save storageState (session cookies + localStorage)
    await context.storageState({ path: opts.storageStatePath });
    log(`[globalSetup] ${opts.role}: storageState saved → ${opts.storageStatePath}\n`);
  } finally {
    await context.close();
    await browser.close();
  }
}

// ── globalSetup entry point ───────────────────────────────────────────────────

// Set DEBUG_GLOBALSETUP=1 to enable /tmp file logging (local debug only).
// This is disabled by default so CI environments without a writable /tmp are not affected.
const DEBUG_GLOBALSETUP = process.env["DEBUG_GLOBALSETUP"] === "1";
const LOG_FILE = "/tmp/playwright-globalsetup.log";

function log(msg: string): void {
  const ts = new Date().toISOString();
  const line = `${ts} ${msg}\n`;
  process.stderr.write(line);
  if (DEBUG_GLOBALSETUP) {
    try {
      appendFileSync(LOG_FILE, line);
    } catch {
      // ignore — /tmp may not be writable in all CI environments
    }
  }
}

async function globalSetup(): Promise<void> {
  if (DEBUG_GLOBALSETUP) {
    writeFileSync(LOG_FILE, `=== globalSetup started at ${new Date().toISOString()} ===\n`);
  }
  log("[globalSetup] Starting real-stack health checks…");

  try {
    // T-WU7 operational guidance: wait for backend readiness before driving the browser
    await waitForUrl(
      "http://localhost:8080/actuator/health/readiness",
      "Backend readiness"
    );

    // Keycloak management health endpoint (port 9000 per compose.yaml)
    await waitForUrl(
      "http://localhost:9000/health/ready",
      "Keycloak health"
    );

    // Frontend container
    await waitForUrl(FRONTEND_URL, "Frontend");

    log("[globalSetup] All services healthy — proceeding with login…\n");

    // Perform login sequentially (reduces Keycloak load; context isolation ensures no state leaks)
    for (const roleConfig of ROLES) {
      await loginRole(roleConfig);
    }

    log("[globalSetup] All storageState files written. Real-stack suite ready.\n");
  } catch (err) {
    log(`[globalSetup] FATAL ERROR: ${err}\n`);
    if (err instanceof Error && err.stack) {
      log(`[globalSetup] Stack: ${err.stack}\n`);
    }
    throw err;
  }
}

export default globalSetup;
