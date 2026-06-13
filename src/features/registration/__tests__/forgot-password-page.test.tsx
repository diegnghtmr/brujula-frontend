/**
 * ForgotPasswordPage — password recovery initiation screen (/forgot-password).
 *
 * Architecture:
 * The backend initiates Keycloak execute-actions-email [UPDATE_PASSWORD].
 * Keycloak handles the reset page natively. No /reset-password page in the SPA.
 *
 * Spec scenarios:
 * 1. Renders email input form.
 * 2. Submit calls the recovery API and shows uniform confirmation.
 * 3. Same confirmation for any email (no user enumeration in UI).
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { ForgotPasswordPage } from "@/features/registration/components/forgot-password-page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ["/forgot-password"] }, children)
    );
}

describe("ForgotPasswordPage (S2-F-3)", () => {
  it("renders an email input form", () => {
    render(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /enviar/i })).toBeInTheDocument();
  });

  it("submitting calls the recovery API and shows a uniform confirmation", async () => {
    let recoveryCalled = false;
    server.use(
      http.post("/api/v1/auth/password-recovery", () => {
        recoveryCalled = true;
        return new HttpResponse(null, { status: 202 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "estudiante@uniquindio.edu.co");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(recoveryCalled).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText(/instrucciones/i)).toBeInTheDocument();
    });
  });

  it("shows the same confirmation for unknown email (no user enumeration)", async () => {
    server.use(
      http.post("/api/v1/auth/password-recovery", () => {
        return new HttpResponse(null, { status: 202 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "desconocido@uniquindio.edu.co");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/instrucciones/i)).toBeInTheDocument();
    });
  });
});
