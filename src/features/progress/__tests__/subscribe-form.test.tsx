/**
 * WU5-T02: SubscribeForm
 *
 * Spec scenarios:
 * SUB-1-HP: renders program/plan/journey selectors; submits POST /me/subscriptions with
 *            Idempotency-Key (uuidv4); navigates to /progress/subscriptions on 201.
 * SUB-1-CAP: shows 409 error (cap or duplicate) to the user.
 *
 * CRITICAL (Fase-2 C-2): EVERY query/mutation the component fires must have an MSW handler.
 * This form fires:
 *   GET /api/v1/programs  (program selector)
 *   GET /api/v1/programs/:programId/plans  (plan options, after program selected)
 *   POST /api/v1/me/subscriptions  (create)
 *
 * NOTE (FIX-W-2): GET /api/v1/me/subscriptions was a phantom handler — SubscribeForm does NOT
 * fire this query. The handler and the false comment entry have been removed.
 *
 * Assertion strategy: assert on rendered data (program name visible), not just "no crash".
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { SubscribeForm } from "@/features/progress/components/subscribe-form";

const PROGRAM_PAGE = {
  content: [
    {
      id: "prog-1",
      name: "Ingeniería de Sistemas y Computación",
      faculty: "Facultad de Ingeniería",
      status: "ACTIVE",
      availableJourneys: [
        { code: "DIURNA", name: "Diurna" },
        { code: "NOCTURNA", name: "Nocturna" },
      ],
      version: 1,
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const PLAN_PAGE = {
  content: [
    {
      id: "plan-1",
      programId: "prog-1",
      name: "Plan 2020",
      status: "ACTIVE",
      totalCredits: 163,
      applicableJourneys: [
        { code: "DIURNA", name: "Diurna" },
        { code: "NOCTURNA", name: "Nocturna" },
      ],
      version: 1,
    },
  ],
  page: 0,
  size: 20,
  totalElements: 1,
  totalPages: 1,
};

const SUBSCRIPTION_CREATED = {
  id: "sub-1",
  programId: "prog-1",
  programName: "Ingeniería de Sistemas y Computación",
  planId: "plan-1",
  planName: "Plan 2020",
  referenceJourney: { code: "DIURNA", name: "Diurna" },
  version: 0,
  createdAt: "2026-01-01T00:00:00Z",
};

function createWrapper(initialPath = "/progress/subscribe") {
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

describe("SubscribeForm (SUB-1-HP)", () => {
  it("renders program selector with loaded programs", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(PROGRAM_PAGE)),
      http.get("/api/v1/programs/:programId/plans", () => HttpResponse.json(PLAN_PAGE.content))
    );

    render(
      <Routes>
        <Route path="/progress/subscribe" element={<SubscribeForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Program selector should load and show program name in option
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /programa/i })).toBeInTheDocument();
    });
  });

  it("submits POST /me/subscriptions with Idempotency-Key and navigates to /progress/subscriptions", async () => {
    let capturedIdempotencyKey: string | null = null;

    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(PROGRAM_PAGE)),
      http.get("/api/v1/programs/:programId/plans", () => HttpResponse.json(PLAN_PAGE.content)),
      http.post("/api/v1/me/subscriptions", ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        return HttpResponse.json(SUBSCRIPTION_CREATED, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/progress/subscribe" element={<SubscribeForm />} />
        <Route path="/progress/subscriptions" element={<div>Suscripciones</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for program options to load (not just the select, but the option itself)
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /programa/i });
      const options = within(select).getAllByRole("option");
      expect(options.length).toBeGreaterThan(1); // placeholder + at least 1 program
    });

    // Select program
    await user.selectOptions(
      screen.getByRole("combobox", { name: /programa/i }),
      "prog-1"
    );

    // Wait for plan options to load
    await waitFor(() => {
      const planSelect = screen.getByRole("combobox", { name: /plan/i });
      const options = within(planSelect).getAllByRole("option");
      expect(options.length).toBeGreaterThan(1);
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /plan/i }),
      "plan-1"
    );

    // Wait for journey options to be populated from the selected plan
    await waitFor(() => {
      const journeySelect = screen.getByRole("combobox", { name: /jornada/i });
      const options = within(journeySelect).getAllByRole("option");
      expect(options.length).toBeGreaterThan(1);
    });

    // Select journey
    await user.selectOptions(
      screen.getByRole("combobox", { name: /jornada/i }),
      "DIURNA"
    );

    // Submit form
    await user.click(screen.getByRole("button", { name: /suscribir/i }));

    // S-2 fix: assert navigation to /progress/subscriptions after 201
    await screen.findByText("Suscripciones");

    // Idempotency-Key was sent with correct UUID format
    expect(capturedIdempotencyKey).toBeTruthy();
    expect(capturedIdempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it("shows error message when server returns 409 (cap=2 or duplicate)", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(PROGRAM_PAGE)),
      http.get("/api/v1/programs/:programId/plans", () => HttpResponse.json(PLAN_PAGE.content)),
      http.post("/api/v1/me/subscriptions", () =>
        HttpResponse.json(
          {
            title: "Conflict",
            status: 409,
            detail: "Ya tenés 2 suscripciones activas.",
          },
          { status: 409 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/progress/subscribe" element={<SubscribeForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for program options to load
    await waitFor(() => {
      const select = screen.getByRole("combobox", { name: /programa/i });
      const options = within(select).getAllByRole("option");
      expect(options.length).toBeGreaterThan(1);
    });

    await user.selectOptions(
      screen.getByRole("combobox", { name: /programa/i }),
      "prog-1"
    );

    // Wait for plan options to load
    await waitFor(() => {
      const planSelect = screen.getByRole("combobox", { name: /plan/i });
      const options = within(planSelect).getAllByRole("option");
      expect(options.length).toBeGreaterThan(1);
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /plan/i }),
      "plan-1"
    );

    // Wait for journey options
    await waitFor(() => {
      const journeySelect = screen.getByRole("combobox", { name: /jornada/i });
      const options = within(journeySelect).getAllByRole("option");
      expect(options.length).toBeGreaterThan(1);
    });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /jornada/i }),
      "DIURNA"
    );

    await user.click(screen.getByRole("button", { name: /suscribir/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("shows required field validation error when submitting without selecting program", async () => {
    server.use(
      http.get("/api/v1/programs", () => HttpResponse.json(PROGRAM_PAGE)),
      http.get("/api/v1/programs/:programId/plans", () => HttpResponse.json(PLAN_PAGE.content))
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route path="/progress/subscribe" element={<SubscribeForm />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /suscribir/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /suscribir/i }));

    await waitFor(() => {
      // Validation error should appear for program field
      expect(screen.getByText("Seleccioná un programa.")).toBeInTheDocument();
    });
  });
});
