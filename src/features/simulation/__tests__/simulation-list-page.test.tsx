/**
 * SimulationListPage — SIM-002, FE-001
 *
 * Lists simulations; status filter; create button navigates.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SimulationListPage } from "@/features/simulation/components/simulation-list-page";

const SIMULATIONS_FIXTURE = {
  content: [
    {
      id: "sim-1",
      name: "Simulación DIURNA 2026-2",
      periodId: "period-1",
      periodName: "2026-2",
      programIds: ["prog-1"],
      status: "CURRENT",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 1,
    },
    {
      id: "sim-2",
      name: "Simulación Desactualizada",
      periodId: "period-1",
      periodName: "2026-2",
      programIds: ["prog-2"],
      status: "OUTDATED",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 2,
    },
  ],
  totalElements: 2,
  totalPages: 1,
  size: 20,
  number: 0,
};

function createWrapper(path = "/simulations") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: [path] }, children)
    );
}

describe("SimulationListPage", () => {
  it("lists all simulations from GET /me/simulations", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Simulación DIURNA 2026-2")).toBeInTheDocument();
    expect(await screen.findByText("Simulación Desactualizada")).toBeInTheDocument();
  });

  it("shows CURRENT and OUTDATED status badges", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");
    // Status badges present (WCAG: color + text + icon)
    expect(screen.getByText("Vigente")).toBeInTheDocument();
    expect(screen.getByText("Desactualizada")).toBeInTheDocument();
  });

  it("create button navigates to /simulations/new", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () => HttpResponse.json(SIMULATIONS_FIXTURE))
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
        <Route path="/simulations/new" element={<div data-testid="create-page">Crear</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación DIURNA 2026-2");
    await user.click(screen.getByRole("button", { name: /nueva simulación|crear/i }));

    await waitFor(() => {
      expect(screen.getByTestId("create-page")).toBeInTheDocument();
    });
  });

  it("empty state renders when no simulations exist", async () => {
    server.use(
      http.get("/api/v1/me/simulations", () =>
        HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 })
      )
    );

    render(
      <Routes>
        <Route path="/simulations" element={<SimulationListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/no hay simulaciones|no tenés simulaciones/i)).toBeInTheDocument();
    });
  });
});
