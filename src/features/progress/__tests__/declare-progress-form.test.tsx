/**
 * DeclareProgressForm
 *
 * Spec scenarios:
 * - Renders malla with semester groupings; POST with grade+status+Idempotency-Key.
 * - POST uses journeyCode from referenceJourney.code (not hardcoded "DIURNA").
 * - Shows 422 error (grade-status mismatch) to user.
 * - Grade field hidden when CANCELLED selected.
 * - Shows 409 conflict error to user.
 * - Period picker: periodId from GET /periods combobox.
 *   - Combobox populated from API, submit disabled during load, selectOptions works.
 *   - Empty periods list → disabled select + "No hay períodos disponibles", submit disabled.
 *   - Periods API error → role="alert", submit disabled.
 *
 * CRITICAL: EVERY query this component fires must have a registered MSW handler:
 *   GET /api/v1/me/subscriptions/{subscriptionId}/curriculum  (malla)
 *   GET /api/v1/periods  (period picker)
 *   POST /api/v1/me/course-attempts  (declare attempt)
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

const PERIODS_FIXTURE = [
  { id: "period-p1", name: "2025-1", status: "ACTIVE", version: 0 },
  { id: "period-p2", name: "2025-2", status: "ACTIVE", version: 0 },
];

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

// ---------------------------------------------------------------------------
// Slice B — Period picker tests (B.3.1 / B.3.2 / B.3.3)
// ---------------------------------------------------------------------------

describe("DeclareProgressForm — Period picker (Slice B)", () => {
  it("B.3.1: submit disabled + loading indicator present while periods load; selectOptions enables submit after resolve", async () => {
    // Use a promise gate so the MSW handler blocks until we have asserted the loading state.
    // This test MUST fail if `periodsLoading` is removed from the `submitDisabled` expression.
    let releasePeriods!: () => void;
    const periodsGate = new Promise<void>((resolve) => {
      releasePeriods = resolve;
    });

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", async () => {
        // Block until the test explicitly releases the gate
        await periodsGate;
        return HttpResponse.json(PERIODS_FIXTURE);
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
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    // --- LOADING STATE ASSERTIONS (gate not yet released — periods still in-flight) ---
    // (1) Submit must be disabled while periods are loading
    const submitBtn = await screen.findByRole("button", { name: /guardar intento/i });
    expect(submitBtn).toBeDisabled();

    // (2) Loading indicator must be present — shown as combobox placeholder
    const periodsCombobox = screen.getByRole("combobox", { name: /período/i });
    expect(periodsCombobox).toHaveAttribute("placeholder", expect.stringMatching(/cargando períodos/i));

    // --- RESOLVED STATE: release the gate → handler returns PERIODS_FIXTURE ---
    releasePeriods();

    // Wait for combobox to become enabled (periods loaded)
    const periodSelect = screen.getByRole("combobox", { name: /período/i });
    await waitFor(() => {
      expect(periodSelect).not.toBeDisabled();
    });

    // Open combobox and verify periods appear as options
    await user.click(periodSelect);
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "2025-1" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "2025-2" })).toBeInTheDocument();
    });

    // Select a period → submit must become enabled
    const optB31 = await screen.findByRole("option", { name: "2025-1" });
    await user.click(optB31);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /guardar intento/i })).not.toBeDisabled();
    });
  });

  it("B.3.2: empty periods list → disabled select + 'No hay períodos disponibles'; submit disabled", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json([]))
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    // Must show "No hay períodos disponibles" as placeholder
    const periodSelect = await screen.findByRole("combobox", { name: /período/i });
    await waitFor(() => {
      expect(periodSelect).toHaveAttribute("placeholder", expect.stringMatching(/no hay períodos disponibles/i));
    });

    // Combobox must be disabled
    expect(periodSelect).toBeDisabled();

    // Submit must remain disabled
    const submitBtn = screen.getByRole("button", { name: /guardar intento/i });
    expect(submitBtn).toBeDisabled();
  });

  it("B.3.3: periods API 500 → role='alert' notice visible; submit disabled", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json({ detail: "Server error" }, { status: 500 }))
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    // Error notice must appear with role="alert"
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    // Submit must remain disabled
    const submitBtn = screen.getByRole("button", { name: /guardar intento/i });
    expect(submitBtn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Original tests (migrated: textbox /período/i → selectOptions combobox /período/i)
// ---------------------------------------------------------------------------

describe("DeclareProgressForm (PRG-1-HP)", () => {
  it("renders curriculum malla with semester groupings", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
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
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    // Select PASSED
    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    // Fill grade (PASSED requires grade)
    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nota/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("textbox", { name: /nota/i }), { target: { value: "4.2" } });

    // Select period from combobox
    const periodSelect = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelect);
    const option2025_1 = await screen.findByRole("option", { name: "2025-1" });
    await user.click(option2025_1);

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
        periodId: "period-p1",
      });
    });
  });

  it("shows 422 error (grade-status mismatch) to user", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nota/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("textbox", { name: /nota/i }), { target: { value: "2.5" } });

    // Select period from combobox
    const periodSelect = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelect);
    const opt422 = await screen.findByRole("option", { name: "2025-1" });
    await user.click(opt422);

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
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    // Select CANCELLED — grade field should be hidden
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "CANCELLED");

    // Grade field must NOT be present when CANCELLED
    expect(screen.queryByRole("textbox", { name: /nota/i })).not.toBeInTheDocument();
  });

  it("submits POST with journeyCode from referenceJourney.code (NOCTURNA — not hardcoded)", async () => {
    // Curriculum returns referenceJourney.code = "NOCTURNA".
    // The POST body must contain journeyCode: "NOCTURNA", not the hardcoded "DIURNA".
    let capturedBody: unknown = null;

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW_NOCTURNA)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nota/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("textbox", { name: /nota/i }), { target: { value: "3.8" } });

    // Select period from combobox
    const periodSelectNoc = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelectNoc);
    const optNoc = await screen.findByRole("option", { name: "2025-2" });
    await user.click(optNoc);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({ journeyCode: "NOCTURNA", periodId: "period-p2" });
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
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nota/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("textbox", { name: /nota/i }), { target: { value: "4.2" } });

    // Select period from combobox
    const periodSelectDiu = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelectDiu);
    const optDiu = await screen.findByRole("option", { name: "2025-1" });
    await user.click(optDiu);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        subscriptionId: SUBSCRIPTION_ID,
        courseId: "c-1",
        status: "PASSED",
        journeyCode: "DIURNA",
        periodId: "period-p1",
      });
    });
  });

  it("shows 409 conflict error (duplicate attempt) to user", async () => {
    // POST returns 409 (duplicate attempt), component surfaces the error.
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
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

    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nota/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("textbox", { name: /nota/i }), { target: { value: "3.5" } });

    // Select period from combobox
    const periodSelect409 = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelect409);
    const opt409 = await screen.findByRole("option", { name: "2025-1" });
    await user.click(opt409);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(
        /conflicto|Ya existe|intento registrado/i
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Grade field validation (Change 3)
// ---------------------------------------------------------------------------

describe("DeclareProgressForm — grade field validation (Change 3)", () => {
  /** Open the inline form for c-1 and return the grade input. */
  async function openFormAndGetGradeInput(user: ReturnType<typeof userEvent.setup>) {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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

    await screen.findByText("Matemáticas Generales");
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    // Default status is PASSED → grade field is visible
    return screen.getByRole("textbox", { name: /nota/i });
  }

  it("typing alphabetic characters into grade input does not set a non-numeric value", async () => {
    // The input onChange filter must strip non-numeric characters so the field
    // stays empty (or retains its previous valid value) when letters are typed.
    const user = userEvent.setup();
    const gradeInput = await openFormAndGetGradeInput(user);

    fireEvent.change(gradeInput, { target: { value: "abc" } });

    // After firing change with letters, field value must not be "abc" — filter strips it.
    expect((gradeInput as HTMLInputElement).value).not.toBe("abc");
    expect((gradeInput as HTMLInputElement).value).not.toMatch(/[a-zA-Z]/);
  });

  it("typing '4.5' is accepted as a valid grade", async () => {
    const user = userEvent.setup();
    const gradeInput = await openFormAndGetGradeInput(user);

    fireEvent.change(gradeInput, { target: { value: "4.5" } });

    expect((gradeInput as HTMLInputElement).value).toBe("4.5");
  });

  it("typing '5.5' (above max) is rejected or clamped — value must be ≤ 5", async () => {
    const user = userEvent.setup();
    const gradeInput = await openFormAndGetGradeInput(user);

    fireEvent.change(gradeInput, { target: { value: "5.5" } });

    // Value must not remain "5.5" — it should be clamped or stripped to ≤ 5
    const val = parseFloat((gradeInput as HTMLInputElement).value);
    if (!isNaN(val)) {
      expect(val).toBeLessThanOrEqual(5);
    }
    // If the implementation leaves it empty that's also acceptable (rejected)
  });

  it("submitting PASSED status with empty grade shows a validation error", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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

    await screen.findByText("Matemáticas Generales");
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    // Select PASSED and leave grade empty
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    const gradeInput = screen.getByRole("textbox", { name: /nota/i });
    await user.clear(gradeInput);

    // Select a valid period so that's not the blocking issue
    const periodSelectGV = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelectGV);
    const optGV = await screen.findByRole("option", { name: "2025-1" });
    await user.click(optGV);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    // A validation error message must appear for the grade field (in the destructive <p> element)
    await waitFor(() => {
      const errorEls = screen.getAllByText(/nota válida|nota.*entre|0\.0.*5\.0|5\.0.*0\.0|nota.*requerida|ingresá/i);
      // At least one must be the red error paragraph (not the label)
      const errorParagraph = errorEls.find((el) => el.tagName === "P");
      expect(errorParagraph).toBeTruthy();
    });
  });

  it("submitting CANCELLED status with empty grade does NOT show a grade validation error", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
      http.post("/api/v1/me/course-attempts", async () =>
        HttpResponse.json({ id: "a-x", status: "CANCELLED" }, { status: 201 })
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

    await screen.findByText("Matemáticas Generales");
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    // Select CANCELLED — grade field should be hidden (no grade required)
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "CANCELLED");

    // Grade field must be absent
    expect(screen.queryByRole("textbox", { name: /nota/i })).not.toBeInTheDocument();

    // Select a valid period and submit
    const periodSelectCanc = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelectCanc);
    const optCanc = await screen.findByRole("option", { name: "2025-1" });
    await user.click(optCanc);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    // Must NOT show any grade validation error — form should pass validation for CANCELLED
    await waitFor(() => {
      // No grade error message should be present
      expect(
        screen.queryByText(/nota válida|nota.*entre|0\.0.*5\.0|ingresá/i)
      ).not.toBeInTheDocument();
    });
  });

  it("submitting PASSED status with grade '4.0' passes validation and fires POST", async () => {
    let capturedBody: unknown = null;

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE)),
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
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "PASSED");

    const gradeInput = await screen.findByRole("textbox", { name: /nota/i });
    fireEvent.change(gradeInput, { target: { value: "4.0" } });

    const periodSelectP = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelectP);
    const optP = await screen.findByRole("option", { name: "2025-1" });
    await user.click(optP);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    await waitFor(() => {
      expect(capturedBody).toMatchObject({
        status: "PASSED",
        finalGrade: 4,
      });
    });
  });

  it("submitting FAILED status with empty grade shows a validation error", async () => {
    const user = userEvent.setup();

    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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

    await screen.findByText("Matemáticas Generales");
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: /estado/i })).toBeInTheDocument();
    });

    // Select FAILED and leave grade empty
    await user.selectOptions(screen.getByRole("combobox", { name: /estado/i }), "FAILED");

    const gradeInput = screen.getByRole("textbox", { name: /nota/i });
    await user.clear(gradeInput);

    const periodSelectF = await screen.findByRole("combobox", { name: /período/i });
    await user.click(periodSelectF);
    const optF = await screen.findByRole("option", { name: "2025-1" });
    await user.click(optF);

    await user.click(screen.getByRole("button", { name: /guardar intento/i }));

    // A grade validation error must appear (in the destructive <p> element, not the label)
    await waitFor(() => {
      const errorEls = screen.getAllByText(/nota válida|nota.*entre|0\.0.*5\.0|nota.*requerida|ingresá/i);
      const errorParagraph = errorEls.find((el) => el.tagName === "P");
      expect(errorParagraph).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// Change 1 — type="text" grade input behavior (TDD)
// ---------------------------------------------------------------------------

describe("DeclareProgressForm — grade field type=text behavior (Change 1)", () => {
  async function openAndGetGradeTextbox() {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_VIEW)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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
    const declareBtn = screen.getAllByRole("button", { name: /declarar/i })[0]!;
    await user.click(declareBtn);

    await waitFor(() => {
      expect(screen.getByRole("textbox", { name: /nota/i })).toBeInTheDocument();
    });

    return screen.getByRole("textbox", { name: /nota/i });
  }

  it("grade input is type=text (not type=number)", async () => {
    const gradeInput = await openAndGetGradeTextbox();
    expect(gradeInput).not.toHaveAttribute("type", "number");
    expect(gradeInput).toHaveAttribute("type", "text");
  });

  it("typing 'DASDASD' leaves field empty (filter strips non-numeric)", async () => {
    const gradeInput = await openAndGetGradeTextbox();
    fireEvent.change(gradeInput, { target: { value: "DASDASD" } });
    expect((gradeInput as HTMLInputElement).value).toBe("");
  });

  it("typing '4.5' keeps field value as '4.5'", async () => {
    const gradeInput = await openAndGetGradeTextbox();
    fireEvent.change(gradeInput, { target: { value: "4.5" } });
    expect((gradeInput as HTMLInputElement).value).toBe("4.5");
  });

  it("typing '7' leaves field empty (>5 rejected)", async () => {
    const gradeInput = await openAndGetGradeTextbox();
    fireEvent.change(gradeInput, { target: { value: "7" } });
    expect((gradeInput as HTMLInputElement).value).toBe("");
  });

  it("typing '5.5' leaves field empty (>5 rejected)", async () => {
    const gradeInput = await openAndGetGradeTextbox();
    fireEvent.change(gradeInput, { target: { value: "5.5" } });
    expect((gradeInput as HTMLInputElement).value).toBe("");
  });
});

// ---------------------------------------------------------------------------
// PROP-001 — concrete profundización elective mapped onto a numbered slot
// ---------------------------------------------------------------------------

describe("DeclareProgressForm — PROP-001 filled elective", () => {
  /** Curriculum with one FILLED and one UNFILLED numbered Profundización slot. */
  const CURRICULUM_PROFUNDIZACION = {
    subscriptionId: SUBSCRIPTION_ID,
    referenceJourney: { code: "DIURNA", name: "Diurna" },
    semesters: [
      {
        recommendedSemester: 7,
        courses: [
          {
            courseId: "prof-1",
            officialCode: null,
            name: "Profundización I",
            credits: 3,
            type: "DEEPENING",
            progressStatus: "PASSED",
            unmetRequirements: [],
            // Concrete elective approved for this slot.
            filledElectiveName: "Diseño Centrado en el Usuario",
          },
          {
            courseId: "prof-2",
            officialCode: null,
            name: "Profundización II",
            credits: 3,
            type: "DEEPENING",
            progressStatus: "PASSED",
            unmetRequirements: [],
            // Slot not yet filled → no elective subtitle should render.
            filledElectiveName: null,
          },
        ],
      },
    ],
  };

  it("renders the concrete elective as a secondary line under a filled slot", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_PROFUNDIZACION)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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

    // Slot name (primary line) is present…
    expect(await screen.findByText("Profundización I")).toBeInTheDocument();
    // …and the concrete elective renders as the secondary line (with a title for truncation).
    expect(
      screen.getByText("Diseño Centrado en el Usuario")
    ).toBeInTheDocument();
    expect(
      screen.getByTitle("Diseño Centrado en el Usuario")
    ).toBeInTheDocument();
  });

  it("renders no elective subtitle for an unfilled slot (filledElectiveName null)", async () => {
    server.use(
      http.get(
        `/api/v1/me/subscriptions/${SUBSCRIPTION_ID}/curriculum`,
        () => HttpResponse.json(CURRICULUM_PROFUNDIZACION)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS_FIXTURE))
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

    // The unfilled slot renders its name…
    expect(await screen.findByText("Profundización II")).toBeInTheDocument();
    // …and the elective subtitle is the only titled node in these (PASSED, no-unmet)
    // rows, so exactly one exists — the filled slot's — proving the null slot rendered none.
    expect(screen.getAllByTitle(/.+/)).toHaveLength(1);
  });
});
