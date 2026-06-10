/**
 * SimulationPage — Page Object for /simulations and /simulations/new
 * QAL-E2E-002, T-WU7.9
 */

import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class SimulationPage extends BasePage {
  readonly listHeading: Locator;
  readonly newSimulationButton: Locator;
  readonly createFormHeading: Locator;
  readonly nameInput: Locator;
  readonly periodSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly apiErrorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.listHeading = page.getByRole("heading", { name: "Mis simulaciones" });
    this.newSimulationButton = page.getByRole("button", { name: "Nueva simulación" });
    this.createFormHeading = page.getByRole("heading", { name: "Nueva simulación" });
    this.nameInput = page.getByLabel("Nombre");
    this.periodSelect = page.getByLabel("Período");
    this.submitButton = page.getByRole("button", { name: "Crear simulación" });
    this.cancelButton = page.getByRole("button", { name: "Cancelar" });
    this.apiErrorAlert = page.getByRole("alert");
  }

  async gotoList(): Promise<void> {
    await super.goto("/simulations");
  }

  async gotoNew(): Promise<void> {
    await super.goto("/simulations/new");
  }

  async verifyListLoaded(): Promise<void> {
    await expect(this.listHeading).toBeVisible({ timeout: 15_000 });
  }

  async verifyFormLoaded(): Promise<void> {
    await expect(this.createFormHeading).toBeVisible({ timeout: 15_000 });
  }

  async waitForFormContent(): Promise<void> {
    // Wait until periods and subscriptions have loaded (spinner gone)
    await this.page.waitForFunction(() => {
      const spinner = document.querySelector('[role="status"]');
      return !spinner || !spinner.textContent?.includes("formulario");
    }, undefined, { timeout: 15_000 });
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async selectFirstPeriod(): Promise<void> {
    // Select the first non-empty option in the period dropdown
    const options = await this.periodSelect.locator("option").all();
    for (const option of options) {
      const value = await option.getAttribute("value");
      if (value && value.trim() !== "") {
        await this.periodSelect.selectOption({ value });
        break;
      }
    }
  }

  async checkFirstProgram(): Promise<void> {
    const checkboxes = this.page.getByRole("checkbox");
    const first = checkboxes.first();
    if (await first.isVisible()) {
      await first.check();
    }
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async getSimulationItems(): Promise<Locator> {
    return this.page.locator("ul > li");
  }
}
