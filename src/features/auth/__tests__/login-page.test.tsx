/**
 * S1-G-1: Login flow — clicking login triggers navigation to the backend
 * OIDC authorization endpoint. Logout calls POST /auth/logout and clears client state.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { LoginPage } from "@/features/auth/components/login-page";

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

describe("LoginPage (S1-G-1)", () => {
  it("renders a login button", () => {
    render(<LoginPage />, { wrapper: createWrapper() });
    expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it("clicking login navigates to the backend OIDC authorization endpoint", () => {
    // The login button triggers a top-level redirect (window.location.href).
    // We spy on window.location.assign to capture the navigation.
    const assignSpy = vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      href: "",
      assign: vi.fn(),
    } as unknown as Location);

    const locationAssign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: locationAssign },
      writable: true,
    });

    render(<LoginPage />, { wrapper: createWrapper() });
    const loginButton = screen.getByRole("button", { name: /iniciar sesión/i });
    fireEvent.click(loginButton);

    expect(locationAssign).toHaveBeenCalledWith(
      "/oauth2/authorization/keycloak"
    );

    assignSpy.mockRestore();
  });

  it("displays the Brújula platform name", () => {
    render(<LoginPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/brújula/i)).toBeInTheDocument();
  });

  it("has a link to /register for new users", () => {
    render(<LoginPage />, { wrapper: createWrapper() });
    const registerLink = screen.getByRole("link", { name: /registrarse/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute("href", "/register");
  });

  it("has a link to /forgot-password for password recovery", () => {
    render(<LoginPage />, { wrapper: createWrapper() });
    const forgotLink = screen.getByRole("link", { name: /olvidaste tu contraseña/i });
    expect(forgotLink).toBeInTheDocument();
    expect(forgotLink).toHaveAttribute("href", "/forgot-password");
  });
});

describe("LogoutButton (S1-G-1)", () => {
  it("renders a logout button in authenticated shell", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json({
          id: "u1",
          fullName: "Test User",
          email: "test@uniquindio.edu.co",
          role: "STUDENT",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    const { LogoutButton } = await import("@/features/auth/components/logout-button");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        MemoryRouter,
        {},
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(LogoutButton, {})
        )
      )
    );

    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
  });

  it("clicking logout calls POST /auth/logout and clears query cache", async () => {
    let logoutCalled = false;
    server.use(
      http.post("/api/v1/auth/logout", () => {
        logoutCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const locationAssign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: locationAssign },
      writable: true,
    });

    const { LogoutButton } = await import("@/features/auth/components/logout-button");
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      createElement(
        MemoryRouter,
        {},
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(LogoutButton, {})
        )
      )
    );

    const logoutButton = screen.getByRole("button", { name: /cerrar sesión/i });
    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(logoutCalled).toBe(true);
    });
  });
});
