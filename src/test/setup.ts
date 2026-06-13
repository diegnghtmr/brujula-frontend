import "@testing-library/jest-dom";
// Extend vitest expect with toHaveNoViolations matcher.
// Runtime: manually extend because vitest-axe/dist/extend-expect.js is empty.
// Types: import side-effect to augment Vi.Assertion via vitest-axe ambient declaration.
import "vitest-axe/extend-expect";
import * as vitestAxeMatchers from "vitest-axe/matchers";
import { expect } from "vitest";
expect.extend(vitestAxeMatchers);
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw/server";

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));

// Reset handlers after each test (avoids cross-test pollution)
afterEach(() => server.resetHandlers());

// Stop MSW server after all tests
afterAll(() => server.close());
