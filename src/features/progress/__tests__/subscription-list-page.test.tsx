/**
 * SubscriptionListPage — Slice B tests
 *
 * Spec scenarios (B.3.6):
 * - "Ver malla" link has correct href: /curriculum/plans/{planId}/malla?journeyCode={code}
 * - "Ver malla" link is absent when referenceJourney is null/undefined
 *
 * WU-1 Fix B — "Dar de baja" unsubscribe button:
 * B.unsub.1  Each subscription card renders a "Dar de baja" button
 * B.unsub.2  Clicking "Dar de baja" shows confirmation step (no immediate DELETE)
 * B.unsub.3  Confirming the action calls DELETE /me/subscriptions/{id}
 * B.unsub.4  Cancelling the confirmation sends zero DELETE requests
 * B.unsub.5  DELETE error shows accessible role="alert" message
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

// ---------------------------------------------------------------------------
// WU-1 Fix B — "Dar de baja" unsubscribe
// ---------------------------------------------------------------------------

describe("SubscriptionListPage — Dar de baja (WU-1 Fix B)", () => {
  it("B.unsub.1: each subscription card renders a 'Dar de baja' button", async () => {
    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY, SUB_WITHOUT_JOURNEY])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    const darDeBajaButtons = screen.getAllByRole("button", {
      name: /dar de baja/i,
    });
    expect(darDeBajaButtons).toHaveLength(2);
  });

  it("B.unsub.2: clicking 'Dar de baja' shows a confirmation step before any DELETE fires", async () => {
    let deleteCount = 0;

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      ),
      http.delete("/api/v1/me/subscriptions/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    const darDeBajaButton = screen.getByRole("button", { name: /dar de baja/i });
    await userEvent.click(darDeBajaButton);

    // Confirmation step must appear
    expect(
      await screen.findByRole("button", { name: /confirmar/i })
    ).toBeInTheDocument();

    // No DELETE must have fired yet
    expect(deleteCount).toBe(0);
  });

  it("B.unsub.3: confirming calls DELETE /me/subscriptions/{id}", async () => {
    let deleteCount = 0;
    let capturedId: string | undefined;

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      ),
      http.delete("/api/v1/me/subscriptions/:id", ({ params }) => {
        deleteCount++;
        capturedId = params.id as string;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    await userEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(deleteCount).toBe(1);
    });

    expect(capturedId).toBe(SUB_WITH_JOURNEY.id);
  });

  it("B.unsub.4: cancelling the confirmation sends zero DELETE requests", async () => {
    let deleteCount = 0;

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      ),
      http.delete("/api/v1/me/subscriptions/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    await userEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    const cancelBtn = await screen.findByRole("button", {
      name: /cancelar/i,
    });
    await userEvent.click(cancelBtn);

    expect(deleteCount).toBe(0);

    // Original "Dar de baja" button should be visible again
    expect(screen.getByRole("button", { name: /dar de baja/i })).toBeInTheDocument();
  });

  it("B.unsub.5: DELETE error renders an accessible role='alert' message", async () => {
    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      ),
      http.delete("/api/v1/me/subscriptions/:id", () =>
        HttpResponse.json({ detail: "Error interno" }, { status: 500 })
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    await userEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // C-1 guard tests: double-fire + dead pending UI fixes
  // -------------------------------------------------------------------------

  it("C-1.a: confirm strip stays visible while mutation is pending (no premature close)", async () => {
    // Use a deferred DELETE so we can assert the strip remains open during the flight.
    let resolveDelete!: () => void;
    const deleteStarted = new Promise<void>((res) => {
      resolveDelete = res;
    });

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      ),
      http.delete("/api/v1/me/subscriptions/:id", async () => {
        resolveDelete();
        // Hold the response indefinitely so isPending stays true
        await new Promise<never>(() => { /* never resolves */ });
      })
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    await userEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    // Wait until DELETE has been received by MSW
    await deleteStarted;

    // The confirm strip must still be visible — button shows "Procesando..." while pending.
    // The button's accessible name is set by aria-label="Confirmar dar de baja".
    // Query by text content directly since aria-label overrides accessible name.
    await waitFor(() => {
      expect(screen.getByText("Procesando...")).toBeInTheDocument();
    });
    // The confirm strip container is still rendered
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("C-1.b: 'Dar de baja' trigger button is disabled while mutation is pending", async () => {
    // Deferred DELETE — mutation stays pending
    let resolveDelete!: () => void;
    const deleteStarted = new Promise<void>((res) => {
      resolveDelete = res;
    });

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([SUB_WITH_JOURNEY])
      ),
      http.delete("/api/v1/me/subscriptions/:id", async () => {
        resolveDelete();
        await new Promise<never>(() => { /* never resolves */ });
      })
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    // The "Dar de baja" button must be disabled when isPending is true.
    // First: open confirm strip, then confirm.
    await userEvent.click(screen.getByRole("button", { name: /dar de baja/i }));
    const confirmBtn = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmBtn);

    await deleteStarted;

    // The Confirmar button is now "Procesando..." and disabled.
    // The button's accessible name comes from aria-label, so query by text content.
    await waitFor(() => {
      const confirmBtn = screen.getByText("Procesando...");
      expect(confirmBtn.closest("button")).toBeDisabled();
    });
  });
});

