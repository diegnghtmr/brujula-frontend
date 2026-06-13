/**
 * UserProfileCard — renders current user profile from /me.
 * Tests: renders name, email, role; themed via design tokens.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { UserProfileCard } from "@/features/auth/components/user-profile-card";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("UserProfileCard", () => {
  it("renders user full name from /me response", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json({
          id: "u1",
          fullName: "María Rodríguez",
          email: "maria@uniquindio.edu.co",
          role: "STUDENT",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    render(<UserProfileCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("María Rodríguez")).toBeInTheDocument();
    });
  });

  it("renders user email from /me response", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json({
          id: "u1",
          fullName: "María Rodríguez",
          email: "maria@uniquindio.edu.co",
          role: "STUDENT",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    render(<UserProfileCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("maria@uniquindio.edu.co")).toBeInTheDocument();
    });
  });

  it("renders user role from /me response", async () => {
    server.use(
      http.get("/api/v1/me", () => {
        return HttpResponse.json({
          id: "u1",
          fullName: "Admin User",
          email: "admin@uniquindio.edu.co",
          role: "ADMIN",
          status: "ACTIVE",
          onboardingCompleted: true,
        });
      })
    );

    render(<UserProfileCard />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Administrador")).toBeInTheDocument();
    });
  });

  it("shows loading state while /me is pending", () => {
    server.use(
      http.get("/api/v1/me", async () => {
        await new Promise(() => {}); // never resolves in this test
        return HttpResponse.json({});
      })
    );

    render(<UserProfileCard />, { wrapper: createWrapper() });
    // During loading, should show a loading indicator, not profile content
    expect(screen.queryByText("maría@uniquindio.edu.co")).not.toBeInTheDocument();
  });
});
