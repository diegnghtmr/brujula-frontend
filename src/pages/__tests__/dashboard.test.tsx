/**
 * DashboardPage — A.3.3 RED tests (Slice A).
 *
 * Spec scenarios:
 * - Subscriptions list renders with CTAs (Declarar avance, Ver resumen)
 * - Empty subscriptions state renders with Suscribirse CTA
 * - Global CTAs present (Crear simulación, Explorar Catálogo)
 * - GET /api/v1/me for profile card
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { DashboardPage } from "@/pages/dashboard";

const ME_FIXTURE = {
  id: "u1",
  fullName: "Ana Estudiante",
  email: "ana@uniquindio.edu.co",
  role: "STUDENT",
  status: "ACTIVE",
  onboardingCompleted: true,
};

const SUBSCRIPTIONS_FIXTURE = [
  {
    id: "sub-1",
    programId: "prog-1",
    programName: "Ingeniería de Sistemas",
    planId: "plan-1",
    planName: "Plan 2020",
    referenceJourney: { code: "DIURNA", name: "Diurna" },
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "sub-2",
    programId: "prog-2",
    programName: "Ingeniería Electrónica",
    planId: "plan-2",
    planName: "Plan 2021",
    referenceJourney: { code: "NOCTURNA", name: "Nocturna" },
    version: 1,
    createdAt: "2026-01-01T00:00:00Z",
  },
];

function createWrapper(initialPath = "/dashboard") {
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

describe("DashboardPage — pivot hub", () => {
  it("renders subscription cards with CTAs when subscriptions exist", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json(ME_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json(SUBSCRIPTIONS_FIXTURE)
      )
    );

    render(
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Both subscription program names rendered
    expect(
      await screen.findByText("Ingeniería de Sistemas")
    ).toBeInTheDocument();
    expect(screen.getByText("Ingeniería Electrónica")).toBeInTheDocument();

    // Each card has a "Declarar avance" CTA
    const declararButtons = screen.getAllByRole("link", {
      name: /declarar avance/i,
    });
    expect(declararButtons).toHaveLength(2);

    // Each card has a "Ver resumen" CTA
    const verResumenButtons = screen.getAllByRole("link", {
      name: /ver resumen/i,
    });
    expect(verResumenButtons).toHaveLength(2);
  });

  it("Declarar avance links point to correct hrefs", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json(ME_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json(SUBSCRIPTIONS_FIXTURE)
      )
    );

    render(
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    const declararLinks = screen.getAllByRole("link", {
      name: /declarar avance/i,
    });
    expect(declararLinks[0]).toHaveAttribute(
      "href",
      "/progress/subscriptions/sub-1/declare"
    );
    expect(declararLinks[1]).toHaveAttribute(
      "href",
      "/progress/subscriptions/sub-2/declare"
    );
  });

  it("Ver resumen links point to correct hrefs", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json(ME_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json(SUBSCRIPTIONS_FIXTURE)
      )
    );

    render(
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    const verResumenLinks = screen.getAllByRole("link", {
      name: /ver resumen/i,
    });
    expect(verResumenLinks[0]).toHaveAttribute(
      "href",
      "/progress/subscriptions/sub-1/progress"
    );
    expect(verResumenLinks[1]).toHaveAttribute(
      "href",
      "/progress/subscriptions/sub-2/progress"
    );
  });

  it("renders global CTAs: Crear simulación and Explorar Catálogo", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json(ME_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json(SUBSCRIPTIONS_FIXTURE)
      )
    );

    render(
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    expect(
      screen.getByRole("link", { name: /crear simulación/i })
    ).toHaveAttribute("href", "/simulations/new");

    expect(
      screen.getByRole("link", { name: /explorar catálogo/i })
    ).toHaveAttribute("href", "/catalog/programs");
  });

  it("renders empty-state with Suscribirse CTA when no subscriptions", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json(ME_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /suscribirse/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /suscribirse/i })
    ).toHaveAttribute("href", "/progress/subscribe");
  });

  it("global CTAs still present in empty-state", async () => {
    server.use(
      http.get("/api/v1/me", () => HttpResponse.json(ME_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: /crear simulación/i })
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /explorar catálogo/i })
    ).toBeInTheDocument();
  });
});
