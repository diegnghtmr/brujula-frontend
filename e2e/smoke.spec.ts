import { test, expect } from "@playwright/test";

/**
 * Playwright smoke test.
 * TH-002: confirms the SPA root page renders without a JS crash.
 */
test.describe("SPA smoke", () => {
  test("loads root page without JS errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");

    // App should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Main heading must be visible
    await expect(
      page.getByRole("heading", { name: /Brújula/i })
    ).toBeVisible();

    // No uncaught JS errors
    expect(errors, `Unexpected JS errors: ${errors.join(", ")}`).toHaveLength(0);
  });

  test("theme toggle switches dark mode class", async ({ page }) => {
    await page.goto("/dashboard");

    const toggleButton = page.getByRole("button", {
      name: /switch to dark mode/i,
    });
    await expect(toggleButton).toBeVisible();

    await toggleButton.click();

    // .dark class should be on <html>
    const htmlClass = await page.evaluate(() => document.documentElement.className);
    expect(htmlClass).toContain("dark");
  });
});
