/**
 * SubscriptionListPage — Slice B tests
 *
 * Spec scenarios (B.3.6):
 * - "Ver malla" link has correct href: /curriculum/plans/{planId}/malla?journeyCode={code}
 * - "Ver malla" link is absent when referenceJourney is null/undefined
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SubscriptionListPage } from "@/features/progress/components/subscription-list-page";

function createWrapper(initialPath = "/progress/subscriptions") {
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

const SUB_WITH_JOURNEY = {
  id: "sub-123",
  programId: "prog-1",
  programName: "Ingeniería de Sistemas",
  planId: "plan-123",
  planName: "Plan 2020",
  referenceJourney: { code: "JRN-A", name: "Jornada A" },
  version: 0,
  createdAt: "2026-01-01T00:00:00Z",
};

const SUB_WITHOUT_JOURNEY = {
  id: "sub-456",
  programId: "prog-2",
  programName: "Licenciatura en Matemáticas",
  planId: "plan-456",
  planName: "Plan 2021",
  // referenceJourney is absent (simulates null/undefined scenario)
  referenceJourney: null,
  version: 0,
  createdAt: "2026-01-01T00:00:00Z",
};

describe("SubscriptionListPage — Ver malla link (Slice B)", () => {
  it("B.3.6a: 'Ver malla' link href equals /curriculum/plans/{planId}/malla?journeyCode={code}", async () => {
    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    const mallaLink = await screen.findByRole("link", { name: /ver malla/i });
    expect(mallaLink).toBeInTheDocument();
    expect(mallaLink).toHaveAttribute(
      "href",
      "/curriculum/plans/plan-123/malla?journeyCode=JRN-A"
    );
  });

  it("B.3.6c: 'Ver malla' href encodes URL-special chars in journeyCode (encodeURIComponent is not a no-op)", async () => {
    // A journey code with a space would be broken as a raw query param — prove encoding works.
    const subWithSpecialChar = {
      ...SUB_WITH_JOURNEY,
      id: "sub-special",
      referenceJourney: { code: "JORNADA NOCTURNA", name: "Jornada Nocturna" },
    };

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([subWithSpecialChar])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    const mallaLink = await screen.findByRole("link", { name: /ver malla/i });
    // encodeURIComponent("JORNADA NOCTURNA") === "JORNADA%20NOCTURNA"
    expect(mallaLink).toHaveAttribute(
      "href",
      `/curriculum/plans/${subWithSpecialChar.planId}/malla?journeyCode=JORNADA%20NOCTURNA`
    );
  });

  it("B.3.6b: no 'Ver malla' link when referenceJourney is null", async () => {
    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITHOUT_JOURNEY])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for subscriptions to render
    await waitFor(() => {
      expect(screen.getByText("Licenciatura en Matemáticas")).toBeInTheDocument();
    });

    // "Ver malla" link must NOT be present
    expect(screen.queryByRole("link", { name: /ver malla/i })).not.toBeInTheDocument();
  });
});
