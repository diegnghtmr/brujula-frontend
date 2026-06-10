/**
 * Authenticated-route axe sweep — QAL-A11Y-002 (T-WU7.11, deferred from WU6)
 *
 * Now that globalSetup provides storageState, this spec runs the axe accessibility
 * sweep across all authenticated routes using a real backend session cookie.
 *
 * Requirements:
 *   - Zero WCAG 2.2 A/AA violations on all routes listed.
 *   - Completes QAL-A11Y-002: full retrospective sweep clean.
 *
 * Strategy (DEC-7):
 *   - Reuse the WU6 `expectNoA11yViolations` fixture.
 *   - Parametrize across authenticated routes from the route table.
 *   - Some routes require a :planId / :subscriptionId / :simulationId segment —
 *     for these we navigate to the list/parent page first to collect a real ID,
 *     or use a placeholder UUID (page renders with error state, but the chrome
 *     shell — headers, nav, skip-link — is still axe-testable).
 *   - We disable the `color-contrast` rule where jsdom+axe cannot evaluate
 *     dynamic CSS variables at runtime in Playwright — actually Playwright
 *     renders real CSS so we keep it enabled. If a specific page has a known
 *     contrast issue that must be tracked as DEBT, disable individually.
 */

import { test } from "@playwright/test";
import { expectNoA11yViolations } from "../a11y/axe-fixture";

// Routes covered by the authenticated axe sweep
// For parameterized routes we use placeholder IDs — they render the shell + error state
// which is sufficient to validate the a11y of the authenticated chrome.
const AUTHENTICATED_ROUTES = [
  { path: "/dashboard", label: "dashboard" },
  { path: "/catalog/programs", label: "catalog-programs" },
  { path: "/curriculum/plans/00000000-0000-0000-0000-000000000001/malla", label: "curriculum-malla" },
  { path: "/progress/subscriptions", label: "progress-subscriptions" },
  { path: "/progress/subscribe", label: "progress-subscribe" },
  { path: "/simulations", label: "simulations-list" },
  { path: "/simulations/new", label: "simulations-new" },
  { path: "/imports/upload", label: "imports-upload" },
] as const;

test.describe(
  "Authenticated-route axe sweep (QAL-A11Y-002)",
  { tag: ["@a11y", "@e2e", "@QAL-A11Y-002"] },
  () => {
    for (const { path, label } of AUTHENTICATED_ROUTES) {
      test(
        `zero WCAG 2.2 A/AA violations on ${label}`,
        { tag: [`@axe-${label}`] },
        async ({ page }) => {
          await page.goto(path);
          // Wait for the page to settle (authenticated shell, data loads, etc.)
          await page.waitForLoadState("networkidle");

          // Run axe on the fully rendered page
          await expectNoA11yViolations(page);
        }
      );
    }
  }
);
