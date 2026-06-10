/**
 * CatalogPage — Page Object for /catalog/programs
 * QAL-E2E-002, T-WU7.6
 */

import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class CatalogPage extends BasePage {
  readonly heading: Locator;
  readonly programsList: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { name: "Catálogo de programas académicos" });
    this.programsList = page.getByRole("region", { name: "Lista de programas" });
    this.loadingSpinner = page.getByRole("status");
  }

  async goto(): Promise<void> {
    await super.goto("/catalog/programs");
  }

  async waitForPrograms(): Promise<void> {
    // Wait until the loading spinner disappears
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('[role="status"]');
      return !spinner || !spinner.textContent?.includes("programas");
    }, undefined, { timeout: 15_000 });
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }

  async getProgramCards(): Promise<Locator> {
    return this.page.locator('[aria-label="Lista de programas"] article, [aria-label="Lista de programas"] button');
  }
}
