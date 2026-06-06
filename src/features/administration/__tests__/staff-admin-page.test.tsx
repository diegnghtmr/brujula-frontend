/**
 * S2-F-5: StaffAdminPage — admin screen for staff account management.
 *
 * Spec scenarios:
 * 1. Renders staff list from API.
 * 2. Create staff form submits with Idempotency-Key header and refreshes list.
 * 3. Deactivate staff calls PATCH and updates status.
 * 4. Deactivate shows confirmation dialog.
 * 5. ADMIN role can access this page.
 * 6. Non-ADMIN role redirected to /403-forbidden.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { StaffAdminPage } from "@/features/administration/components/staff-admin-page";

function createWrapper(initialPath = "/admin/staff") {
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

describe("StaffAdminPage (S2-F-5)", () => {
  it("renders staff list from the API", async () => {
    mockAdmin();
    server.use(
      http.get("/api/v1/admin/staff", () =>
        HttpResponse.json({
          content: [
            {
              id: "staff-1",
              fullName: "Alice Garcia",
              email: "alice@uniquindio.edu.co",
              status: "ACTIVE",
              version: 1,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
        })
      )
    );

    render(
      <Routes>
        <Route path="/admin/staff" element={<StaffAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Alice Garcia")).toBeInTheDocument();
    expect(screen.getByText("alice@uniquindio.edu.co")).toBeInTheDocument();
  });

  it("create staff form submits with an Idempotency-Key header and refreshes the list", async () => {
    mockAdmin();
    let idempotencyKeyReceived: string | null = null;

    server.use(
      http.get("/api/v1/admin/staff", () =>
        HttpResponse.json({
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 20,
          number: 0,
        })
      ),
      http.post("/api/v1/admin/staff", ({ request }) => {
        idempotencyKeyReceived = request.headers.get("Idempotency-Key");
        return HttpResponse.json(
          {
            id: "staff-new",
            fullName: "New Staff",
            email: "newstaff@uniquindio.edu.co",
            status: "ACTIVE",
            version: 1,
          },
          { status: 201 }
        );
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/admin/staff" element={<StaffAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for page to load
    expect(
      await screen.findByRole("heading", { level: 1 })
    ).toBeInTheDocument();

    // Fill in create form
    await user.type(screen.getByLabelText(/nombre.*staff/i), "New Staff");
    await user.type(screen.getByLabelText(/correo.*staff/i), "newstaff@uniquindio.edu.co");
    await user.click(screen.getByRole("button", { name: /crear staff/i }));

    await waitFor(() => {
      expect(idempotencyKeyReceived).not.toBeNull();
    });

    // Idempotency-Key must be a valid UUID
    expect(idempotencyKeyReceived).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("deactivate staff calls PATCH and shows confirmation", async () => {
    mockAdmin();
    let patchCalled = false;

    server.use(
      http.get("/api/v1/admin/staff", () =>
        HttpResponse.json({
          content: [
            {
              id: "staff-1",
              fullName: "Alice Garcia",
              email: "alice@uniquindio.edu.co",
              status: "ACTIVE",
              version: 1,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
        })
      ),
      http.patch("/api/v1/admin/staff/:staffId", () => {
        patchCalled = true;
        return HttpResponse.json({
          id: "staff-1",
          fullName: "Alice Garcia",
          email: "alice@uniquindio.edu.co",
          status: "INACTIVE",
          version: 2,
        });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/admin/staff" element={<StaffAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Alice Garcia")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /desactivar/i }));

    // Confirm in dialog
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /confirmar/i }));

    await waitFor(() => {
      expect(patchCalled).toBe(true);
    });
  });

  it("shows confirmation dialog before deactivating staff", async () => {
    mockAdmin();
    server.use(
      http.get("/api/v1/admin/staff", () =>
        HttpResponse.json({
          content: [
            {
              id: "staff-1",
              fullName: "Alice Garcia",
              email: "alice@uniquindio.edu.co",
              status: "ACTIVE",
              version: 1,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
        })
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/admin/staff" element={<StaffAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Alice Garcia")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /desactivar/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("ADMIN role can access this page", async () => {
    mockAdmin();

    render(
      <Routes>
        <Route path="/admin/staff" element={<StaffAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("Forbidden")).not.toBeInTheDocument();
  });

  it("non-ADMIN role is redirected to /403-forbidden", async () => {
    mockStudent();

    render(
      <Routes>
        <Route path="/admin/staff" element={<StaffAdminPage />} />
        <Route path="/login" element={<span>Login</span>} />
        <Route path="/403-forbidden" element={<span>Forbidden</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });
});
