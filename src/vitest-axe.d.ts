/**
 * Ambient augmentation for vitest-axe toHaveNoViolations.
 *
 * vitest-axe@0.1.0 was authored for an older vitest that exposed a global
 * `Vi.Assertion` namespace.  vitest ≥3 dropped that namespace.  The canonical
 * extension point is the empty `Matchers<T>` interface in `@vitest/expect`
 * (Assertion<T> extends Matchers<T>).
 *
 * `@vitest/expect` is not symlinked at the project root in pnpm strict mode;
 * tsconfig.app.json carries a `paths` entry pointing to the pnpm store location
 * so `declare module "@vitest/expect"` resolves correctly from this file.
 *
 * NOTE: WCAG 1.4.3 color-contrast is NOT exercised under jsdom and is
 * verified by the Playwright e2e sweep.
 */
import type { AxeMatchers } from "vitest-axe/matchers";

// Augment the empty Matchers extension interface in @vitest/expect so that
// toHaveNoViolations is recognised on every Assertion<T> instance.
declare module "@vitest/expect" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Matchers<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
