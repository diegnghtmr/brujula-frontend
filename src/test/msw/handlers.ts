import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for tests.
 * These mock the generated API endpoints so tests don't need a running backend.
 * Feature-specific handlers are added in Fase 1+.
 */
export const handlers = [
  // Health endpoint smoke mock
  http.get("/api/actuator/health", () => {
    return HttpResponse.json({ status: "UP" });
  }),
];
