/**
 * Public-routes axe accessibility sweep — QAL-A11Y-001-S2, QAL-A11Y-002 (T-WU6.7)
 *
 * Runs axe against all routes that render WITHOUT backend auth:
 *   /login, /register, /forgot-password, /verify-email
 *
 * SCOPE BOUNDARY (explicit):
 *   Authenticated routes (/dashboard, /catalog/*, /curriculum/*, /progress/*,
 *   /simulations/*, /admin/*) depend on WU7's Keycloak storageState.
 *   Their axe sweep is intentionally DEFERRED to WU7.
 *
 * Each test navigates to the route, waits for the page to be DOM-ready, then
 * asserts zero WCAG 2.x A/AA violations via @axe-core/playwright.
 *
 * NOTE: /login renders a button that immediately calls window.location.assign()
 * on click — it does NOT auto-redirect. The page itself is fully static and axe
 * can inspect it before any user interaction.
 */

import { test } from "@playwright/test";
import { expectNoA11yViolations } from "./axe-fixture";

const PUBLIC_ROUTES = [
  { path: "/login", name: "Login page" },
  { path: "/register", name: "Registration page" },
  { path: "/forgot-password", name: "Forgot password page" },
  { path: "/verify-email", name: "Email verification page" },
] as const;

test.describe("Public routes — axe WCAG 2.x A/AA sweep", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route.name} (${route.path}) has no accessibility violations`, async ({ page }) => {
      // Intercept the OIDC redirect so /login does not navigate away
      await page.route("**/oauth2/authorization/**", (route) =>
        route.fulfill({ status: 200, body: "" })
      );

      await page.goto(route.path, { waitUntil: "domcontentloaded" });

      // Wait for the page content to be rendered (hydration complete)
      await page.waitForLoadState("networkidle").catch(() => {
        // networkidle may timeout if API calls are pending; domcontentloaded is sufficient
      });

      await expectNoA11yViolations(page);
    });
  }
});
