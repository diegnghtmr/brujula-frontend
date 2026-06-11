/**
 * AttemptListPage — Slice C tests
 *
 * Spec scenarios:
 * C.3.1  Populated list: N rows with course/period/status/grade visible
 * C.3.2  Empty list: empty-state message shown
 * C.3.3  Paginated: pagination controls visible when totalPages > 1
 * C.3.4  Edit success: PUT body carries version; list invalidated/refetched
 * C.3.5  409 conflict: role="alert" recoverable notice + second GET fires + form stays open with typed values
 * C.3.6  Delete confirm: DELETE 204 → row gone + list refetched
 * C.3.7  Delete cancel: zero DELETE requests
 * C.3.8  A11y: status badge is text+icon, not color-only; buttons have accessible names
 * C.3.9  Entry link from SubscriptionListPage: "Ver historial" href correct
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { AttemptListPage } from "@/features/progress/components/attempt-list-page";
import { SubscriptionListPage } from "@/features/progress/components/subscription-list-page";

const SUBSCRIPTION_ID = "sub-c-1";

function createWrapper(initialPath = `/progress/subscriptions/${SUBSCRIPTION_ID}/attempts`) {
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

function renderAttemptListPage(initialPath = `/progress/subscriptions/${SUBSCRIPTION_ID}/attempts`) {
  return render(
    <Routes>
      <Route
        path="/progress/subscriptions/:subscriptionId/attempts"
        element={<AttemptListPage />}
      />
    </Routes>,
    { wrapper: createWrapper(initialPath) }
  );
}

// Minimal periods fixture needed by edit form
const PERIODS = [
  { id: "period-p1", name: "2025-1", status: "ACTIVE" },
  { id: "period-p2", name: "2025-2", status: "ACTIVE" },
];

const ATTEMPT_1 = {
  id: "attempt-1",
  subscriptionId: SUBSCRIPTION_ID,
  courseId: "course-1",
  courseName: "Matemáticas Generales",
  periodId: "period-p1",
  periodName: "2025-1",
  journeyCode: "DIURNA",
  status: "PASSED",
  finalGrade: 4.5,
  registeredAt: "2026-01-01T00:00:00Z",
  version: 0,
};

const ATTEMPT_2 = {
  id: "attempt-2",
  subscriptionId: SUBSCRIPTION_ID,
  courseId: "course-2",
  courseName: "Programación I",
  periodId: "period-p2",
  periodName: "2025-2",
  journeyCode: "DIURNA",
  status: "FAILED",
  finalGrade: 2.0,
  registeredAt: "2026-01-01T00:00:00Z",
  version: 1,
};

const PAGE_RESPONSE_1 = {
  page: 0,
  size: 20,
  totalElements: 2,
  totalPages: 1,
  content: [ATTEMPT_1, ATTEMPT_2],
};

const PAGE_RESPONSE_EMPTY = {
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  content: [],
};

const PAGE_RESPONSE_PAGINATED = {
  page: 0,
  size: 20,
  totalElements: 25,
  totalPages: 2,
  content: [ATTEMPT_1],
};

function setupDefaultHandlers() {
  server.use(
    http.get("/api/v1/me/course-attempts", () =>
      HttpResponse.json(PAGE_RESPONSE_1)
    ),
    http.get("/api/v1/periods", () =>
      HttpResponse.json(PERIODS)
    )
  );
}

// ---------------------------------------------------------------------------
// C.3.1 — Populated list
// ---------------------------------------------------------------------------

describe("AttemptListPage — populated list (C.3.1)", () => {
  it("renders N rows with course name, period name, status badge, and grade", async () => {
    setupDefaultHandlers();
    renderAttemptListPage();

    await screen.findByText("Matemáticas Generales");
    expect(screen.getByText("Programación I")).toBeInTheDocument();

    // Period names
    expect(screen.getByText("2025-1")).toBeInTheDocument();
    expect(screen.getByText("2025-2")).toBeInTheDocument();

    // Grades
    expect(screen.getByText(/4\.5/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0/)).toBeInTheDocument();

    // Status badges (text+icon via CourseStatusBadge pattern — must have visible label)
    const statuses = screen.getAllByText(/Aprobada|Reprobada|Cancelada|Pendiente/i);
    expect(statuses.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// C.3.2 — Empty list
// ---------------------------------------------------------------------------

describe("AttemptListPage — empty list (C.3.2)", () => {
  it("shows an empty-state message when no attempts exist", async () => {
    server.use(
      http.get("/api/v1/me/course-attempts", () =>
        HttpResponse.json(PAGE_RESPONSE_EMPTY)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS))
    );
    renderAttemptListPage();

    await screen.findByText(/no hay intentos registrados/i);
  });
});

// ---------------------------------------------------------------------------
// C.3.3 — Pagination controls
// ---------------------------------------------------------------------------

describe("AttemptListPage — pagination (C.3.3)", () => {
  it("shows pagination controls when totalPages > 1", async () => {
    server.use(
      http.get("/api/v1/me/course-attempts", () =>
        HttpResponse.json(PAGE_RESPONSE_PAGINATED)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS))
    );
    renderAttemptListPage();

    await screen.findByText("Matemáticas Generales");
    // Pagination controls should be visible
    expect(
      screen.getByRole("navigation", { name: /paginación/i })
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// C.3.4 — Edit success
// ---------------------------------------------------------------------------

describe("AttemptListPage — edit success (C.3.4)", () => {
  it("PUT body carries version; list is refetched after success", async () => {
    let putBody: unknown = null;
    let getCallCount = 0;

    server.use(
      http.get("/api/v1/me/course-attempts", () => {
        getCallCount++;
        return HttpResponse.json(PAGE_RESPONSE_1);
      }),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS)),
      http.put("/api/v1/me/course-attempts/:id", async ({ request }) => {
        putBody = await request.json();
        return HttpResponse.json({ ...ATTEMPT_1, version: 1 });
      })
    );

    renderAttemptListPage();
    await screen.findByText("Matemáticas Generales");

    // Open edit form for first attempt
    const editButtons = screen.getAllByRole("button", { name: /editar/i });
    await userEvent.click(editButtons[0]!);

    // Wait for edit form + periods to load
    const periodSelect = await screen.findByRole("combobox", { name: /período/i });
    await userEvent.selectOptions(periodSelect, "period-p1");

    // Submit edit
    const saveButton = screen.getByRole("button", { name: /guardar cambios/i });
    await userEvent.click(saveButton);

    // Assert PUT body contains version
    await waitFor(() => {
      expect(putBody).not.toBeNull();
      expect(putBody).toMatchObject({ version: 0 });
    });

    // Assert list was refetched (getCallCount > 1 means invalidation fired)
    await waitFor(() => {
      expect(getCallCount).toBeGreaterThan(1);
    });
  });
});

// ---------------------------------------------------------------------------
// C.3.5 — 409 conflict
// ---------------------------------------------------------------------------

describe("AttemptListPage — 409 conflict (C.3.5)", () => {
  it("shows role=alert notice, refetches list, form stays open with typed values, retry uses refreshed version", async () => {
    let getCallCount = 0;
    let secondPutBody: unknown = null;

    // On the second GET (triggered by invalidation after 409), return bumped version.
    // This proves that InlineEditForm receives the updated attempt prop and onSubmit
    // reads attempt.version from the live prop — not from stale defaultValues.
    const ATTEMPT_1_BUMPED = { ...ATTEMPT_1, version: 1 };

    server.use(
      http.get("/api/v1/me/course-attempts", () => {
        getCallCount++;
        const content = getCallCount >= 2
          ? [ATTEMPT_1_BUMPED, ATTEMPT_2]
          : [ATTEMPT_1, ATTEMPT_2];
        return HttpResponse.json({ ...PAGE_RESPONSE_1, content });
      }),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS)),
      http.put("/api/v1/me/course-attempts/:id", () =>
        HttpResponse.json(
          { detail: "Conflicto de versión" },
          { status: 409 }
        )
      )
    );

    renderAttemptListPage();
    await screen.findByText("Matemáticas Generales");

    // Open edit form
    const editButtons = screen.getAllByRole("button", { name: /editar/i });
    await userEvent.click(editButtons[0]!);

    // Wait for periods to load and select a period
    const periodSelect = await screen.findByRole("combobox", { name: /período/i });
    await userEvent.selectOptions(periodSelect, "period-p1");

    // Type a custom grade value to verify form retention after 409
    const gradeInput = screen.getByRole("spinbutton", { name: /nota/i });
    await userEvent.clear(gradeInput);
    await userEvent.type(gradeInput, "3.8");

    // Submit — should get 409
    const saveButton = screen.getByRole("button", { name: /guardar cambios/i });
    await userEvent.click(saveButton);

    // Assert: role=alert conflict notice
    await screen.findByRole("alert");
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/cambió|conflicto/i);

    // Assert: a second GET fired (invalidation/refetch happened)
    await waitFor(() => {
      expect(getCallCount).toBeGreaterThan(1);
    });

    // Assert: form is still open (save button still visible)
    expect(screen.getByRole("button", { name: /guardar cambios/i })).toBeInTheDocument();

    // Assert: grade input still has typed value (form not reset)
    expect(screen.getByRole("spinbutton", { name: /nota/i })).toHaveValue(3.8);

    // W-3: Now install a PUT handler that returns 200 and captures the body.
    // The component already received ATTEMPT_1_BUMPED (version: 1) via the second GET.
    // Re-submitting must use the refreshed version from the live attempt prop.
    server.use(
      http.put("/api/v1/me/course-attempts/:id", async ({ request }) => {
        secondPutBody = await request.json();
        return HttpResponse.json(ATTEMPT_1_BUMPED);
      })
    );

    // Re-submit — this time PUT returns 200
    const saveButtonRetry = screen.getByRole("button", { name: /guardar cambios/i });
    await userEvent.click(saveButtonRetry);

    // Assert: second PUT body carries the REFRESHED version (> 0), not the stale version 0.
    // This test FAILS if onSubmit reads version from defaultValues instead of attempt.version.
    await waitFor(() => {
      expect(secondPutBody).not.toBeNull();
      expect((secondPutBody as { version: number }).version).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// C.3.6 — Delete confirm
// ---------------------------------------------------------------------------

describe("AttemptListPage — delete confirm (C.3.6)", () => {
  it("DELETE 204 → row gone + list refetched", async () => {
    let getCallCount = 0;
    let deleteCount = 0;

    server.use(
      http.get("/api/v1/me/course-attempts", () => {
        getCallCount++;
        if (deleteCount > 0) {
          return HttpResponse.json({
            ...PAGE_RESPONSE_1,
            content: [ATTEMPT_2],
            totalElements: 1,
          });
        }
        return HttpResponse.json(PAGE_RESPONSE_1);
      }),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS)),
      http.delete("/api/v1/me/course-attempts/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAttemptListPage();
    await screen.findByText("Matemáticas Generales");

    // Click delete on first row
    const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
    await userEvent.click(deleteButtons[0]!);

    // Confirmation dialog/inline confirm should appear
    const confirmButton = await screen.findByRole("button", { name: /confirmar/i });
    await userEvent.click(confirmButton);

    // DELETE should have fired
    await waitFor(() => {
      expect(deleteCount).toBe(1);
    });

    // List should refetch
    await waitFor(() => {
      expect(getCallCount).toBeGreaterThan(1);
    });

    // The deleted row should be gone
    await waitFor(() => {
      expect(screen.queryByText("Matemáticas Generales")).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// C.3.7 — Delete cancel
// ---------------------------------------------------------------------------

describe("AttemptListPage — delete cancel (C.3.7)", () => {
  it("cancel sends zero DELETE requests", async () => {
    let deleteCount = 0;

    server.use(
      http.get("/api/v1/me/course-attempts", () =>
        HttpResponse.json(PAGE_RESPONSE_1)
      ),
      http.get("/api/v1/periods", () => HttpResponse.json(PERIODS)),
      http.delete("/api/v1/me/course-attempts/:id", () => {
        deleteCount++;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderAttemptListPage();
    await screen.findByText("Matemáticas Generales");

    // Click delete
    const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });
    await userEvent.click(deleteButtons[0]!);

    // Cancel
    const cancelButton = await screen.findByRole("button", { name: /cancelar eliminación/i });
    await userEvent.click(cancelButton);

    // No DELETE should have fired
    expect(deleteCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C.3.8 — A11y: status label is text, not color-only; buttons have accessible names
// ---------------------------------------------------------------------------

describe("AttemptListPage — a11y (C.3.8)", () => {
  it("status badges have visible text labels (color+icon+label, not color-only)", async () => {
    setupDefaultHandlers();
    renderAttemptListPage();

    await screen.findByText("Matemáticas Generales");

    // These text labels must be present in the DOM (not sr-only, not hidden)
    const passedLabel = screen.getByText("Aprobada");
    const failedLabel = screen.getByText("Reprobada");

    expect(passedLabel).toBeVisible();
    expect(failedLabel).toBeVisible();
  });

  it("edit and delete buttons have accessible names", async () => {
    setupDefaultHandlers();
    renderAttemptListPage();

    await screen.findByText("Matemáticas Generales");

    const editButtons = screen.getAllByRole("button", { name: /editar/i });
    const deleteButtons = screen.getAllByRole("button", { name: /eliminar/i });

    expect(editButtons.length).toBeGreaterThan(0);
    expect(deleteButtons.length).toBeGreaterThan(0);

    editButtons.forEach((btn) => {
      expect(btn).toHaveAccessibleName();
    });
    deleteButtons.forEach((btn) => {
      expect(btn).toHaveAccessibleName();
    });
  });
});

// ---------------------------------------------------------------------------
// C.3.9 — Entry link from SubscriptionListPage
// ---------------------------------------------------------------------------

describe("SubscriptionListPage — 'Ver historial' link (C.3.9)", () => {
  it("renders 'Ver historial' link with href /progress/subscriptions/{id}/attempts", async () => {
    server.use(
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([
          {
            id: "sub-c-1",
            programId: "prog-1",
            programName: "Ingeniería de Sistemas",
            planId: "plan-1",
            planName: "Plan 2020",
            referenceJourney: { code: "DIURNA", name: "Diurna" },
            version: 0,
            createdAt: "2026-01-01T00:00:00Z",
          },
        ])
      )
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    render(
      <Routes>
        <Route
          path="/progress/subscriptions"
          element={<SubscriptionListPage />}
        />
      </Routes>,
      {
        wrapper: ({ children }: { children: ReactNode }) =>
          createElement(
            QueryClientProvider,
            { client: queryClient },
            createElement(
              MemoryRouter,
              { initialEntries: ["/progress/subscriptions"] },
              children
            )
          ),
      }
    );

    const historialLink = await screen.findByRole("link", { name: /ver historial/i });
    expect(historialLink).toBeInTheDocument();
    expect(historialLink).toHaveAttribute(
      "href",
      "/progress/subscriptions/sub-c-1/attempts"
    );
  });
});
