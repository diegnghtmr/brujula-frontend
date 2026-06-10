/**
 * WU5-T08: ProgressSummaryView
 *
 * Spec scenarios:
 * AVL-2-HP:            renders approvedCredits, pendingCredits, progressPercentage,
 *                       estimatedHistoricalAverage, averagesByPeriod
 * AVL-2-NO-ATTEMPTS:   estimatedHistoricalAverage is null (shown as "—"), averagesByPeriod empty
 * CROSS-6-DISCLAIMER:  disclaimer text rendered and non-empty
 *
 * CRITICAL (Fase-2 C-2): component fires GET /me/subscriptions/{id}/progress — MSW handler required.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { ProgressSummaryView } from "@/features/progress/components/progress-summary-view";

const SUBSCRIPTION_ID = "sub-progress-1";

const PROGRESS_SUMMARY_WITH_ATTEMPTS = {
  subscriptionId: SUBSCRIPTION_ID,
  programName: "Ingeniería de Sistemas y Computación",
  totalPlanCredits: 120,
  approvedCredits: 30,
  pendingCredits: 90,
  progressPercentage: 25.0,
  passedCourses: 8,
  pendingFailedCourses: 2,
  estimatedHistoricalAverage: 3.85,
  averagesByPeriod: [
    {
      periodId: "period-1",
      periodName: null,
      estimatedAverage: 3.85,
      courseCount: 8,
    },
  ],
  disclaimer:
    "Los datos de avance son autodeclarados por el estudiante y no constituyen certificación oficial de la Universidad del Quindío.",
};

const PROGRESS_SUMMARY_NO_ATTEMPTS = {
  subscriptionId: SUBSCRIPTION_ID,
  programName: "Ingeniería de Sistemas y Computación",
  totalPlanCredits: 120,
  approvedCredits: 0,
  pendingCredits: 120,
  progressPercentage: 0.0,
  passedCourses: 0,
  pendingFailedCourses: 0,
  estimatedHistoricalAverage: null,
  averagesByPeriod: [],
  disclaimer:
    "Los datos de avance son autodeclarados por el estudiante y no constituyen certificación oficial de la Universidad del Quindío.",
};

function createWrapper(initialPath = `/progress/subscriptions/${SUBSCRIPTION_ID}/progress`) {
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

describe("ProgressSummaryView (AVL-2-HP)", () => {
  it("renders approvedCredits, pendingCredits, progressPercentage", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/progress`,
        () => HttpResponse.json(PROGRESS_SUMMARY_WITH_ATTEMPTS)
      )
    );

    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/progress"
          element={<ProgressSummaryView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByText(/30/)).toBeInTheDocument();
    });

    expect(screen.getByText(/90/)).toBeInTheDocument();
    expect(screen.getByText(/25/)).toBeInTheDocument();
  });

  it("renders estimatedHistoricalAverage when attempts exist", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/progress`,
        () => HttpResponse.json(PROGRESS_SUMMARY_WITH_ATTEMPTS)
      )
    );

    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/progress"
          element={<ProgressSummaryView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // 3.85 appears in both the average summary and the period table — use getAllByText
    await waitFor(() => {
      expect(screen.getAllByText(/3\.85/).length).toBeGreaterThan(0);
    });
  });

  it("renders averagesByPeriod list", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/progress`,
        () => HttpResponse.json(PROGRESS_SUMMARY_WITH_ATTEMPTS)
      )
    );

    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/progress"
          element={<ProgressSummaryView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getAllByText(/3\.85/).length).toBeGreaterThan(0);
    });
    // Period average table row (Por período label)
    expect(screen.getByText(/Por período/i)).toBeInTheDocument();
  });

  it("shows null average as dash when no attempts (AVL-2-NO-ATTEMPTS)", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/progress`,
        () => HttpResponse.json(PROGRESS_SUMMARY_NO_ATTEMPTS)
      )
    );

    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/progress"
          element={<ProgressSummaryView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // 0 credits approved
    await waitFor(() => {
      expect(screen.getByText(/Créditos aprobados/i)).toBeInTheDocument();
    });

    // No average → dash or "sin datos"
    expect(screen.getByText(/—|sin datos/i)).toBeInTheDocument();
  });

  it("renders non-empty disclaimer (CROSS-6-DISCLAIMER)", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/progress`,
        () => HttpResponse.json(PROGRESS_SUMMARY_WITH_ATTEMPTS)
      )
    );

    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/progress"
          element={<ProgressSummaryView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Disclaimer must be visible and mention "autodeclarados" or "no oficial"
    expect(
      await screen.findByText(/autodeclarados|no oficial|no constituyen/i)
    ).toBeInTheDocument();
  });
});
