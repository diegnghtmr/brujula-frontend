/**
 * ImportPage — Page Object for /imports/upload (STAFF)
 * QAL-E2E-002, T-WU7.10
 */

import { type Locator, type Page, expect } from "@playwright/test";
import { BasePage } from "./base-page";

export class ImportPage extends BasePage {
  readonly heading: Locator;
  readonly kindSelect: Locator;
  readonly programSelect: Locator;
  readonly fileInput: Locator;
  readonly submitButton: Locator;
  readonly successStatus: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole("heading", { name: "Importar datos académicos" });
    this.kindSelect = page.getByLabel("Tipo de importación");
    this.programSelect = page.getByLabel("Programa académico");
    this.fileInput = page.getByLabel("Archivo CSV");
    this.submitButton = page.getByRole("button", { name: "Subir archivo" });
    this.successStatus = page.getByRole("status");
    this.errorAlert = page.getByRole("alert");
  }

  async goto(): Promise<void> {
    await super.goto("/imports/upload");
  }

  async verifyLoaded(): Promise<void> {
    await expect(this.heading).toBeVisible({ timeout: 15_000 });
  }

  async selectImportKind(kind: string): Promise<void> {
    await this.kindSelect.selectOption({ value: kind });
  }

  async selectFirstProgram(): Promise<void> {
    await this.page.waitForFunction(() => {
      const select = document.querySelector('[aria-label="Programa académico"]') as HTMLSelectElement;
      return select && select.options.length > 1;
    }, undefined, { timeout: 15_000 });

    const options = await this.programSelect.locator("option").all();
    for (const option of options) {
      const value = await option.getAttribute("value");
      if (value && value.trim() !== "") {
        await this.programSelect.selectOption({ value });
        break;
      }
    }
  }

  async uploadFile(filePath: string): Promise<void> {
    await this.fileInput.setInputFiles(filePath);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
