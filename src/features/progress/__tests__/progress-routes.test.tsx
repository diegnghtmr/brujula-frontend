/**
 * WU5: Progress routes — RequireAuth guard verification.
 *
 * Spec: Fase-2 C-1 lesson: every new route MUST be wrapped in RequireAuth + AuthenticatedShell.
 * An unauthenticated visit to a progress route must redirect to /login.
 *
 * FIX-W-1: tests now positively assert the login route rendered (not just content absence),
 * so these tests would fail if the RequireAuth guard were removed.
 *
 * FIX-S-1: added guard + render coverage for the two parametric routes
 * /progress/subscriptions/:subscriptionId/declare and /progress/subscriptions/:subscriptionId/progress.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { AppRoutes } from "@/routes/index";

const SUBSCRIPTION_ID = "sub-guard-1";

function createWrapper(initialPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [initialPath] }, children)
    );
}

function setupUnauthed() {
  server.use(
    http.get("/api/v1/me", () =>
      HttpResponse.json({ title: "Unauthorized", status: 401 }, { status: 401 })
    )
  );
}

describe("Progress routes — RequireAuth guard", () => {
  it("unauthenticated visit to /progress/subscribe redirects to /login", async () => {
    setupUnauthed();

    render(<AppRoutes />, {
      wrapper: createWrapper("/progress/subscribe"),
    });

    // Positively assert: login page rendered (W-1 fix — test fails if guard removed)
    await screen.findByText(/iniciar sesión/i);
    // Protected content not shown
    expect(
      screen.queryByText(/Suscribirse a un programa/i)
    ).not.toBeInTheDocument();
  });

  it("unauthenticated visit to /progress/subscriptions redirects to /login", async () => {
    setupUnauthed();

    render(<AppRoutes />, {
      wrapper: createWrapper("/progress/subscriptions"),
    });

    // Positively assert: login page rendered (W-1 fix)
    await screen.findByText(/iniciar sesión/i);
    // Protected content not shown
    expect(
      screen.queryByText(/Mis suscripciones/i)
    ).not.toBeInTheDocument();
  });

  it("unauthenticated visit to /progress/subscriptions/:id/declare redirects to /login", async () => {
    // S-1 fix: covers the parametric declare route
    setupUnauthed();

    render(<AppRoutes />, {
      wrapper: createWrapper(`/progress/subscriptions/${SUBSCRIPTION_ID}/declare`),
    });

    // Positively assert: login page rendered
    await screen.findByText(/iniciar sesión/i);
    // Protected content not shown
    expect(
      screen.queryByText(/Declarar avance académico/i)
    ).not.toBeInTheDocument();
  });

  it("unauthenticated visit to /progress/subscriptions/:id/progress redirects to /login", async () => {
    // S-1 fix: covers the parametric progress route
    setupUnauthed();

    render(<AppRoutes />, {
      wrapper: createWrapper(`/progress/subscriptions/${SUBSCRIPTION_ID}/progress`),
    });

    // Positively assert: login page rendered
    await screen.findByText(/iniciar sesión/i);
    // Protected content not shown
    expect(
      screen.queryByText(/Avance académico/i)
    ).not.toBeInTheDocument();
  });

  it("unauthenticated visit to /progress/subscriptions/:id/attempts redirects to /login", async () => {
    // W-2: covers the attempt history route
    setupUnauthed();

    render(<AppRoutes />, {
      wrapper: createWrapper(`/progress/subscriptions/${SUBSCRIPTION_ID}/attempts`),
    });

    // Positively assert: login page rendered
    await screen.findByText(/iniciar sesión/i);
    // Protected content not shown
    expect(
      screen.queryByText(/Historial de intentos/i)
    ).not.toBeInTheDocument();
  });
});
