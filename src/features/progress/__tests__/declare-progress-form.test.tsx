/**
 * WU5-T04: DeclareProgressForm
 *
 * Spec scenarios:
 * PRG-1-HP:              renders malla with semester groupings; POST with grade+status+Idempotency-Key
 * PRG-1-NOCTURNA:        POST uses journeyCode from referenceJourney.code (not hardcoded "DIURNA")
 * PRG-1-GRADE-MISMATCH:  shows 422 error (grade-status mismatch) to user
 * PRG-1-CANCELLED-GRADE: grade field hidden when CANCELLED selected
 * PRG-1-MULTI-ATTEMPT:   shows 409 conflict error to user
 *
 * CRITICAL (Fase-2 C-2): EVERY query this component fires must have a registered MSW handler:
 *   GET /api/v1/me/subscriptions/{subscriptionId}/curriculum  (malla)
 *   POST /api/v1/me/course-attempts  (declare attempt)
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { DeclareProgressForm } from "@/features/progress/components/declare-progress-form";

const SUBSCRIPTION_ID = "sub-test-1";

const CURRICULUM_VIEW = {
  subscriptionId: SUBSCRIPTION_ID,
  referenceJourney: { code: "DIURNA", name: "Diurna" },
  semesters: [
    {
      recommendedSemester: 1,
      courses: [
        {
          courseId: "c-1",
          officialCode: "MAT-101",
          name: "Matemáticas Generales",
          credits: 4,
          type: "REQUIRED",
          progressStatus: "AVAILABLE",
          unmetRequirements: [],
        },
        {
          courseId: "c-2",
          officialCode: "PRG-101",
          name: "Programación I",
          credits: 3,
          type: "REQUIRED",
          progressStatus: "BLOCKED",
          unmetRequirements: ["Lógica de Programación"],
        },
      ],
    },
    {
      recommendedSemester: 2,
      courses: [
        {
          courseId: "c-3",
          officialCode: "FIS-101",
          name: "Física I",
          credits: 4,
          type: "REQUIRED",
          progressStatus: "PENDING",
          unmetRequirements: [],
        },
      ],
    },
  ],
};

const ATTEMPT_CREATED = {
  id: "attempt-1",
  subscriptionId: SUBSCRIPTION_ID,
  courseId: "c-1",
  courseName: "Matemáticas Generales",
  periodId: "period-1",
  journeyCode: "DIURNA",
  status: "PASSED",
  finalGrade: 4.2,
  registeredAt: "2026-01-01T00:00:00Z",
  version: 0,
};

/** Curriculum fixture for a NOCTURNA subscription — referenceJourney.code must travel to POST body. */
const CURRICULUM_VIEW_NOCTURNA = {
  ...CURRICULUM_VIEW,
  referenceJourney: { code: "NOCTURNA", name: "Nocturna" },
};

