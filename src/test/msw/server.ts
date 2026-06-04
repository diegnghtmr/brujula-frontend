import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * MSW Node server for Vitest.
 * Lifecycle is managed by src/test/setup.ts (beforeAll/afterEach/afterAll).
 */
export const server = setupServer(...handlers);
