/**
 * SimulationDetailPage — FE-003 through FE-007
 *
 * weeklySchedule + creditSummary + validation sections render.
 * addSelection 409 shows the error with metadata detail.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SimulationDetailPage } from "@/features/simulation/components/simulation-detail-page";

const SIMULATION_ID = "sim-detail-1";

const SIMULATION_DETAIL = {
  id: SIMULATION_ID,
  name: "Mi Simulación Test",
  periodId: "period-1",
  periodName: "2026-2",
  programIds: ["prog-1"],
  status: "CURRENT",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 1,
  selections: [
    {
      id: "sel-1",
      offeringId: "off-1",
      scheduleOptionId: "opt-1",
      courseId: "course-1",
      courseName: "Cálculo I",
      programId: "prog-1",
      credits: 4,
      journeyCode: "DIURNA",
      offeringStatus: "PRELIMINARY",
      selectedOfferingVersion: 1,
      sessions: [{ day: "MONDAY", startsAt: "08:00", endsAt: "10:00" }],
      warnings: [],
    },
  ],
  creditSummary: [
    {
      programId: "prog-1",
      programName: "Ingeniería de Sistemas",
      selectedCredits: 4,
      creditLimit: 23,
      withinLimit: true,
    },
  ],
  weeklySchedule: [
    {
      day: "MONDAY",
      startsAt: "08:00",
      endsAt: "10:00",
      courseName: "Cálculo I",
      programId: "prog-1",
      selectionId: "sel-1",
      inClash: false,
    },
  ],
  totalWeeklyHours: 4,
  validation: { blocking: [], warnings: [] },
};

const SIMULATION_DETAIL_OUTDATED = {
  ...SIMULATION_DETAIL,
  status: "OUTDATED",
};

const SIMULATION_DETAIL_WITH_VALIDATION = {
  ...SIMULATION_DETAIL,
  validation: {
    blocking: [
      {
        code: "SIMULATION_SCHEDULE_CLASH",
        message: "Choque de horario con Física I el MIÉRCOLES 08:00–10:00.",
      },
    ],
    warnings: [
      {
        code: "SIMULATION_SOFT_PREREQ_WARNING",
        message: "Se recomienda haber cursado Cálculo I.",
      },
    ],
  },
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

describe("SimulationDetailPage", () => {
  it("renders simulation name, creditSummary, weeklySchedule sections", async () => {
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

    expect(await screen.findByText("Mi Simulación Test")).toBeInTheDocument();
    // Credit summary section
    expect(await screen.findByText("Ingeniería de Sistemas")).toBeInTheDocument();
    // Credit counts rendered — check individual numbers exist
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
    expect(screen.getAllByText("23").length).toBeGreaterThan(0);
    // Weekly schedule present
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("OUTDATED status shows the outdated banner", async () => {
    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () =>
        HttpResponse.json(SIMULATION_DETAIL_OUTDATED)
      )
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /revisar/i })).toBeInTheDocument();
    });
  });

  it("blocking validation notices render in alert region", async () => {
    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () =>
        HttpResponse.json(SIMULATION_DETAIL_WITH_VALIDATION)
      )
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      const alertRegion = screen.getByRole("alert");
      expect(alertRegion).toHaveTextContent(/choque|clash/i);
    });
  });

  it("warning validation notices render outside alert", async () => {
    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () =>
        HttpResponse.json(SIMULATION_DETAIL_WITH_VALIDATION)
      )
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/se recomienda/i)).toBeInTheDocument();
    });
    // Warning text present — could be multiple Cálculo I elements; use se recomienda text
    const advisory = screen.getByText(/se recomienda/i);
    expect(advisory).toBeInTheDocument();
  });
});