function createWrapper(initialPath = `/progress/subscriptions/${SUBSCRIPTION_ID}/declare`) {
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

describe("DeclareProgressForm (PRG-1-HP)", () => {
  it("renders curriculum malla with semester groupings", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      )
    );

    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Semesters rendered
    expect(await screen.findByText(/semestre 1/i)).toBeInTheDocument();
    expect(screen.getByText(/semestre 2/i)).toBeInTheDocument();

    // Course names are rendered
    expect(screen.getByText("Matemáticas Generales")).toBeInTheDocument();
    expect(screen.getByText("Programación I")).toBeInTheDocument();
    expect(screen.getByText("Física I")).toBeInTheDocument();
  });

  it("submits POST /me/course-attempts with Idempotency-Key", async () => {
    let capturedIdempotencyKey: string | null = null;
    let capturedBody: unknown = null;

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.post("/api/v1/me/course-attempts", async ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        capturedBody = await request.json();
        return HttpResponse.json(ATTEMPT_CREATED, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Matemáticas Generales");

    // Open declare form for c-1
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0];
    await user.click(declareBtn);

    // Select PASSED
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    // Fill grade (PASSED requires grade)
    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: /nota/i })).toBeInTheDocument();
    });
    await user.clear(screen.getByRole("spinbutton", { name: /nota/i }));
    await user.type(screen.getByRole("spinbutton", { name: /nota/i }), "4.2");

    // Fill periodId
    await user.clear(screen.getByRole("textbox", { name: /período/i }));
    await user.type(
      screen.getByRole("textbox", { name: /período/i }),
      "550e8400-e29b-41d4-a716-446655440001"
    );

    // Submit
    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(capturedIdempotencyKey).toBeTruthy();
      expect(capturedIdempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(capturedBody).toMatchObject({
        subscriptionId: SUBSCRIPTION_ID,
        courseId: "c-1",
        status: "PASSED",
      });
    });
  });

  it("shows 422 error (grade-status mismatch) to user", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.post("/api/v1/me/course-attempts", () =>
        HttpResponse.json(
          {
            title: "Unprocessable Entity",
            status: 422,
            detail: "La nota no es válida para el estado PASSED.",
          },
          { status: 422 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Matemáticas Generales");

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0];
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: /nota/i })).toBeInTheDocument();
    });
    await user.clear(screen.getByRole("spinbutton", { name: /nota/i }));
    await user.type(screen.getByRole("spinbutton", { name: /nota/i }), "2.5");

    await user.clear(screen.getByRole("textbox", { name: /período/i }));
    await user.type(
      screen.getByRole("textbox", { name: /período/i }),
      "550e8400-e29b-41d4-a716-446655440001"
    );

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("hides grade field when CANCELLED is selected", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Matemáticas Generales");

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0];
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    // Select CANCELLED — grade field should be hidden
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "CANCELLED");

    // Grade field must NOT be present when CANCELLED
    expect(screen.queryByRole("spinbutton", { name: /nota/i })).not.toBeInTheDocument();
  });

  it("submits POST with journeyCode from referenceJourney.code (NOCTURNA — not hardcoded)", async () => {
    // PRG-1-NOCTURNA: curriculum returns referenceJourney.code = "NOCTURNA".
    // The POST body must contain journeyCode: "NOCTURNA", not the hardcoded "DIURNA".
    let capturedBody: unknown = null;

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW_NOCTURNA)
      ),
      http.post("/api/v1/me/course-attempts", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(
          { ...ATTEMPT_CREATED, journeyCode: "NOCTURNA" },
          { status: 201 }
        );
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Matemáticas Generales");

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0];
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: /nota/i })).toBeInTheDocument();
    });
    await user.clear(screen.getByRole("spinbutton", { name: /nota/i }));
    await user.type(screen.getByRole("spinbutton", { name: /nota/i }), "3.8");

    await user.clear(screen.getByRole("textbox", { name: /período/i }));
    await user.type(
      screen.getByRole("textbox", { name: /período/i }),
      "550e8400-e29b-41d4-a716-446655440002"
    );

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({ journeyCode: "NOCTURNA" });
    });
  });

  it("submits POST with journeyCode from referenceJourney.code (DIURNA — existing happy path)", async () => {
    // Strengthen the happy-path test to also assert journeyCode in the POST body.
    let capturedBody: unknown = null;

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.post("/api/v1/me/course-attempts", async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(ATTEMPT_CREATED, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Matemáticas Generales");

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0];
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: /nota/i })).toBeInTheDocument();
    });
    await user.clear(screen.getByRole("spinbutton", { name: /nota/i }));
    await user.type(screen.getByRole("spinbutton", { name: /nota/i }), "4.2");

    await user.clear(screen.getByRole("textbox", { name: /período/i }));
    await user.type(
      screen.getByRole("textbox", { name: /período/i }),
      "550e8400-e29b-41d4-a716-446655440001"
    );

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        subscriptionId: SUBSCRIPTION_ID,
        courseId: "c-1",
        status: "PASSED",
        journeyCode: "DIURNA",
      });
    });
  });

  it("shows 409 conflict error (duplicate attempt) to user", async () => {
    // PRG-1-MULTI-ATTEMPT: POST returns 409, component surfaces the error.
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.post("/api/v1/me/course-attempts", () =>
        HttpResponse.json(
          {
            title: "Conflict",
            status: 409,
            detail: "Ya existe un intento registrado para este curso en este período.",
          },
          { status: 409 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/progress/subscriptions/:subscriptionId/declare"
          element={<DeclareProgressForm />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Matemáticas Generales");

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0];
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("spinbutton", { name: /nota/i })).toBeInTheDocument();
    });
    await user.clear(screen.getByRole("spinbutton", { name: /nota/i }));
    await user.type(screen.getByRole("spinbutton", { name: /nota/i }), "3.5");

    await user.clear(screen.getByRole("textbox", { name: /período/i }));
    await user.type(
      screen.getByRole("textbox", { name: /período/i }),
      "550e8400-e29b-41d4-a716-446655440001"
    );

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /conflicto|Ya existe|intento registrado/i
      );
    });
  });
});
