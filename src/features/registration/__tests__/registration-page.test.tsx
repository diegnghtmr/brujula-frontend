/**
 * S2-F-1: RegistrationPage — student self-registration form.
 *
 * Spec scenarios:
 * 1. Renders form with email, fullName, terms + privacy checkboxes (NO password).
 * 2. Happy path: valid submit → calls registration API → shows success notice.
 * 3. 422 domain not allowed → shows domain error.
 * 4. 409 email already registered → shows duplicate error.
 * 5. 422 terms version mismatch → shows terms error.
 * 6. Required field validation fires before API call (consent required).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { RegistrationPage } from "@/features/registration/components/registration-page";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ["/register"] }, children)
    );
}

describe("RegistrationPage (S2-F-1)", () => {
  it("renders registration form with email, fullName, terms and privacy consent fields (NO password field)", () => {
    render(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nombre/i)).toBeInTheDocument();
    // Terms and privacy checkboxes
    expect(screen.getByLabelText(/términos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tratamiento/i)).toBeInTheDocument();
    // No password field
    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
  });

  it("submits with valid data and shows success notice", async () => {
    server.use(
      http.post("/api/v1/auth/registration", () =>
        HttpResponse.json(
          {
            userId: "u-1",
            status: "PENDING_VERIFICATION",
            message: "Te enviamos un correo de verificación.",
          },
          { status: 202 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/login" element={<span>Login</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "estudiante@uniquindio.edu.co");
    await user.type(screen.getByLabelText(/nombre/i), "Estudiante Prueba");
    await user.click(screen.getByLabelText(/términos/i));
    await user.click(screen.getByLabelText(/tratamiento/i));
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/revisá tu correo/i)
      ).toBeInTheDocument();
    });
  });

  it("shows domain not allowed error on 422 with DOMAIN_NOT_ALLOWED code", async () => {
    server.use(
      http.post("/api/v1/auth/registration", () =>
        HttpResponse.json(
          {
            type: "https://brujula.uniquindio.edu.co/errors/domain-not-allowed",
            title: "Domain not allowed",
            status: 422,
            detail: "El dominio del correo no está habilitado.",
            code: "DOMAIN_NOT_ALLOWED",
          },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "estudiante@gmail.com");
    await user.type(screen.getByLabelText(/nombre/i), "Estudiante Prueba");
    await user.click(screen.getByLabelText(/términos/i));
    await user.click(screen.getByLabelText(/tratamiento/i));
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/dominio/i);
  });

  it("shows email already registered error on 409", async () => {
    server.use(
      http.post("/api/v1/auth/registration", () =>
        HttpResponse.json(
          {
            type: "https://brujula.uniquindio.edu.co/errors/email-already-registered",
            title: "Email already registered",
            status: 409,
            detail: "El correo ya está registrado.",
            code: "EMAIL_ALREADY_REGISTERED",
          },
          { status: 409 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "existente@uniquindio.edu.co");
    await user.type(screen.getByLabelText(/nombre/i), "Usuario Existente");
    await user.click(screen.getByLabelText(/términos/i));
    await user.click(screen.getByLabelText(/tratamiento/i));
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toHaveTextContent(/correo/i);
  });

  it("blocks submit when consent checkboxes are unchecked (required validation)", async () => {
    const user = userEvent.setup();
    const mutateSpy = vi.fn();

    server.use(
      http.post("/api/v1/auth/registration", () => {
        mutateSpy();
        return HttpResponse.json({}, { status: 202 });
      })
    );

    render(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "estudiante@uniquindio.edu.co");
    await user.type(screen.getByLabelText(/nombre/i), "Estudiante Prueba");
    // Intentionally do NOT check consent boxes
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => {
      // Validation errors appear before any API call
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    });
    expect(mutateSpy).not.toHaveBeenCalled();
  });

  it("shows terms version mismatch error on 422 with TERMS_VERSION_MISMATCH code", async () => {
    server.use(
      http.post("/api/v1/auth/registration", () =>
        HttpResponse.json(
          {
            type: "https://brujula.uniquindio.edu.co/errors/terms-version-mismatch",
            title: "Terms version mismatch",
            status: 422,
            detail: "La versión de los términos no coincide.",
            code: "TERMS_VERSION_MISMATCH",
          },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await user.type(screen.getByLabelText(/correo/i), "estudiante@uniquindio.edu.co");
    await user.type(screen.getByLabelText(/nombre/i), "Estudiante Prueba");
    await user.click(screen.getByLabelText(/términos/i));
    await user.click(screen.getByLabelText(/tratamiento/i));
    await user.click(screen.getByRole("button", { name: /registrar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
