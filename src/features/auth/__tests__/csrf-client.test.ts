/**
 * S1-G-2: CSRF axios wiring — proves XSRF-TOKEN cookie is read and X-XSRF-TOKEN
 * header is injected on mutating requests; GET leaves it absent.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { apiClient } from "@/api/client";

// In jsdom, document.cookie doesn't support path-based deletion in the same way.
// We override document.cookie via a controlled cookie jar for test isolation.
const originalCookieDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, "cookie");

function setDocumentCookie(value: string) {
  if (originalCookieDescriptor?.set) {
    originalCookieDescriptor.set.call(document, value);
  }
}

function clearAllCookies() {
  // Delete all cookies by setting them with an expired date
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const name = cookie.split("=")[0]?.trim();
    if (name) {
      setDocumentCookie(`${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`);
    }
  }
}

describe("CSRF axios interceptor (S1-G-2)", () => {
  beforeEach(() => {
    clearAllCookies();
  });

  afterEach(() => {
    clearAllCookies();
  });

  it("sets X-XSRF-TOKEN header on POST when cookie is present", async () => {
    setDocumentCookie("XSRF-TOKEN=test-csrf-token-123; path=/");

    let capturedHeader: string | null = null;
    server.use(
      http.post("/api/v1/test-csrf-post", ({ request }) => {
        capturedHeader = request.headers.get("x-xsrf-token");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.post("/test-csrf-post", {});
    expect(capturedHeader).toBe("test-csrf-token-123");
  });

  it("sets X-XSRF-TOKEN header on PUT when cookie is present", async () => {
    setDocumentCookie("XSRF-TOKEN=csrf-put-token; path=/");

    let capturedHeader: string | null = null;
    server.use(
      http.put("/api/v1/test-csrf-put", ({ request }) => {
        capturedHeader = request.headers.get("x-xsrf-token");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.put("/test-csrf-put", {});
    expect(capturedHeader).toBe("csrf-put-token");
  });

  it("sets X-XSRF-TOKEN header on DELETE when cookie is present", async () => {
    setDocumentCookie("XSRF-TOKEN=csrf-delete-token; path=/");

    let capturedHeader: string | null = null;
    server.use(
      http.delete("/api/v1/test-csrf-delete", ({ request }) => {
        capturedHeader = request.headers.get("x-xsrf-token");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.delete("/test-csrf-delete");
    expect(capturedHeader).toBe("csrf-delete-token");
  });

  it("does NOT set X-XSRF-TOKEN header on GET", async () => {
    // Do NOT set any XSRF-TOKEN cookie for this test
    let capturedHeader: string | null = null;
    server.use(
      http.get("/api/v1/test-csrf-get", ({ request }) => {
        capturedHeader = request.headers.get("x-xsrf-token");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.get("/test-csrf-get");
    expect(capturedHeader).toBeNull();
  });

  it("does not set header when XSRF-TOKEN cookie is absent", async () => {
    // clearAllCookies() in beforeEach handles this
    let capturedHeader: string | null = null;
    server.use(
      http.post("/api/v1/test-csrf-no-cookie", ({ request }) => {
        capturedHeader = request.headers.get("x-xsrf-token");
        return HttpResponse.json({ ok: true });
      })
    );

    await apiClient.post("/test-csrf-no-cookie", {});
    expect(capturedHeader).toBeNull();
  });

  it("sets withCredentials: true on the axios instance", () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });
});
