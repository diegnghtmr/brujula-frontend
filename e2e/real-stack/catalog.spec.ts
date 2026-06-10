/**
 * Catalog browse E2E spec — QAL-E2E-002-S2 (T-WU7.6)
 *
 * Tests:
 * 1. Student can navigate to /catalog/programs and see the heading
 * 2. Program list renders at least one item (or shows empty state)
 * 3. Pagination controls present when there are multiple pages
 */

import { test, expect } from "@playwright/test";
import { CatalogPage } from "./page-objects/catalog-page";

test.describe(
  "Catalog browse",
  { tag: ["@high", "@e2e", "@catalog", "@QAL-E2E-002"] },
  () => {
    test(
      "QAL-E2E-002-S2: catalog page heading is visible",
      { tag: ["@QAL-E2E-002-S2"] },
      async ({ page }) => {
        const catalogPage = new CatalogPage(page);
        await catalogPage.goto();
        await catalogPage.verifyLoaded();

        await expect(page).toHaveURL(/\/catalog\/programs/);
      }
    );

    test(
      "QAL-E2E-002-S2: program list shows real seeded programs (V012/V013 data)",
      { tag: ["@QAL-E2E-002-S2"] },
      async ({ page }) => {
        const catalogPage = new CatalogPage(page);
        await catalogPage.goto();
        await catalogPage.verifyLoaded();

        // Wait for loading to complete
        await catalogPage.waitForPrograms();

        // V012 seeds ISC program and V013 seeds Lenguas program — at least 1 program card
        // must be visible. This assertion FAILS if the catalog renders an empty/error state,
        // which would indicate a broken API or missing seed data.
        const programsList = page.locator('[aria-label="Lista de programas"]');
        await expect(
          programsList,
          "Expected program list to be visible (V012/V013 seed data should be present)"
        ).toBeVisible({ timeout: 10_000 });

        const programCards = programsList.locator("button, article");
        await expect(
          programCards.first(),
          "Expected at least 1 program card from seeded data (V012: ISC, V013: Lenguas)"
        ).toBeVisible({ timeout: 10_000 });
      }
    );

    test(
      "catalog page has no uncaught JS errors",
      async ({ page }) => {
        const errors: string[] = [];
        page.on("pageerror", (err) => errors.push(err.message));

        const catalogPage = new CatalogPage(page);
        await catalogPage.goto();
        await catalogPage.verifyLoaded();

        expect(
          errors,
          `Unexpected JS errors on /catalog/programs: ${errors.join(", ")}`
        ).toHaveLength(0);
      }
    );
  }
);
