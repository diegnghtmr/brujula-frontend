/**
 * SimulationCreateForm — FE-001, SIM-001
 *
 * MSW handlers for GET /periods and POST /me/simulations.
 * Uses REAL periodId/programId values from MSW fixtures — no hardcoded component values.
 * Tests:
 *   - Period dropdown from MSW
 *   - 3 programs → inline error
 *   - Valid submit → navigates to detail
 *   - 422 → field errors displayed
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SimulationCreateForm } from "@/features/simulation/components/simulation-create-form";

// Real fixture values from MSW — components must NOT hardcode these
const PERIOD_ID = "550e8400-e29b-41d4-a716-aaa000000001";
const PROGRAM_ID_1 = "550e8400-e29b-41d4-a716-bbb000000001";
const PROGRAM_ID_2 = "550e8400-e29b-41d4-a716-bbb000000002";
const SIMULATION_ID = "550e8400-e29b-41d4-a716-ccc000000001";

const PERIODS_FIXTURE = [
  {
    id: PERIOD_ID,
    name: "2026-2",
    status: "ACTIVE",
    version: 0,
  },
];

const SUBSCRIPTIONS_FIXTURE = [
  { id: "sub-1", programId: PROGRAM_ID_1, planId: "plan-1", journeyCode: "DIURNA", status: "ACTIVE", version: 0, programName: "Ingeniería de Sistemas" },
  { id: "sub-2", programId: PROGRAM_ID_2, planId: "plan-2", journeyCode: "NOCTURNA", status: "ACTIVE", version: 0, programName: "Licenciatura en Lenguas Modernas" },
];

const SIMULATION_CREATED = {
  id: SIMULATION_ID,
  name: "Mi Simulación Test",
  periodId: PERIOD_ID,
  periodName: "2026-2",
  programIds: [PROGRAM_ID_1],
  status: "CURRENT",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 0,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ["/simulations/new"] }, children)
    );
}

describe("SimulationCreateForm", () => {
  it("loads period dropdown from GET /periods MSW handler", async () => {
    server.use(
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations/new" element={<SimulationCreateForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Period dropdown must show real period name from MSW fixture, NOT a hardcoded string
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /período/i })).toBeInTheDocument();
    });
    expect(await screen.findByRole("option", { name: "2026-2" })).toBeInTheDocument();
  });

  it("loads program checkboxes from GET /me/subscriptions MSW handler", async () => {
    server.use(
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE))
    );

    render(
      <Routes>
        <Route path="/simulations/new" element={<SimulationCreateForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      // Two program checkboxes rendered from subscription data
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(2);
    });

    // Checkbox labels must render the programName from subscription data (guards {sub.programName} render path)
    expect(await screen.findByText(/ingeniería de sistemas/i)).toBeInTheDocument();
    expect(await screen.findByText(/licenciatura en lenguas modernas/i)).toBeInTheDocument();
  });

  it("valid submit → POST with real periodId/programIds, navigates to detail", async () => {
    let capturedBody: unknown = null;
    let capturedIdempotencyKey: string | null = null;

    server.use(
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.post("/api/v1/me/simulations", async ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        capturedBody = await request.json();
        return HttpResponse.json(SIMULATION_CREATED, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/simulations/new" element={<SimulationCreateForm />} />
        <Route path="/simulations/:simulationId" element={<div data-testid="detail-page">Detail</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for form to be ready
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /período/i })).toBeInTheDocument();
    });
    await screen.findByRole("option", { name: "2026-2" });

    // Fill name
    await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Mi Simulación Test");

    // Select period
    await user.selectOptions(screen.getByRole("combobox", { name: /período/i }), PERIOD_ID);

    // Check first program
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]!);

    // Submit
    await user.click(screen.getByRole("button", { name: /crear simulación/i }));

    await waitFor(() => {
      expect(capturedIdempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      // POST body must contain real periodId and programIds from fixture — not hardcoded values
      expect(capturedBody).toMatchObject({
        name: "Mi Simulación Test",
        periodId: PERIOD_ID,
        programIds: [PROGRAM_ID_1],
      });
    });

    // Navigate to detail
    await waitFor(() => {
      expect(screen.getByTestId("detail-page")).toBeInTheDocument();
    });
  });

  it("selecting more than 2 programs shows inline validation error", async () => {
    const THREE_SUBSCRIPTIONS = [
      ...SUBSCRIPTIONS_FIXTURE,
      { id: "sub-3", programId: "prog-3", planId: "plan-3", journeyCode: "DIURNA", status: "ACTIVE", version: 0 },
    ];

    server.use(
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(THREE_SUBSCRIPTIONS))
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/simulations/new" element={<SimulationCreateForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      const checkboxes = screen.getAllByRole("checkbox");
      expect(checkboxes.length).toBe(3);
    });

    // Check all 3 programs
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);
    await user.click(checkboxes[2]!);

    // Fill name and period
    await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Sim Test");
    await screen.findByRole("option", { name: "2026-2" });
    await user.selectOptions(screen.getByRole("combobox", { name: /período/i }), PERIOD_ID);

    // Submit
    await user.click(screen.getByRole("button", { name: /crear simulación/i }));

    await waitFor(() => {
      expect(screen.getByText(/máximo 2 programas|máximo dos/i)).toBeInTheDocument();
    });
  });

  it("422 from server → field validation errors displayed", async () => {
    server.use(
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.post("/api/v1/me/simulations", () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Unprocessable Entity",
            status: 422,
            detail: "El campo name no puede exceder 120 caracteres.",
          },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/simulations/new" element={<SimulationCreateForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /período/i })).toBeInTheDocument();
    });
    await screen.findByRole("option", { name: "2026-2" });

    await user.type(screen.getByRole("textbox", { name: /nombre/i }), "Sim");
    await user.selectOptions(screen.getByRole("combobox", { name: /período/i }), PERIOD_ID);
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]!);

    await user.click(screen.getByRole("button", { name: /crear simulación/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
