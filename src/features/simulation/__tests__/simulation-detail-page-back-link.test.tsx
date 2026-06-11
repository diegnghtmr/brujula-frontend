/**
 * WU-2: BackLink wiring tests for SimulationDetailPage.
 *
 * Spec scenario:
 * - SimulationDetailPage (/simulations/:simulationId) must render a BackLink pointing to /simulations.
 * - The old ad-hoc "← Mis simulaciones" button must be REPLACED (not duplicated) by BackLink.
 * - Exactly ONE back affordance.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SimulationDetailPage } from "@/features/simulation/components/simulation-detail-page";

const SIMULATION_ID = "sim-back-1";

const SIMULATION_DETAIL = {
  id: SIMULATION_ID,
  name: "Simulación Back Test",
  periodId: "period-1",
  periodName: "2026-2",
  programIds: ["prog-1"],
  status: "CURRENT",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
  selections: [],
  creditSummary: [],
  weeklySchedule: [],
  totalWeeklyHours: 0,
  validation: { blocking: [], warnings: [] },
};

function createWrapper(path = `/simulations/${SIMULATION_ID}`) {
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

describe("SimulationDetailPage — BackLink (WU-2)", () => {
  it("renders a BackLink pointing to /simulations", async () => {
    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () =>
        HttpResponse.json(SIMULATION_DETAIL)
      )
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for simulation data to load
    await screen.findByText("Simulación Back Test");

    const backLink = screen.getByRole("link", { name: /volver/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/simulations");
  });

  it("the old ad-hoc button '← Mis simulaciones' is no longer present", async () => {
    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () =>
        HttpResponse.json(SIMULATION_DETAIL)
      )
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación Back Test");

    // The old text "← Mis simulaciones" should be gone
    expect(screen.queryByText(/mis simulaciones/i)).not.toBeInTheDocument();
  });

  it("has exactly ONE back affordance (no duplicates)", async () => {
    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () =>
        HttpResponse.json(SIMULATION_DETAIL)
      )
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Simulación Back Test");

    const backLinks = screen.getAllByRole("link", { name: /volver/i });
    expect(backLinks).toHaveLength(1);
  });
});
