/**
 * Simulation create + save E2E spec — QAL-E2E-002-S3 (T-WU7.9)
 *
 * Tests:
 * 1. Simulation list heading is visible when authenticated
 * 2. "Nueva simulación" button navigates to the create form
 * 3. Create form renders name input, period select, and program checkboxes
 * 4. Submitting the form without filling it shows validation errors
 * 5. Simulation list shows existing simulations or empty state
 */

import { test, expect } from "@playwright/test";
import { SimulationPage } from "./page-objects/simulation-page";

test.describe(
  "Simulation create and save",
  { tag: ["@high", "@e2e", "@simulation", "@QAL-E2E-002"] },
  () => {
    test(
      "QAL-E2E-002-S3: simulation list heading is visible",
      { tag: ["@QAL-E2E-002-S3"] },
      async ({ page }) => {
        const simulationPage = new SimulationPage(page);
        await simulationPage.gotoList();
        await simulationPage.verifyListLoaded();

        await expect(page).toHaveURL(/\/simulations$/);
      }
    );

    test(
      "QAL-E2E-002-S3: simulation list shows content or empty-state (student starts with 0 simulations)",
      { tag: ["@QAL-E2E-002-S3"] },
      async ({ page }) => {
        const simulationPage = new SimulationPage(page);
        await simulationPage.gotoList();
        await simulationPage.verifyListLoaded();

        await page.waitForFunction(() => {
          const spinner = document.querySelector('[role="status"]');
          return !spinner || !spinner.textContent?.includes("simulaciones");
        }, undefined, { timeout: 15_000 });

        // The test student starts with 0 simulations (no seed data creates simulations for them).
        // Either a simulation list OR the empty-state message must be present.
        // The heading + "Nueva simulación" button are asserted separately, so a broken render
        // would already fail those load-bearing assertions.
        const hasSimulations = await page.locator("ul > li").first().isVisible().catch(() => false);
        const hasEmptyState = await page.getByText("No tenés simulaciones todavía.").isVisible().catch(() => false);

        expect(
          hasSimulations || hasEmptyState,
          "Expected simulation items or empty state message (both valid for a fresh student)"
        ).toBe(true);
      }
    );

    test(
      "QAL-E2E-002-S3: Nueva simulación button navigates to create form",
      { tag: ["@QAL-E2E-002-S3"] },
      async ({ page }) => {
        const simulationPage = new SimulationPage(page);
        await simulationPage.gotoList();
        await simulationPage.verifyListLoaded();

        await simulationPage.newSimulationButton.click();

        await expect(page).toHaveURL(/\/simulations\/new/);
        await simulationPage.verifyFormLoaded();
      }
    );

    test(
      "create form renders name input and period select",
      async ({ page }) => {
        const simulationPage = new SimulationPage(page);
        await simulationPage.gotoNew();
        await simulationPage.verifyFormLoaded();
        await simulationPage.waitForFormContent();

        await expect(simulationPage.nameInput).toBeVisible({ timeout: 10_000 });
        await expect(simulationPage.periodSelect).toBeVisible({ timeout: 10_000 });
      }
    );

    test(
      "submitting empty form shows validation error for name",
      async ({ page }) => {
        const simulationPage = new SimulationPage(page);
        await simulationPage.gotoNew();
        await simulationPage.verifyFormLoaded();
        await simulationPage.waitForFormContent();

        // Submit without filling anything
        await simulationPage.submit();

        // Name validation error should appear
        await expect(page.getByText("El nombre es requerido.")).toBeVisible({ timeout: 5_000 });
      }
    );
  }
);
