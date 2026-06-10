/**
 * BasePage — parent class for all real-stack Page Object Models.
 * QAL-E2E-002 (T-WU7.5) — Page Object pattern per Playwright skill.
 *
 * Provides common navigation and wait helpers reused across all specs.
 */

import { type Page } from "@playwright/test";

export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  /** Wait for the authenticated shell to confirm the session is active. */
  async waitForAuthenticatedShell(): Promise<void> {
    // The skip-to-content link is the first focusable element in the authenticated shell
    await this.page.waitForSelector('a[href="#main-content"]', { timeout: 15_000 });
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }
}
