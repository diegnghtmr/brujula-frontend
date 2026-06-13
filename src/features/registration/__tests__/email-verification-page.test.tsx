/**
 * EmailVerificationPage — landing screen after email verification.
 *
 * Architecture note:
 * Keycloak handles verification natively. The user clicks the email link → Keycloak's page
 * → redirects to SPA. This page shows instructions + a "reenviar" action.
 * There is NO token-confirm form here.
 *
 * Spec scenarios:
 * 1. Renders verification instructions and a "reenviar" button.
 * 2. Resend button calls the resend endpoint and shows confirmation.
 * 3. Shows the same confirmation regardless of email existence (no user enumeration).
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { EmailVerificationPage } from "@/features/registration/components/email-verification-page";

function createWrapper(initialPath = "/verify-email") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: [initialPath] },
        children
      )
    );
}

describe("EmailVerificationPage (S2-F-2)", () => {
  it("renders verification instructions with a resend button", () => {
    render(
      <Routes>
        <Route path="/verify-email" element={<EmailVerificationPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("heading")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reenviar/i })
    ).toBeInTheDocument();
  });

  it("clicking resend calls the resend API and shows a confirmation message", async () => {
    let resendCalled = false;
    server.use(
      http.post("/api/v1/auth/email-verifications/resend", () => {
        resendCalled = true;
        return new HttpResponse(null, { status: 202 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/verify-email" element={<EmailVerificationPage />} />
      </Routes>,
      { wrapper: createWrapper("/verify-email?email=test@uniquindio.edu.co") }
    );

    await user.click(screen.getByRole("button", { name: /reenviar/i }));

    await waitFor(() => {
      expect(resendCalled).toBe(true);
    });

    await waitFor(() => {
      expect(screen.getByText(/recibirás/i)).toBeInTheDocument();
    });
  });

  it("shows the same confirmation for any email (no user enumeration)", async () => {
    server.use(
      http.post("/api/v1/auth/email-verifications/resend", () => {
        // Returns 202 even for unknown emails
        return new HttpResponse(null, { status: 202 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/verify-email" element={<EmailVerificationPage />} />
      </Routes>,
      { wrapper: createWrapper("/verify-email?email=unknown@uniquindio.edu.co") }
    );

    await user.click(screen.getByRole("button", { name: /reenviar/i }));

    await waitFor(() => {
      expect(screen.getByText(/recibirás/i)).toBeInTheDocument();
    });
  });
});
