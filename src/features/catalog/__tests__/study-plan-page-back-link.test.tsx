/**
 * WU-2: BackLink wiring tests for StudyPlanPage.
 *
 * Spec scenario:
 * - StudyPlanPage (/catalog/plans/:planId) must render a BackLink pointing to /catalog/programs.
 * - There must be exactly ONE back affordance (no duplicates).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
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
  applicableJourneys: [],
  referenceYear: 2021,
  version: 1,
};

describe("StudyPlanPage — BackLink (WU-2)", () => {
  it("renders a BackLink pointing to /catalog/programs", () => {
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

    const backLink = screen.getByRole("link", { name: /volver/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/catalog/programs");
  });

  it("has exactly ONE back affordance (no duplicates)", () => {
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

    // Only one element with aria-label containing "volver" (case-insensitive)
    const backEls = screen.getAllByRole("link", { name: /volver/i });
    expect(backEls).toHaveLength(1);
  });
});
