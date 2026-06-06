/**
 * S2-F-6: App routing — slice-2 routes registration.
 *
 * Spec scenarios:
 * 1. /register renders RegistrationPage (public).
 * 2. /verify-email renders EmailVerificationPage (public).
 * 3. /forgot-password renders ForgotPasswordPage (public).
 * 4. /admin/staff → RequireRole(ADMIN) → StaffAdminPage.
 * 5. /admin/allowed-domains → RequireRole(ADMIN) → AllowedDomainsAdminPage.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { AppRoutes } from "@/routes/index";

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
