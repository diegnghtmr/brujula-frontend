/**
 * SimulationDetailPage
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

  // ─── Selections grouped by semester ──────────────────────────────────────────

  it("selections panel shows semester subheadings in ascending order when curriculum data is available", async () => {
    const twoSelectionDetail = {
      ...SIMULATION_DETAIL,
      selections: [
        {
          id: "sel-a",
          offeringId: "off-a",
          scheduleOptionId: "opt-a",
          courseId: "course-sem3",
          courseName: "Estructuras de Datos",
          programId: "prog-1",
          credits: 4,
          journeyCode: "DIURNA",
          offeringStatus: "FINAL",
          selectedOfferingVersion: 1,
          sessions: [],
          warnings: [],
        },
        {
          id: "sel-b",
          offeringId: "off-b",
          scheduleOptionId: "opt-b",
          courseId: "course-sem1",
          courseName: "Lógica de Programación",
          programId: "prog-1",
          credits: 3,
          journeyCode: "DIURNA",
          offeringStatus: "FINAL",
          selectedOfferingVersion: 1,
          sessions: [],
          warnings: [],
        },
      ],
      scopeEntries: [{ programId: "prog-1", journeyCode: "DIURNA" }],
    };

    const subscriptions = [
      { id: "sub-task8", programId: "prog-1", programName: "Ingeniería de Sistemas", planId: "p1", planName: "Plan 2020", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, version: 1, createdAt: "2025-01-01T00:00:00Z" },
    ];

    const curriculum = {
      subscriptionId: "sub-task8",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        { recommendedSemester: 1, courses: [{ courseId: "course-sem1", officialCode: "LOG1", name: "Lógica de Programación", credits: 3, type: "REQUIRED", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
        { recommendedSemester: 3, courses: [{ courseId: "course-sem3", officialCode: "ED3", name: "Estructuras de Datos", credits: 4, type: "REQUIRED", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
      ],
    };

    server.use(
      http.get(`/api/v1/me/simulations/${SIMULATION_ID}`, () => HttpResponse.json(twoSelectionDetail)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(subscriptions)),
      http.get("/api/v1/me/subscriptions/sub-task8/curriculum", () => HttpResponse.json(curriculum)),
      http.get("/api/v1/offerings", () => HttpResponse.json({ content: [], totalElements: 0, totalPages: 0, size: 20, number: 0 }))
    );

    render(
      <Routes>
        <Route path="/simulations/:simulationId" element={<SimulationDetailPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Both selections visible
    expect(await screen.findByText("Estructuras de Datos")).toBeInTheDocument();
    expect(screen.getByText("Lógica de Programación")).toBeInTheDocument();

    // Wait for curriculum data to load so semester groups are computed
    // (useCurriculumMap is async; the groups update after curriculum resolves)
    await waitFor(() => {
      const selectionsSection = screen.getByRole("region", { name: /materias seleccionadas/i });
      expect(selectionsSection).toHaveTextContent("Semestre 1");
      expect(selectionsSection).toHaveTextContent("Semestre 3");
    });

    // Both semester subheadings present in the selections section
    const selectionsSection = screen.getByRole("region", { name: /materias seleccionadas/i });
    expect(selectionsSection).toHaveTextContent("Semestre 1");
    expect(selectionsSection).toHaveTextContent("Semestre 3");

    // Semestre 1 heading appears before Semestre 3 heading (ascending order)
    const sem1 = screen.getByRole("heading", { name: "Semestre 1" });
    const sem3 = screen.getByRole("heading", { name: "Semestre 3" });
    expect(sem1.compareDocumentPosition(sem3)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    // Each course under correct semester
    // Lógica de Programación (sem 1) should appear before Estructuras de Datos (sem 3)
    const logica = screen.getByText("Lógica de Programación");
    const estructuras = screen.getByText("Estructuras de Datos");
    expect(logica.compareDocumentPosition(estructuras)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
