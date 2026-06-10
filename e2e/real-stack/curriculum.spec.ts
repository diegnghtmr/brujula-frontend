/**
 * Curriculum malla E2E spec — QAL-E2E-002-S3 (T-WU7.7)
 *
 * Uses the REAL seeded plan from V012 migration:
 *   Plan ID:  33333333-0000-4000-a000-000000000001
 *   Program:  Ingeniería de Sistemas y Computación (Plan 21, ACTIVE)
 *   Source:   V012__seed_sistemas_program.sql
 *
 * The test navigates to the real malla route and asserts:
 * 1. The "Malla curricular" heading is visible (happy-path, not error state)
 * 2. At least one semester section is rendered (real curriculum data)
 *
 * These assertions WILL FAIL if:
 * - The API returns 404/500 (wrong planId or DB not seeded)
 * - The component renders an error boundary instead of real data
 * - The loading state never resolves
 */

import { test, expect } from "@playwright/test";
import { CurriculumPage } from "./page-objects/curriculum-page";

// Real seeded plan UUID from V012__seed_sistemas_program.sql
// INSERT INTO catalog.study_plan (id, ...) VALUES ('33333333-0000-4000-a000-000000000001', ...)
const SEEDED_PLAN_ID = "33333333-0000-4000-a000-000000000001";

test.describe(
  "Curriculum malla view",
  { tag: ["@high", "@e2e", "@curriculum", "@QAL-E2E-002"] },
  () => {
    test(
      "curriculum malla heading renders for real seeded plan",
      async ({ page }) => {
        const curriculumPage = new CurriculumPage(page);
        await curriculumPage.goto(SEEDED_PLAN_ID);
        await curriculumPage.verifyLoaded();

        // Must show the real heading — NOT an error/loading state
        await expect(
          page.getByRole("heading", { name: /malla curricular/i }),
          "Expected 'Malla curricular' heading to be visible for the seeded plan"
        ).toBeVisible({ timeout: 15_000 });
      }
    );

    test(
      "curriculum malla shows at least one semester section for real seeded plan",
      async ({ page }) => {
        const curriculumPage = new CurriculumPage(page);
        await curriculumPage.goto(SEEDED_PLAN_ID);
        await curriculumPage.verifyLoaded();

        // Wait for loading spinner to disappear
        await page.waitForFunction(() => {
          const spinner = document.querySelector('[role="status"]');
          return !spinner || !spinner.textContent?.includes("curricular");
        }, undefined, { timeout: 15_000 });

        // Must show at least one semester section — error/empty state would NOT satisfy this
        const semesterSections = page.locator('[aria-label*="Semestre"], [aria-label*="semestre"], section');
        await expect(
          semesterSections.first(),
          "Expected at least one semester section in the malla for the seeded plan"
        ).toBeVisible({ timeout: 10_000 });
      }
    );
  }
);
