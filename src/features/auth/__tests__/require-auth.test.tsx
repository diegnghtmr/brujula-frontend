/**
 * RequireAuth route guard.
 * Tests: unauthenticated redirect, authenticated render, loading state.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RequireAuth } from "@/features/auth/components/require-auth";

const PROTECTED_TEXT = "Protected content";
const LOGIN_TEXT = "Login page";

function ProtectedPage() {
  return <div>{PROTECTED_TEXT}</div>;
}

function MockLoginPage() {
  return <div>{LOGIN_TEXT}</div>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<MockLoginPage />} />
      <Route
        path="/dashboard"
        element={
          <RequireAuth>
            <ProtectedPage />
          </RequireAuth>
        }
      />
    </Routes>
  );
}

describe("RequireAuth route guard", () => {
  it("redirects to /login when /me returns 401 (unauthenticated)", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json(
          { title: "Unauthorized", status: 401 },
          { status: 401 }
        );
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByText(PROTECTED_TEXT)).not.toBeInTheDocument();
      expect(screen.getByText(LOGIN_TEXT)).toBeInTheDocument();
    });
  });

  it("renders children when /me returns 200 (authenticated)", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json({
          id: "u1",
          fullName: "Student User",
          email: "student@uniquindio.edu.co",
          role: "STUDENT",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(PROTECTED_TEXT)).toBeInTheDocument();
    });
  });

  it("shows loading indicator while /me is pending", async () => {
    let resolveRequest!: () => void;
    const requestPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    server.use(
      http.get("/api/v1/me", async () => {
        await requestPromise;
        return HttpResponse.json({
          id: "u1",
          fullName: "Student User",
          email: "student@uniquindio.edu.co",
          role: "STUDENT",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </MemoryRouter>
    );

    // While loading, neither protected content nor login should show
    expect(screen.queryByText(PROTECTED_TEXT)).not.toBeInTheDocument();
    expect(screen.queryByText(LOGIN_TEXT)).not.toBeInTheDocument();

    resolveRequest();
    await waitFor(() => {
      expect(screen.getByText(PROTECTED_TEXT)).toBeInTheDocument();
    });
  });

  it("renders children directly when used with authenticated wrapper", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json({
          id: "u2",
          fullName: "Admin User",
          email: "admin@uniquindio.edu.co",
          role: "ADMIN",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path="/login" element={<MockLoginPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <div>Admin Area</div>
                </RequireAuth>
              }
            />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Area")).toBeInTheDocument();
    });
  });
});
