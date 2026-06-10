/**
 * DashboardPage — Page Object for /dashboard
 * QAL-E2E-002, T-WU7.5
 */

import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class DashboardPage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { name: "Inicio" });
  }

  async goto(): Promise<void> {
    await super.goto("/dashboard");
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }
}
