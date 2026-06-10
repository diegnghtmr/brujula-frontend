/**
 * ProgressPage — Page Object for /progress/subscriptions + /progress/subscribe
 * QAL-E2E-002, T-WU7.8
 */

import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class ProgressPage extends BasePage {
  readonly subscriptionsHeading: Locator;
  readonly subscribeButton: Locator;
  readonly emptyStateText: Locator;

  constructor(page: Page) {
    super(page);
    this.subscriptionsHeading = page.getByRole("heading", { name: "Mis suscripciones" });
    this.subscribeButton = page.getByRole("button", { name: "+ Suscribirse" });
    this.emptyStateText = page.getByText("Todavía no tenés suscripciones activas.");
  }

  async gotoSubscriptions(): Promise<void> {
    await super.goto("/progress/subscriptions");
  }

  async gotoSubscribeForm(): Promise<void> {
    await super.goto("/progress/subscribe");
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.subscriptionsHeading).toBeVisible({ timeout: 15_000 });
  }

  async waitForContent(): Promise<void> {
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('[role="status"]');
      return !spinner || !spinner.textContent?.includes("suscripciones");
    }, undefined, { timeout: 15_000 });
  }

  async getSubscriptionItems(): Promise<Locator> {
    return this.page.locator("ul > li");
  }

  async getDeclareButton(programName: string): Promise<Locator> {
    // Find the subscription item for a specific program and return its "Declarar avance" button
    const listItem = this.page.locator("ul > li").filter({ hasText: programName });
    return listItem.getByRole("button", { name: "Declarar avance" });
  }
}
