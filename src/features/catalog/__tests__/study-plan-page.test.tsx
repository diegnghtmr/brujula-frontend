/**
 * CAT-002/CAT-003: StudyPlanPage
 *
 * Spec scenarios:
 * 1. Renders plan name + totalCredits for an ACTIVE plan.
 * 2. Renders journey list (applicableJourneys) for the plan.
 * 3. Shows loading spinner while fetching.
 * 4. Shows error/not-found state on 404.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { StudyPlanPage } from "@/features/catalog/components/study-plan-page";

const PLAN_ID = "plan-001";

function createWrapper(initialPath = `/catalog/plans/${PLAN_ID}`) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: [initialPath] },
        children
      )
    );
}

const ACTIVE_PLAN = {
  id: PLAN_ID,
  programId: "prog-1",
  name: "Plan de Estudios 21",
  status: "ACTIVE",
  totalCredits: 163,
  applicableJourneys: [
    { id: "j-1", code: "DIURNA", name: "Diurna" },
    { id: "j-2", code: "NOCTURNA", name: "Nocturna" },
  ],
  referenceYear: 2021,
  version: 1,
};

describe("StudyPlanPage (CAT-002/CAT-003)", () => {
  it("renders plan name and totalCredits for an ACTIVE plan", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () =>
        HttpResponse.json(ACTIVE_PLAN)
      )
    );

    render(
      <Routes>
        <Route path="/catalog/plans/:planId" element={<StudyPlanPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Plan de Estudios 21")).toBeInTheDocument();
    expect(screen.getByText(/163/)).toBeInTheDocument();
  });

  it("renders the applicable journeys list", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () =>
        HttpResponse.json(ACTIVE_PLAN)
      )
    );

    render(
      <Routes>
        <Route path="/catalog/plans/:planId" element={<StudyPlanPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for data
    await screen.findByText("Plan de Estudios 21");

    // Journeys should render as badges
    expect(screen.getByText("Diurna")).toBeInTheDocument();
    expect(screen.getByText("Nocturna")).toBeInTheDocument();
  });

  it("shows loading indicator while fetching", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json(ACTIVE_PLAN);
      })
    );

    render(
      <Routes>
        <Route path="/catalog/plans/:planId" element={<StudyPlanPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("shows not-found message on 404", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () =>
        HttpResponse.json(
          { title: "Not Found", status: 404 },
          { status: 404 }
        )
      )
    );

    render(
      <Routes>
        <Route path="/catalog/plans/:planId" element={<StudyPlanPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText(/plan no encontrado/i)
    ).toBeInTheDocument();
  });

  it("renders only ACTIVE plan data (API filters DRAFT; view renders what it gets)", async () => {
    // The API already filters DRAFT plans for STUDENT role.
    // The view just renders the data it receives — this test asserts
    // that when ACTIVE plan data is returned, all fields render correctly.
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () =>
        HttpResponse.json(ACTIVE_PLAN)
      )
    );

    render(
      <Routes>
        <Route path="/catalog/plans/:planId" element={<StudyPlanPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Plan de Estudios 21");

    // ACTIVE badge visible
    expect(screen.getByText(/activo/i)).toBeInTheDocument();
    // Total credits visible
    expect(screen.getByText(/163/)).toBeInTheDocument();
  });
});
