/**
 * CurriculumPage — Page Object for /curriculum/plans/:planId/malla
 * QAL-E2E-002, T-WU7.7
 */

import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class CurriculumPage extends BasePage {
  readonly heading: Locator;
  readonly semestersSection: Locator;
  readonly diurnaButton: Locator;
  readonly nocturnaButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { name: "Malla curricular" });
    this.semestersSection = page.getByRole("region", { name: "Semestres del plan" });
    this.diurnaButton = page.getByRole("button", { name: "Diurna" });
    this.nocturnaButton = page.getByRole("button", { name: "Nocturna" });
  }

  async goto(planId: string): Promise<void> {
    await super.goto(`/curriculum/plans/${planId}/malla`);
  }

  /**
   * Verify the curriculum malla page has loaded the REAL happy-path content.
   *
   * Asserts that the "Malla curricular" heading is visible. This assertion FAILS
   * if the page is in an error, loading, or empty state — which is intentional.
   * Only real curriculum data satisfies this check.
   */
  async verifyLoaded(): Promise<void> {
    await expect(
      this.heading,
      "CurriculumPage.verifyLoaded: 'Malla curricular' heading must be visible. " +
      "If this fails, the planId does not resolve to real seeded data."
    ).toBeVisible({ timeout: 15_000 });
  }

  async waitForSemesters(): Promise<void> {
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('[role="status"]');
      return !spinner || !spinner.textContent?.includes("curricular");
    }, undefined, { timeout: 15_000 });
  }
}