// ---------------------------------------------------------------------------
// "+ Suscribirse" button — maxedOut logic (Problem 1 fix)
// ---------------------------------------------------------------------------

describe("SubscriptionListPage — + Suscribirse button enabled/disabled (Problem 1)", () => {
  /**
   * Fixture helpers — each subscription has programId and referenceJourney (jornada).
   * Same programId = same program; same journeyCode = same jornada.
   *
   * maxedOut = distinctProgramCount >= 2 && every distinct program has >= 2 jornadas
   */

  // 2 rows for the SAME program (2 different jornadas) → button ENABLED
  it("button is ENABLED when 2 rows belong to the same program (cap not reached)", async () => {
    const subSameProg1 = {
      id: "sub-sp1",
      programId: "prog-A",
      programName: "Ingeniería de Sistemas",
      planId: "plan-A",
      planName: "Plan 2020",
      referenceJourney: { code: "DIURNA", name: "Diurna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const subSameProg2 = {
      id: "sub-sp2",
      programId: "prog-A",
      programName: "Ingeniería de Sistemas",
      planId: "plan-A",
      planName: "Plan 2020",
      referenceJourney: { code: "NOCTURNA", name: "Nocturna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([subSameProg1, subSameProg2])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
        <Route path="/progress/subscribe" element={<div data-testid="subscribe-form">Form</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // 2 cards for the same program name — use findAllByText
    const programHeadings = await screen.findAllByText("Ingeniería de Sistemas");
    expect(programHeadings).toHaveLength(2);

    const subscribeBtn = screen.getByRole("button", { name: /\+ suscribirse/i });
    expect(subscribeBtn).not.toBeDisabled();
  });

  // 2 distinct programs × 2 jornadas each (4 rows total) → button DISABLED
  it("button is DISABLED when 2 distinct programs each have 2 jornadas (fully maxed out)", async () => {
    const sub1 = {
      id: "sub-1",
      programId: "prog-A",
      programName: "Ingeniería de Sistemas",
      planId: "plan-A",
      planName: "Plan 2020",
      referenceJourney: { code: "DIURNA", name: "Diurna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const sub2 = {
      id: "sub-2",
      programId: "prog-A",
      programName: "Ingeniería de Sistemas",
      planId: "plan-A",
      planName: "Plan 2020",
      referenceJourney: { code: "NOCTURNA", name: "Nocturna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const sub3 = {
      id: "sub-3",
      programId: "prog-B",
      programName: "Licenciatura en Matemáticas",
      planId: "plan-B",
      planName: "Plan 2021",
      referenceJourney: { code: "DIURNA", name: "Diurna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const sub4 = {
      id: "sub-4",
      programId: "prog-B",
      programName: "Licenciatura en Matemáticas",
      planId: "plan-B",
      planName: "Plan 2021",
      referenceJourney: { code: "NOCTURNA", name: "Nocturna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([sub1, sub2, sub3, sub4])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
        <Route path="/progress/subscribe" element={<div data-testid="subscribe-form">Form</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // 4 cards: 2 for "Ingeniería de Sistemas" and 2 for "Licenciatura en Matemáticas"
    const ingenieriaCards = await screen.findAllByText("Ingeniería de Sistemas");
    expect(ingenieriaCards).toHaveLength(2);

    const subscribeBtn = screen.getByRole("button", { name: /\+ suscribirse/i });
    expect(subscribeBtn).toBeDisabled();
  });

  // 2 distinct programs but only 1 jornada each (2 rows total) → button ENABLED
  it("button is ENABLED when 2 distinct programs each have only 1 jornada", async () => {
    const subProgA = {
      id: "sub-a",
      programId: "prog-A",
      programName: "Ingeniería de Sistemas",
      planId: "plan-A",
      planName: "Plan 2020",
      referenceJourney: { code: "DIURNA", name: "Diurna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };
    const subProgB = {
      id: "sub-b",
      programId: "prog-B",
      programName: "Licenciatura en Matemáticas",
      planId: "plan-B",
      planName: "Plan 2021",
      referenceJourney: { code: "DIURNA", name: "Diurna" },
      version: 0,
      createdAt: "2026-01-01T00:00:00Z",
    };

    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([subProgA, subProgB])
      )
    );

    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<SubscriptionListPage />} />
        <Route path="/progress/subscribe" element={<div data-testid="subscribe-form">Form</div>} />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Ingeniería de Sistemas");

    const subscribeBtn = screen.getByRole("button", { name: /\+ suscribirse/i });
    expect(subscribeBtn).not.toBeDisabled();
  });
});
