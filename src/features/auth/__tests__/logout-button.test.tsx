/**
 * LogoutButton — disclaimer session key cleared on logout.
 *
 * The banner is dismissible per session but MUST reappear on next login.
 * sessionStorage survives same-tab navigation. Logout MUST clear the disclaimer-dismissed
 * key so the banner is visible again after re-login in the same tab.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { createElement, type ReactNode } from "react";
import { DISCLAIMER_SESSION_KEY } from "@/features/auth/components/disclaimer-banner";
import { LogoutButton } from "@/features/auth/components/logout-button";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      MemoryRouter,
      {},
      createElement(QueryClientProvider, { client: queryClient }, children)
    );
}

describe("LogoutButton — disclaimer session key cleared on logout", () => {
  beforeEach(() => {
    sessionStorage.clear();
    // Intercept logout POST so test doesn't fail on network
    server.use(
      http.post("/api/v1/auth/logout", () => {
        return new HttpResponse(null, { status: 204 });
      })
    );
    // Stub window.location.assign to prevent jsdom navigation errors
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: vi.fn() },
      writable: true,
    });
  });

  it("clears the disclaimer-dismissed sessionStorage key when logout is triggered", async () => {
    // Arrange: simulate the user having previously dismissed the banner
    sessionStorage.setItem(DISCLAIMER_SESSION_KEY, "true");
    expect(sessionStorage.getItem(DISCLAIMER_SESSION_KEY)).toBe("true");

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole("button", { name: /cerrar sesión/i });
    fireEvent.click(logoutButton);

    // The disclaimer key must be removed before/after the logout redirect
    await waitFor(() => {
      expect(sessionStorage.getItem(DISCLAIMER_SESSION_KEY)).toBeNull();
    });
  });

  it("does not throw if disclaimer key was never set (no-op removeItem)", async () => {
    // Arrange: sessionStorage does NOT have the key (fresh login state)
    sessionStorage.removeItem(DISCLAIMER_SESSION_KEY);
    expect(sessionStorage.getItem(DISCLAIMER_SESSION_KEY)).toBeNull();

    render(<LogoutButton />, { wrapper: createWrapper() });

    const logoutButton = screen.getByRole("button", { name: /cerrar sesión/i });
    fireEvent.click(logoutButton);

    // Should complete without error; key remains absent
    await waitFor(() => {
      expect(sessionStorage.getItem(DISCLAIMER_SESSION_KEY)).toBeNull();
    });
  });
});
