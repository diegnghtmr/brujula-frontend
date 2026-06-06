/**
 * S2-F-7: RequireRole — role-based route guard.
 *
 * Spec scenarios:
 * 1. Renders children when user has the required role.
 * 2. Redirects to /403-forbidden when user lacks the required role.
 * 3. Redirects to /login when user is unauthenticated.
 * 4. Shows spinner while loading.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { RequireRole } from "@/features/auth/components/require-role";

function createWrapper(initialPath = "/protected") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
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

function mockUser(role: string) {
  server.use(
    http.get("/api/v1/me", () =>
      HttpResponse.json({
        id: "u1",
        fullName: "Test User",
        email: "test@uniquindio.edu.co",
        role,
        status: "ACTIVE",
        onboardingCompleted: true,
      })
    )
  );
}

function mockUnauthenticated() {
  server.use(
    http.get("/api/v1/me", () =>
      new HttpResponse(null, { status: 401 })
    )
  );
}

describe("RequireRole (S2-F-7)", () => {
  it("renders children when user has the required role", async () => {
    mockUser("ADMIN");
    render(
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireRole requiredRole="ADMIN">
              <span>Admin content</span>
            </RequireRole>
          }
        />
        <Route path="/login" element={<span>Login page</span>} />
        <Route path="/403-forbidden" element={<span>Access denied</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Admin content")).toBeInTheDocument();
  });

  it("redirects to /403-forbidden when user lacks the required role", async () => {
    mockUser("STUDENT");
    render(
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireRole requiredRole="ADMIN">
              <span>Admin content</span>
            </RequireRole>
          }
        />
        <Route path="/login" element={<span>Login page</span>} />
        <Route path="/403-forbidden" element={<span>Access denied</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  it("redirects to /login when user is unauthenticated", async () => {
    mockUnauthenticated();
    render(
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireRole requiredRole="ADMIN">
              <span>Admin content</span>
            </RequireRole>
          }
        />
        <Route path="/login" element={<span>Login page</span>} />
        <Route path="/403-forbidden" element={<span>Access denied</span>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });

  it("shows a loading spinner while user data is loading", () => {
    // Simulate slow network — /me never resolves during this render
    server.use(
      http.get("/api/v1/me", async () => {
        await new Promise(() => {});
        return new HttpResponse(null, { status: 200 });
      })
    );

    render(
      <Routes>
        <Route
          path="/protected"
          element={
            <RequireRole requiredRole="ADMIN">
              <span>Admin content</span>
            </RequireRole>
          }
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument();
  });
});
