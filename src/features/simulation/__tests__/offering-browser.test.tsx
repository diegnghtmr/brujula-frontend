/**
 * OfferingBrowser — FE-002, FE-003
 *
 * Filtered offerings rendered from MSW.
 * Option picker fires addSelection mutation.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { OfferingBrowser } from "@/features/simulation/components/offering-browser";

const PERIOD_ID = "period-1";
const PROGRAM_ID = "prog-1";
const PROGRAM_ID_2 = "prog-2";
const SIMULATION_ID = "sim-1";

const OFFERINGS_FIXTURE = {
  content: [
    {
      id: "off-1",
      courseId: "course-1",
      courseName: "Cálculo I",
      programId: PROGRAM_ID,
      periodId: PERIOD_ID,
      status: "PRELIMINARY",
      version: 1,
    },
    {
      id: "off-2",
      courseId: "course-2",
      courseName: "Física I",
      programId: PROGRAM_ID,
      periodId: PERIOD_ID,
      status: "FINAL",
      version: 1,
    },
  ],
  totalElements: 2,
  totalPages: 1,
  size: 20,
  number: 0,
};

const OFFERING_DETAIL = {
  id: "off-1",
  courseId: "course-1",
  courseName: "Cálculo I",
  programId: PROGRAM_ID,
  periodId: PERIOD_ID,
  status: "PRELIMINARY",
  version: 1,
  scheduleOptions: [
    {
      id: "opt-1",
      offeringId: "off-1",
      label: "Grupo A",
      journeyCode: "DIURNA",
      weeklyHours: 4,
      sessions: [
        { day: "MONDAY", startsAt: "08:00", endsAt: "10:00" },
        { day: "WEDNESDAY", startsAt: "08:00", endsAt: "10:00" },
      ],
      version: 1,
    },
  ],
};

const SELECTION_CREATED = {
  id: "sel-1",
  offeringId: "off-1",
  scheduleOptionId: "opt-1",
  courseId: "course-1",
  courseName: "Cálculo I",
  programId: PROGRAM_ID,
  credits: 4,
  journeyCode: "DIURNA",
  offeringStatus: "PRELIMINARY",
  selectedOfferingVersion: 1,
  sessions: [
    { day: "MONDAY", startsAt: "08:00", endsAt: "10:00" },
  ],
  warnings: [],
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, {}, children)
    );
}

describe("OfferingBrowser", () => {
  it("renders offerings filtered by periodId and programId from MSW", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        programIds={[PROGRAM_ID]}
      />,
      { wrapper: createWrapper() }
    );

    // Both offerings rendered
    expect(await screen.findByText("Cálculo I")).toBeInTheDocument();
    expect(await screen.findByText("Física I")).toBeInTheDocument();
  });

  it("clicking on offering expands schedule options", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        programIds={[PROGRAM_ID]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    // Click to expand
    await user.click(screen.getByRole("button", { name: /cálculo i/i }));

    // Schedule option "Grupo A" visible
    await waitFor(() => {
      expect(screen.getByText("Grupo A")).toBeInTheDocument();
    });
  });

  it("Add button fires addSelection mutation to POST /me/simulations/:id/selections", async () => {
    let capturedBody: unknown = null;
    let capturedIdempotencyKey: string | null = null;

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL)),
      http.post(`/api/v1/me/simulations/${SIMULATION_ID}/selections`, async ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        capturedBody = await request.json();
        return HttpResponse.json(SELECTION_CREATED, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        programIds={[PROGRAM_ID]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");

    // Expand offering
    await user.click(screen.getByRole("button", { name: /cálculo i/i }));
    await waitFor(() => {
      expect(screen.getByText("Grupo A")).toBeInTheDocument();
    });

    // Click "Agregar" button for the schedule option
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(capturedIdempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      // scheduleOptionId from data — not hardcoded
      expect(capturedBody).toMatchObject({ scheduleOptionId: "opt-1" });
    });
  });

  /**
   * RED→GREEN test for FE-002 multi-program gap.
   * This test MUST FAIL against the original single-programId code.
   * It passes only after OfferingBrowser fetches ALL programIds.
   */
  it("renders offerings from ALL programIds — second program offerings must appear (FE-002)", async () => {
    // Prog-1 offerings
    const prog1Offerings = {
      content: [
        {
          id: "off-p1",
          courseId: "course-p1",
          courseName: "Cálculo Diferencial",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "PUBLISHED",
          version: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    // Prog-2 offerings — DISTINCT from prog-1
    const prog2Offerings = {
      content: [
        {
          id: "off-p2",
          courseId: "course-p2",
          courseName: "Álgebra Lineal",
          programId: PROGRAM_ID_2,
          periodId: PERIOD_ID,
          status: "PUBLISHED",
          version: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    server.use(
      // Return different offerings based on programId query param
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        const programId = url.searchParams.get("programId");
        if (programId === PROGRAM_ID_2) return HttpResponse.json(prog2Offerings);
        return HttpResponse.json(prog1Offerings);
      })
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        programIds={[PROGRAM_ID, PROGRAM_ID_2]}
      />,
      { wrapper: createWrapper() }
    );

    // Both programs' offerings must be visible
    expect(await screen.findByText("Cálculo Diferencial")).toBeInTheDocument();
    expect(await screen.findByText("Álgebra Lineal")).toBeInTheDocument();
  });

  it("409 blocking error from addSelection shown in UI", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL)),
      http.post(`/api/v1/me/simulations/${SIMULATION_ID}/selections`, () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Simulation Schedule Clash",
            status: 409,
            code: "SIMULATION_SCHEDULE_CLASH",
            detail: "Choque de horario con Física I el MIÉRCOLES 08:00–10:00.",
            metadata: {
              day: "WEDNESDAY",
              startsAt: "08:00",
              endsAt: "10:00",
              conflictingCourseName: "Física I",
            },
          },
          { status: 409 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        programIds={[PROGRAM_ID]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    await user.click(screen.getByRole("button", { name: /cálculo i/i }));
    await waitFor(() => {
      expect(screen.getByText("Grupo A")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/choque|clash|Física I/i);
    });
  });
});
