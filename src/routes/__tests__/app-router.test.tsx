/**
 * S2-F-6: App routing — slice-2 routes registration.
 *
 * Spec scenarios:
 * 1. /register renders RegistrationPage (public).
 * 2. /verify-email renders EmailVerificationPage (public).
 * 3. /forgot-password renders ForgotPasswordPage (public).
 * 4. /admin/staff → RequireRole(ADMIN) → StaffAdminPage.
 * 5. /admin/allowed-domains → RequireRole(ADMIN) → AllowedDomainsAdminPage.
 *
 * Fase-2 CAT-001 auth guard scenarios:
 * 6. /catalog/programs unauthenticated → redirects to /login.
 * 7. /catalog/programs authenticated → renders ProgramListPage content.
 * 8. /catalog/plans/:planId unauthenticated → redirects to /login.
 * 9. /curriculum/plans/:planId/malla unauthenticated → redirects to /login.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { AppRoutes } from "@/routes/index";
import { vi } from "vitest";
import { ThemeProvider } from "@/components/theme/theme-provider";

describe("App routing slice-2 (S2-F-6)", () => {
  it("/register route exists and renders RegistrationPage content", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/register"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /crear cuenta/i })).toBeInTheDocument();
    });
  });

  it("/verify-email route exists and renders EmailVerificationPage content", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/verify-email"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /verificación/i })
      ).toBeInTheDocument();
    });
  });

  it("/forgot-password route exists and renders ForgotPasswordPage content", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/forgot-password"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /recuperar contraseña/i })
      ).toBeInTheDocument();
    });
  });

  it("/admin/staff with ADMIN role renders StaffAdminPage", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({
          id: "u1",
          fullName: "Admin",
          email: "admin@uniquindio.edu.co",
          role: "ADMIN",
          status: "ACTIVE",
          onboardingCompleted: true,
        })
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/admin/staff"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /gestión de staff/i })
      ).toBeInTheDocument();
    });
  });

  it("/admin/allowed-domains with ADMIN role renders AllowedDomainsAdminPage", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({
          id: "u1",
          fullName: "Admin",
          email: "admin@uniquindio.edu.co",
          role: "ADMIN",
          status: "ACTIVE",
          onboardingCompleted: true,
        })
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/admin/allowed-domains"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /dominios/i })
      ).toBeInTheDocument();
    });
  });
});

// Stub localStorage for tests that render AuthenticatedShell (which includes ThemeToggle)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

describe("App routing — Fase-2 catalog/curriculum auth guards (CAT-001)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorageMock.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("/catalog/programs unauthenticated redirects to /login", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 })
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/catalog/programs"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      // LoginPage renders h1 "Brújula" and a button "Iniciar sesión"
      expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });

  it("/catalog/programs authenticated renders ProgramListPage", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({
          id: "u1",
          fullName: "Student",
          email: "student@uniquindio.edu.co",
          role: "STUDENT",
          status: "ACTIVE",
          onboardingCompleted: true,
        })
      ),
      http.get("/api/v1/programs", () =>
        HttpResponse.json({
          content: [],
          page: 0,
          size: 20,
          totalElements: 0,
          totalPages: 0,
        })
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        ThemeProvider,
        { defaultTheme: "light" },
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(
            MemoryRouter,
            { initialEntries: ["/catalog/programs"] },
            createElement(AppRoutes, {})
          )
        )
      )
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /catálogo de programas/i })
      ).toBeInTheDocument();
    });
  });

  it("/catalog/plans/:planId unauthenticated redirects to /login", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 })
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/catalog/plans/plan-001"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });

  it("/curriculum/plans/:planId/malla unauthenticated redirects to /login", async () => {
    server.use(
      http.get("/api/v1/me", () =>
        HttpResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 })
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(
          MemoryRouter,
          { initialEntries: ["/curriculum/plans/plan-001/malla"] },
          createElement(AppRoutes, {})
        )
      )
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /iniciar sesión/i })).toBeInTheDocument();
    });
  });
});
