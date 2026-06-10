/**
 * Dashboard E2E spec — QAL-E2E-001, QAL-E2E-002-S1 (T-WU7.5)
 *
 * Tests:
 * 1. Unauthenticated root → redirects to Keycloak login (QAL-E2E-001-S1)
 * 2. Authenticated student → lands on /dashboard with visible heading (QAL-E2E-002-S1)
 */

import { test, expect } from "@playwright/test";
import { DashboardPage } from "./page-objects/dashboard-page";

test.describe(
  "Dashboard",
  { tag: ["@critical", "@e2e", "@dashboard", "@QAL-E2E-001", "@QAL-E2E-002"] },
  () => {
    test(
      "QAL-E2E-001-S1: unauthenticated root redirects to Keycloak login",
      { tag: ["@QAL-E2E-001-S1"] },
      async ({ browser }) => {
        // Use a fresh context with explicitly cleared storageState and no cookies.
        // browser.newContext() alone is NOT sufficient — Playwright's Chromium shares the
        // cookie jar across contexts for the same origin. Passing storageState:{} ensures
        // the context starts with no cookies from a previous session in the same browser instance.
        const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
        const page = await context.newPage();

        try {
          await page.goto("/");

          // The SPA redirects unauthenticated visitors to /login (its own login page).
          // The /login page shows an "Iniciar sesión" button which triggers the OIDC flow.
          // We verify step-by-step:
          // Step 1: SPA lands on /login (RequireAuth redirects to /login on 401 from /me)
          await page.waitForURL(/\/login/, { timeout: 30_000 });
          expect(page.url()).toMatch(/\/login/);

          // Step 2: Click "Iniciar sesión" → browser navigates to Keycloak auth URL
          await page.getByRole("button", { name: "Iniciar sesión" }).click();
          await page.waitForURL(
            /\/realms\/.*\/protocol\/openid-connect\/auth/,
            { timeout: 30_000 }
          );
          expect(page.url()).toMatch(/\/realms\/.*\/protocol\/openid-connect\/auth/);
        } finally {
          await context.close();
        }
      }
    );

    test(
      "QAL-E2E-002-S1: authenticated student lands on /dashboard",
      { tag: ["@QAL-E2E-002-S1"] },
      async ({ page }) => {
        // storageState is loaded per-project config (real-stack uses student.json by default)
        const dashboardPage = new DashboardPage(page);

        await dashboardPage.goto();
        await dashboardPage.verifyLoaded();

        // Verify the URL is /dashboard (no redirect to Keycloak)
        await expect(page).toHaveURL(/\/dashboard/);
      }
    );

    test(
      "QAL-E2E-002-S1: dashboard renders without uncaught JS errors",
      async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));

        const dashboardPage = new DashboardPage(page);
        await dashboardPage.goto();
        await dashboardPage.verifyLoaded();

        expect(
          errors,
          `Unexpected JS errors on /dashboard: ${errors.join(", ")}`
        ).toHaveLength(0);
      }
    );
  }
);
