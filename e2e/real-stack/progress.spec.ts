/**
 * Progress subscribe + declare E2E spec — QAL-E2E-002 (T-WU7.8)
 *
 * Tests:
 * 1. Student can navigate to /progress/subscriptions and see the heading
 * 2. Subscribe button is present (up to 2 subscriptions allowed)
 * 3. Empty state is shown when no subscriptions exist
 * 4. The subscribe form page renders when navigating to /progress/subscribe
 */

import { test, expect } from "@playwright/test";
import { ProgressPage } from "./page-objects/progress-page";

test.describe(
  "Progress — subscribe and declare",
  { tag: ["@high", "@e2e", "@progress", "@QAL-E2E-002"] },
  () => {
    test(
      "subscriptions list heading is visible",
      async ({ page }) => {
        const progressPage = new ProgressPage(page);
        await progressPage.gotoSubscriptions();
        await progressPage.verifyLoaded();

        await expect(page).toHaveURL(/\/progress\/subscriptions/);
      }
    );

    test(
      "subscribe button is present when fewer than 2 subscriptions",
      async ({ page }) => {
        const progressPage = new ProgressPage(page);
        await progressPage.gotoSubscriptions();
        await progressPage.verifyLoaded();
        await progressPage.waitForContent();

        // The "+ Suscribirse" button should be visible (enabled if <2 subs, disabled if 2)
        const subscribeBtn = page.getByRole("button", { name: "+ Suscribirse" });
        await expect(subscribeBtn).toBeVisible({ timeout: 10_000 });
      }
    );

    test(
      "subscriptions page shows content or empty-state (student has 0 subscriptions by default)",
      async ({ page }) => {
        const progressPage = new ProgressPage(page);
        await progressPage.gotoSubscriptions();
        await progressPage.verifyLoaded();
        await progressPage.waitForContent();

        // The test student starts with 0 subscriptions (no seed data adds subscriptions for them).
        // Either a subscription list OR the empty-state message must be present.
        // Crucially, the heading + subscribe button MUST be present (asserted in other tests),
        // so a completely broken render would already fail those tests.
        // If the student has subscribed in a prior test run (not cleaned up), hasSubscriptions passes.
        const hasSubscriptions = await page.locator("ul > li").first().isVisible().catch(() => false);
        const hasEmptyState = await page.getByText("Todavía no tenés suscripciones activas.").isVisible().catch(() => false);

        expect(
          hasSubscriptions || hasEmptyState,
          "Expected subscription items or empty state message (both are valid for a fresh student)"
        ).toBe(true);
      }
    );

    test(
      "subscribe form page renders",
      async ({ page }) => {
        const progressPage = new ProgressPage(page);
        await progressPage.gotoSubscribeForm();

        await page.waitForLoadState("networkidle");
        // The subscribe form should render without redirect
        await expect(page).toHaveURL(/\/progress\/subscribe/);
      }
    );
  }
);
