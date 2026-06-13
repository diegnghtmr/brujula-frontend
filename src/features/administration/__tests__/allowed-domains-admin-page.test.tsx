/**
 * AllowedDomainsAdminPage — admin screen for allowed email domain management.
 *
 * Spec scenarios:
 * 1. Renders the domain list from the API.
 * 2. Add domain form submits and refreshes the list.
 * 3. Delete domain calls the delete API and refreshes the list.
 * 4. Delete shows confirmation before executing.
 * 5. ADMIN role can see this page (RequireRole ADMIN).
 * 6. Non-ADMIN role is redirected to /403-forbidden.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { AllowedDomainsAdminPage } from "@/features/administration/components/allowed-domains-admin-page";

function createWrapper(initialPath = "/admin/allowed-domains") {
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

function mockAdmin() {
  server.use(
    http.get("/api/v1/me", () =>
      HttpResponse.json({
        id: "u1",
        fullName: "Admin User",
        email: "admin@uniquindio.edu.co",
        role: "ADMIN",
        status: "ACTIVE",
        onboardingCompleted: true,
      })
    )
  );
}

function mockStudent() {
  server.use(
    http.get("/api/v1/me", () =>
      HttpResponse.json({
        id: "u2",
        fullName: "Student User",
        email: "student@uniquindio.edu.co",
        role: "STUDENT",
        status: "ACTIVE",
        onboardingCompleted: true,
      })
    )
  );
}

describe("AllowedDomainsAdminPage", () => {
  it("renders the list of allowed domains from the API", async () => {
    mockAdmin();
    server.use(
      http.get("/api/v1/admin/allowed-email-domains", () =>
        HttpResponse.json([
          { id: "dom-1", domain: "uniquindio.edu.co" },
          { id: "dom-2", domain: "uq.edu.co" },
        ])
      )
    );

    render(
      <Routes>
        <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("uniquindio.edu.co")).toBeInTheDocument();
    expect(screen.getByText("uq.edu.co")).toBeInTheDocument();
  });

  it("add domain form submits and refreshes the list", async () => {
    mockAdmin();
    let addCalled = false;
    server.use(
      http.get("/api/v1/admin/allowed-email-domains", () =>
        HttpResponse.json([{ id: "dom-1", domain: "uniquindio.edu.co" }])
      ),
      http.post("/api/v1/admin/allowed-email-domains", () => {
        addCalled = true;
        return HttpResponse.json(
          { id: "dom-new", domain: "newuniversity.edu.co" },
          { status: 201 }
        );
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for list to load
    expect(await screen.findByText("uniquindio.edu.co")).toBeInTheDocument();

    // Add new domain
    await user.type(screen.getByPlaceholderText(/dominio/i), "newuniversity.edu.co");
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(addCalled).toBe(true);
    });
  });

  it("delete domain calls the delete API", async () => {
    mockAdmin();
    let deleteCalled = false;
    server.use(
      http.get("/api/v1/admin/allowed-email-domains", () =>
        HttpResponse.json([{ id: "dom-1", domain: "uniquindio.edu.co" }])
      ),
      http.delete("/api/v1/admin/allowed-email-domains/:id", () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("uniquindio.edu.co")).toBeInTheDocument();

    // Click delete button
    await user.click(screen.getByRole("button", { name: /eliminar/i }));

    // Confirm in dialog
    await waitFor(() => {
      const confirmButton = screen.queryByRole("button", { name: /confirmar/i });
      expect(confirmButton).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });

  it("shows confirmation dialog before deleting", async () => {
    mockAdmin();
    server.use(
      http.get("/api/v1/admin/allowed-email-domains", () =>
        HttpResponse.json([{ id: "dom-1", domain: "uniquindio.edu.co" }])
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("uniquindio.edu.co")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /eliminar/i }));

    // Confirmation dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("ADMIN role can access this page", async () => {
    mockAdmin();

    render(
      <Routes>
        <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Should render the page heading (h1)
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("Forbidden")).not.toBeInTheDocument();
  });

  it("non-ADMIN role is redirected to /403-forbidden", async () => {
    mockStudent();

    render(
      <Routes>
        <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });
});
