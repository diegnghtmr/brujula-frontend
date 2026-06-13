/**
 * OutdatedBanner
 *
 * status=OUTDATED → banner
 * "Revisar" click → POST /review
 * MSW 200 → banner gone
 * MSW 409 → blockers shown
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { OutdatedBanner } from "@/features/simulation/components/outdated-banner";

const SIMULATION_ID = "sim-outdated-1";

const REFRESHED_DETAIL = {
  id: SIMULATION_ID,
  name: "Mi Simulación",
  periodId: "period-1",
  periodName: "2026-2",
  programIds: ["prog-1"],
  status: "CURRENT",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  version: 2,
  selections: [],
  creditSummary: [],
  weeklySchedule: [],
  totalWeeklyHours: 0,
  validation: { blocking: [], warnings: [] },
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

describe("OutdatedBanner", () => {
  it("renders banner when status is OUTDATED", () => {
    render(
      <OutdatedBanner simulationId={SIMULATION_ID} status="OUTDATED" onReviewSuccess={() => {}} />,
      { wrapper: createWrapper() }
    );
    expect(screen.getByText(/desactualizada|outdated/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /revisar/i })).toBeInTheDocument();
  });

  it("does not render banner when status is CURRENT", () => {
    render(
      <OutdatedBanner simulationId={SIMULATION_ID} status="CURRENT" onReviewSuccess={() => {}} />,
      { wrapper: createWrapper() }
    );
    expect(screen.queryByRole("button", { name: /revisar/i })).not.toBeInTheDocument();
  });

  it("clicking Revisar calls POST /review; MSW 200 → onReviewSuccess called", async () => {
    let reviewSuccessCalled = false;

    server.use(
      http.post(`/api/v1/me/simulations/${SIMULATION_ID}/review`, () => {
        return HttpResponse.json(REFRESHED_DETAIL, { status: 200 });
      })
    );

    render(
      <OutdatedBanner
        simulationId={SIMULATION_ID}
        status="OUTDATED"
        onReviewSuccess={() => { reviewSuccessCalled = true; }}
      />,
      { wrapper: createWrapper() }
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /revisar/i }));

    await waitFor(() => {
      expect(reviewSuccessCalled).toBe(true);
    });
  });

  it("MSW 409 → blockers shown in UI", async () => {
    server.use(
      http.post(`/api/v1/me/simulations/${SIMULATION_ID}/review`, () => {
        return HttpResponse.json(
          {
            type: "about:blank",
            title: "Simulation Still Blocked",
            status: 409,
            code: "SIMULATION_SCHEDULE_CLASH",
            detail: "La simulación aún tiene conflictos de horario activos.",
            metadata: {
              day: "WEDNESDAY",
              startsAt: "08:00",
              endsAt: "10:00",
              conflictingCourseName: "Física I",
            },
          },
          { status: 409 }
        );
      })
    );

    render(
      <OutdatedBanner simulationId={SIMULATION_ID} status="OUTDATED" onReviewSuccess={() => {}} />,
      { wrapper: createWrapper() }
    );

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /revisar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/conflictos|bloqueada|choque/i);
    });
  });
});
