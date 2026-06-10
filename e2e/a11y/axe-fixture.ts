/**
 * Axe accessibility fixture — QAL-A11Y-001 (T-WU6.6)
 *
 * Provides a reusable helper that runs axe-core against a Playwright page
 * filtered to WCAG 2.x A/AA tags. Any violation causes the test to fail
 * with a formatted report.
 *
 * Usage:
 *   import { expectNoA11yViolations } from "@/e2e/a11y/axe-fixture";
 *   await expectNoA11yViolations(page);
 */

import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Run axe against the full page and assert zero violations under
 * WCAG 2.0 A, WCAG 2.0 AA, and WCAG 2.2 AA tag sets.
 *
 * @param page - Playwright Page object.
 * @param options - Optional overrides for the AxeBuilder configuration.
 */
async function expectNoA11yViolations(
  page: Page,
  options?: { disableRules?: string[] }
): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags([
    "wcag2a",
    "wcag2aa",
    "wcag22aa",
  ]);

  if (options?.disableRules) {
    builder.disableRules(options.disableRules);
  }

  const results = await builder.analyze();

  expect(
    results.violations,
    `Axe found ${results.violations.length} accessibility violation(s):\n` +
      results.violations
        .map(
          (v) =>
            `  [${v.impact}] ${v.id}: ${v.description}\n` +
            v.nodes
              .map((n) => `    - ${n.html.slice(0, 120)}`)
              .join("\n")
        )
        .join("\n")
  ).toHaveLength(0);
}

export { expectNoA11yViolations };
