/**
 * OfferingBrowser
 *
 * Filtered offerings rendered from MSW.
 * Option picker fires addSelection mutation.
 *
 * New tests (simulation-browser-ux):
 * - Eligibility bucket placement (passed/blocked/available)
 * - Degradation when no subscription matches scope entry
 * - Filter bar behavior (search, semester, type, AND composition)
 * - Empty state when filter yields no results
 * - Passed bucket rendered last in DOM order
 * - Raw "FINAL" status no longer rendered to students
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { OfferingBrowser } from "@/features/simulation/components/offering-browser";

const PERIOD_ID = "period-1";
const PROGRAM_ID = "prog-1";
const PROGRAM_ID_2 = "prog-2";
const SIMULATION_ID = "sim-1";

const OFFERINGS_FIXTURE = {
  content: [
    {
      id: "off-1",
      courseId: "course-1",
      courseName: "Cálculo I",
      programId: PROGRAM_ID,
      periodId: PERIOD_ID,
      status: "PRELIMINARY",
      version: 1,
    },
    {
      id: "off-2",
      courseId: "course-2",
      courseName: "Física I",
      programId: PROGRAM_ID,
      periodId: PERIOD_ID,
      status: "FINAL",
      version: 1,
    },
  ],
  totalElements: 2,
  totalPages: 1,
  size: 20,
  number: 0,
};

const OFFERING_DETAIL = {
  id: "off-1",
  courseId: "course-1",
  courseName: "Cálculo I",
  programId: PROGRAM_ID,
  periodId: PERIOD_ID,
  status: "PRELIMINARY",
  version: 1,
  scheduleOptions: [
    {
      id: "opt-1",
      offeringId: "off-1",
      label: "Grupo A",
      journeyCode: "DIURNA",
      weeklyHours: 4,
      sessions: [
        { day: "MONDAY", startsAt: "08:00", endsAt: "10:00" },
        { day: "WEDNESDAY", startsAt: "08:00", endsAt: "10:00" },
      ],
      version: 1,
    },
  ],
};

const SELECTION_CREATED = {
  id: "sel-1",
  offeringId: "off-1",
  scheduleOptionId: "opt-1",
  courseId: "course-1",
  courseName: "Cálculo I",
  programId: PROGRAM_ID,
  credits: 4,
  journeyCode: "DIURNA",
  offeringStatus: "PRELIMINARY",
  selectedOfferingVersion: 1,
  sessions: [
    { day: "MONDAY", startsAt: "08:00", endsAt: "10:00" },
  ],
  warnings: [],
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

describe("OfferingBrowser", () => {
  it("renders offerings filtered by periodId and programId from MSW", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Both offerings rendered
    expect(await screen.findByText("Cálculo I")).toBeInTheDocument();
    expect(await screen.findByText("Física I")).toBeInTheDocument();
  });

  it("clicking on offering expands schedule options", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    // Click to expand
    await user.click(screen.getByRole("button", { name: /cálculo i/i }));

    // Schedule option "Grupo A" visible
    await waitFor(() => {
      expect(screen.getByText("Grupo A")).toBeInTheDocument();
    });
  });

  it("Add button fires addSelection mutation to POST /me/simulations/:id/selections", async () => {
    let capturedBody: unknown = null;
    let capturedIdempotencyKey: string | null = null;

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL)),
      http.post(`/api/v1/me/simulations/${SIMULATION_ID}/selections`, async ({ request }) => {
        capturedIdempotencyKey = request.headers.get("Idempotency-Key");
        capturedBody = await request.json();
        return HttpResponse.json(SELECTION_CREATED, { status: 201 });
      })
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");

    // Expand offering
    await user.click(screen.getByRole("button", { name: /cálculo i/i }));
    await waitFor(() => {
      expect(screen.getByText("Grupo A")).toBeInTheDocument();
    });

    // Click "Agregar" button for the schedule option
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(capturedIdempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      // scheduleOptionId from data — not hardcoded
      expect(capturedBody).toMatchObject({ scheduleOptionId: "opt-1" });
    });
  });

  /**
   * RED→GREEN test: multi-program gap.
   * This test MUST FAIL against the original single-programId code.
   * It passes only after OfferingBrowser fetches ALL programIds.
   */
  it("renders offerings from ALL programIds — second program offerings must appear (FE-002)", async () => {
    // Prog-1 offerings
    const prog1Offerings = {
      content: [
        {
          id: "off-p1",
          courseId: "course-p1",
          courseName: "Cálculo Diferencial",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "PUBLISHED",
          version: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    // Prog-2 offerings — DISTINCT from prog-1
    const prog2Offerings = {
      content: [
        {
          id: "off-p2",
          courseId: "course-p2",
          courseName: "Álgebra Lineal",
          programId: PROGRAM_ID_2,
          periodId: PERIOD_ID,
          status: "PUBLISHED",
          version: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    server.use(
      // Return different offerings based on programId query param
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        const programId = url.searchParams.get("programId");
        if (programId === PROGRAM_ID_2) return HttpResponse.json(prog2Offerings);
        return HttpResponse.json(prog1Offerings);
      })
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }, { programId: PROGRAM_ID_2, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Both programs' offerings must be visible
    expect(await screen.findByText("Cálculo Diferencial")).toBeInTheDocument();
    expect(await screen.findByText("Álgebra Lineal")).toBeInTheDocument();
  });

  it("aggregates all offering pages for each simulation program", async () => {
    const firstPage = {
      content: [
        {
          id: "off-page-1",
          courseId: "course-page-1",
          courseName: "Arquitectura de Software",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          notes: "source sheet: Catálogo Diurna; level 8",
          version: 1,
        },
      ],
      totalElements: 2,
      totalPages: 2,
      size: 1,
      page: 0,
    };
    const secondPage = {
      content: [
        {
          id: "off-page-2",
          courseId: "course-page-2",
          courseName: "Compiladores",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          notes: "source sheet: Catálogo Nocturna; level 9",
          version: 1,
        },
      ],
      totalElements: 2,
      totalPages: 2,
      size: 1,
      page: 1,
    };

    server.use(
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        return HttpResponse.json(url.searchParams.get("page") === "1" ? secondPage : firstPage);
      })
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Arquitectura de Software")).toBeInTheDocument();
    expect(await screen.findByText("Compiladores")).toBeInTheDocument();
  });

  it("per-row semester label appears from curriculum data and hides selected offerings", async () => {
    // Rewritten from the old coincidental "groups by semester" test.
    // Previously, findByText("Semestre 1") matched <option> elements in the filter
    // bar's <select>, not intra-bucket group headings. Now fix #7 renders a per-row
    // "Semestre N" label from the verdict's recommendedSemester, so we test that.
    const groupedOfferings = {
      content: [
        {
          id: "off-selected",
          courseId: "course-selected",
          courseName: "Debe desaparecer",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
        {
          id: "off-sem-3",
          courseId: "course-sem-3",
          courseName: "Estructuras de Datos",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
        {
          id: "off-sem-1",
          courseId: "course-sem-1",
          courseName: "Lógica de Programación",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
      ],
      totalElements: 3,
      totalPages: 1,
      size: 20,
      page: 0,
    };

    const semesterCurriculum = {
      subscriptionId: "sub-1",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        {
          recommendedSemester: 1,
          courses: [
            {
              courseId: "course-sem-1",
              officialCode: "LOG101",
              name: "Lógica de Programación",
              credits: 3,
              type: "REQUIRED",
              progressStatus: "AVAILABLE",
              unmetRequirements: [],
            },
          ],
        },
        {
          recommendedSemester: 3,
          courses: [
            {
              courseId: "course-sem-3",
              officialCode: "ED301",
              name: "Estructuras de Datos",
              credits: 4,
              type: "REQUIRED",
              progressStatus: "AVAILABLE",
              unmetRequirements: [],
            },
          ],
        },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(groupedOfferings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(semesterCurriculum))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
        selectedOfferingIds={["off-selected"]}
      />,
      { wrapper: createWrapper() }
    );

    // Both non-selected courses visible
    expect(await screen.findByText("Lógica de Programación")).toBeInTheDocument();
    expect(screen.getByText("Estructuras de Datos")).toBeInTheDocument();
    // Selected offering must be hidden
    expect(screen.queryByText("Debe desaparecer")).not.toBeInTheDocument();

    // Per-row semester labels rendered from verdict.recommendedSemester
    // There are two rows with semester labels (1 and 3)
    const semLabels = screen.getAllByText(/^Semestre \d+$/);
    const semTexts = semLabels.map((el) => el.textContent);
    expect(semTexts).toContain("Semestre 1");
    expect(semTexts).toContain("Semestre 3");

    // Semestre 1 label must come before Semestre 3 label in DOM
    // (labels are sorted by semester number extracted from text)
    const sorted = [...semLabels].sort((a, b) =>
      Number(a.textContent?.replace("Semestre ", "") ?? 0) -
      Number(b.textContent?.replace("Semestre ", "") ?? 0)
    );
    const semOne = sorted[0]!;
    const semThree = sorted[1]!;
    expect(semOne.compareDocumentPosition(semThree)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("offering whose programId is not in scopeEntries shows NO schedule options (fail-closed)", async () => {
    // The offering belongs to a programId that is NOT present in scopeEntries.
    // selectedJourneys will be an empty Set (no match in journeysByProgram),
    // so the fail-closed filter must yield zero options — never ALL options.
    const unknownProgramOffering = {
      content: [
        {
          id: "off-unknown",
          courseId: "course-unknown",
          courseName: "Materia Desconocida",
          programId: "prog-unknown",
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    const detailWithOptions = {
      id: "off-unknown",
      courseId: "course-unknown",
      courseName: "Materia Desconocida",
      programId: "prog-unknown",
      periodId: PERIOD_ID,
      status: "FINAL",
      version: 1,
      scheduleOptions: [
        {
          id: "opt-u",
          offeringId: "off-unknown",
          label: "Grupo X",
          journeyCode: "DIURNA",
          weeklyHours: 3,
          sessions: [],
          version: 1,
        },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(unknownProgramOffering)),
      http.get("/api/v1/offerings/off-unknown", () => HttpResponse.json(detailWithOptions))
    );

    const user = userEvent.setup();
    // scopeEntries references PROGRAM_ID — not "prog-unknown" — so selectedJourneys is empty Set
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Materia Desconocida");
    await user.click(screen.getByRole("button", { name: /materia desconocida/i }));

    // Must show empty state, never "Grupo X"
    await waitFor(() => {
      expect(screen.getByText(/sin opciones de horario disponibles/i)).toBeInTheDocument();
      expect(screen.queryByText("Grupo X")).not.toBeInTheDocument();
    });
  });

  it("409 blocking error from addSelection shown in UI", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/offerings/off-1", () => HttpResponse.json(OFFERING_DETAIL)),
      http.post(`/api/v1/me/simulations/${SIMULATION_ID}/selections`, () =>
        HttpResponse.json(
          {
            type: "about:blank",
            title: "Simulation Schedule Clash",
            status: 409,
            code: "SIMULATION_SCHEDULE_CLASH",
            detail: "Choque de horario con Física I el MIÉRCOLES 08:00–10:00.",
            metadata: {
              day: "WEDNESDAY",
              startsAt: "08:00",
              endsAt: "10:00",
              conflictingCourseName: "Física I",
            },
          },
          { status: 409 }
        )
      )
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    await user.click(screen.getByRole("button", { name: /cálculo i/i }));
    await waitFor(() => {
      expect(screen.getByText("Grupo A")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /agregar/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/choque|clash|Física I/i);
    });
  });

  it("passes journeyCode filter to listOfferings and hides NOCTURNA schedule options", async () => {
    const offeringWithBothJourneys = {
      content: [{ id: "off-j", courseId: "course-j", courseName: "Cálculo I", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 }],
      totalElements: 1, totalPages: 1, size: 20, number: 0,
    };
    const offeringDetailWithBothJourneys = {
      id: "off-j", courseId: "course-j", courseName: "Cálculo I", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1,
      scheduleOptions: [
        { id: "opt-d", offeringId: "off-j", label: "Grupo A Diurno", journeyCode: "DIURNA", weeklyHours: 4, sessions: [], version: 1 },
        { id: "opt-n", offeringId: "off-j", label: "Grupo B Nocturno", journeyCode: "NOCTURNA", weeklyHours: 4, sessions: [], version: 1 },
      ],
    };

    let capturedJourneyCodes: string[] | null = null;
    server.use(
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        capturedJourneyCodes = url.searchParams.getAll("journeyCode");
        return HttpResponse.json(offeringWithBothJourneys);
      }),
      http.get("/api/v1/offerings/off-j", () => HttpResponse.json(offeringDetailWithBothJourneys))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    await waitFor(() => {
      expect(capturedJourneyCodes).toContain("DIURNA");
    });

    await user.click(screen.getByRole("button", { name: /cálculo i/i }));

    await waitFor(() => {
      expect(screen.getByText("Grupo A Diurno")).toBeInTheDocument();
      expect(screen.queryByText("Grupo B Nocturno")).not.toBeInTheDocument();
    });
  });

  // ─── New tests: simulation-browser-ux ──────────────────────────────────────

  /**
   * MSW curriculum fixtures shared by eligibility tests.
   * subscription "sub-1" matches programId=PROGRAM_ID + journeyCode=DIURNA.
   * curriculum has:
   *  - course-passed → PASSED
   *  - course-blocked → BLOCKED + unmetRequirements
   *  - course-1 (Cálculo I) → AVAILABLE
   */
  const SUBSCRIPTIONS_FIXTURE = [
    {
      id: "sub-1",
      programId: PROGRAM_ID,
      programName: "Ingeniería de Sistemas",
      planId: "plan-1",
      planName: "Plan 2020",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      version: 1,
      createdAt: "2025-01-01T00:00:00Z",
    },
  ];

  const CURRICULUM_FIXTURE = {
    subscriptionId: "sub-1",
    referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
    semesters: [
      {
        recommendedSemester: 1,
        courses: [
          {
            courseId: "course-passed",
            officialCode: "MAT-P",
            name: "Cálculo Aprobada",
            credits: 4,
            type: "REQUIRED",
            progressStatus: "PASSED",
            unmetRequirements: [],
          },
          {
            courseId: "course-blocked",
            officialCode: "FIS-B",
            name: "Física Bloqueada",
            credits: 3,
            type: "REQUIRED",
            progressStatus: "BLOCKED",
            unmetRequirements: ["Cálculo I"],
          },
          {
            courseId: "course-1",
            officialCode: "MAT101",
            name: "Cálculo I",
            credits: 4,
            type: "REQUIRED",
            progressStatus: "AVAILABLE",
            unmetRequirements: [],
          },
        ],
      },
    ],
  };

  const MIXED_OFFERINGS_FIXTURE = {
    content: [
      {
        id: "off-passed",
        courseId: "course-passed",
        courseName: "Cálculo Aprobada",
        programId: PROGRAM_ID,
        periodId: PERIOD_ID,
        status: "FINAL",
        version: 1,
      },
      {
        id: "off-blocked",
        courseId: "course-blocked",
        courseName: "Física Bloqueada",
        programId: PROGRAM_ID,
        periodId: PERIOD_ID,
        status: "FINAL",
        version: 1,
      },
      {
        id: "off-1",
        courseId: "course-1",
        courseName: "Cálculo I",
        programId: PROGRAM_ID,
        periodId: PERIOD_ID,
        status: "PRELIMINARY",
        version: 1,
      },
    ],
    totalElements: 3,
    totalPages: 1,
    size: 20,
    number: 0,
  };

  it("PASSED offering renders in Ya cursadas bucket; its Agregar action is absent in expand", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(MIXED_OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(CURRICULUM_FIXTURE))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // The offering appears in the Ya cursadas section
    const cursadasSection = await screen.findByRole("region", { name: /ya cursadas/i });
    expect(cursadasSection).toBeInTheDocument();
    expect(cursadasSection).toHaveTextContent("Cálculo Aprobada");
  });

  it("BLOCKED offering renders in Bloqueadas bucket with unmet reasons; Agregar remains clickable", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(MIXED_OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(CURRICULUM_FIXTURE)),
      // Detail for blocked offering — registered BEFORE clicking so it's ready when expanded
      http.get("/api/v1/offerings/off-blocked", () =>
        HttpResponse.json({
          id: "off-blocked",
          courseId: "course-blocked",
          courseName: "Física Bloqueada",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
          scheduleOptions: [
            {
              id: "opt-blocked",
              offeringId: "off-blocked",
              label: "Grupo Bloqueado",
              journeyCode: "DIURNA",
              weeklyHours: 3,
              sessions: [],
              version: 1,
            },
          ],
        })
      )
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Bloqueadas bucket visible
    const bloqueadasSection = await screen.findByRole("region", { name: /bloqueadas/i });
    expect(bloqueadasSection).toBeInTheDocument();
    expect(bloqueadasSection).toHaveTextContent("Física Bloqueada");

    // unmet requirements reason visible in the blocked offering row
    expect(bloqueadasSection).toHaveTextContent("Cálculo I");

    // Expand the blocked offering — Agregar button should still be enabled
    const blockedOfferingBtn = screen.getByRole("button", { name: /física bloqueada/i });
    await user.click(blockedOfferingBtn);

    await waitFor(() => {
      // Agregar button should be enabled (advisory block, not hard-disabled)
      const agregarBtn = screen.getByRole("button", { name: /agregar grupo bloqueado/i });
      expect(agregarBtn).not.toBeDisabled();
    });
  });

  it("degradation: no matching subscription → all offerings in Disponibles, no crash", async () => {
    server.use(
      http.get("/api/v1/offerings", () =>
        HttpResponse.json({
          content: [
            {
              id: "off-deg",
              courseId: "course-deg",
              courseName: "Materia Degradada",
              programId: PROGRAM_ID,
              periodId: PERIOD_ID,
              status: "PRELIMINARY",
              version: 1,
            },
          ],
          totalElements: 1,
          totalPages: 1,
          size: 20,
          number: 0,
        })
      ),
      // Return subscription for a different programId — no match
      http.get("/api/v1/me/subscriptions", () =>
        HttpResponse.json([
          {
            id: "sub-mismatch",
            programId: "prog-other",
            programName: "Otro Programa",
            planId: "plan-1",
            planName: "Plan 2020",
            referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
            version: 1,
            createdAt: "2025-01-01T00:00:00Z",
          },
        ])
      )
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Offering appears; no crash
    expect(await screen.findByText("Materia Degradada")).toBeInTheDocument();

    // No error state
    expect(screen.queryByText(/no se pudo cargar/i)).not.toBeInTheDocument();

    // Disponibles bucket rendered
    expect(screen.getByRole("region", { name: /disponibles/i })).toBeInTheDocument();

    // Not in Bloqueadas or Ya cursadas
    expect(screen.queryByRole("region", { name: /bloqueadas/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /ya cursadas/i })).not.toBeInTheDocument();
  });

  it("Ya cursadas bucket is rendered after Disponibles and Bloqueadas in DOM order", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(MIXED_OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(CURRICULUM_FIXTURE))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    const disponiblesSection = await screen.findByRole("region", { name: /disponibles/i });
    const bloqueadasSection = await screen.findByRole("region", { name: /bloqueadas/i });
    const cursadasSection = await screen.findByRole("region", { name: /ya cursadas/i });

    // Ya cursadas must appear after Disponibles and Bloqueadas
    expect(disponiblesSection.compareDocumentPosition(cursadasSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(bloqueadasSection.compareDocumentPosition(cursadasSection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('raw "FINAL" status string is not rendered to students', async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Física I");

    // The raw internal status "FINAL" must never appear in the DOM
    expect(screen.queryByText("FINAL")).not.toBeInTheDocument();
    expect(screen.queryByText(/\bFINAL\b/)).not.toBeInTheDocument();
    // The raw internal status "PRELIMINARY" must also never appear in the DOM
    // (off-1 in OFFERINGS_FIXTURE has status "PRELIMINARY")
    expect(screen.queryByText(/\bPRELIMINARY\b/)).not.toBeInTheDocument();
  });

  // ─── Filter bar tests ─────────────────────────────────────────────────────────

  it("typing in search input narrows the offering list and updates count", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Both offerings initially visible
    expect(await screen.findByText("Cálculo I")).toBeInTheDocument();
    expect(screen.getByText("Física I")).toBeInTheDocument();

    // Type "calculo" → only Cálculo I visible
    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "calculo");

    await waitFor(() => {
      expect(screen.getByText("Cálculo I")).toBeInTheDocument();
      expect(screen.queryByText("Física I")).not.toBeInTheDocument();
    });

    // Result count shows 1 de 2
    expect(screen.getByText(/1 de 2/)).toBeInTheDocument();
  });

  it("type filter narrows offerings to matching type only", async () => {
    // Fixture with a DEEPENING course so the type predicate can be falsified.
    // Selecting REQUIRED must HIDE the DEEPENING course and keep REQUIRED ones.
    const mixedTypeFixture = {
      content: [
        {
          id: "off-req-1",
          courseId: "course-req-1",
          courseName: "Cálculo I",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
        {
          id: "off-deep-1",
          courseId: "course-deep-1",
          courseName: "Optativa Profundización",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    const mixedTypeCurriculum = {
      subscriptionId: "sub-1",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        {
          recommendedSemester: 1,
          courses: [
            {
              courseId: "course-req-1",
              officialCode: "MAT101",
              name: "Cálculo I",
              credits: 4,
              type: "REQUIRED",
              progressStatus: "AVAILABLE",
              unmetRequirements: [],
            },
            {
              courseId: "course-deep-1",
              officialCode: "OPT101",
              name: "Optativa Profundización",
              credits: 3,
              type: "DEEPENING",
              progressStatus: "AVAILABLE",
              unmetRequirements: [],
            },
          ],
        },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(mixedTypeFixture)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(mixedTypeCurriculum))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Wait for both offerings to appear
    expect(await screen.findByText("Cálculo I")).toBeInTheDocument();
    expect(screen.getByText("Optativa Profundización")).toBeInTheDocument();

    // Select REQUIRED type — must hide the DEEPENING course
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    await user.selectOptions(typeSelect, "REQUIRED");

    await waitFor(() => {
      // REQUIRED course stays visible
      expect(screen.getByText("Cálculo I")).toBeInTheDocument();
      // DEEPENING course is hidden (would survive if predicate were removed)
      expect(screen.queryByText("Optativa Profundización")).not.toBeInTheDocument();
    });
  });

  it("AND composition: search + type both active show only intersection", async () => {
    const mixedTypeOfferings = {
      content: [
        {
          id: "off-req",
          courseId: "course-req",
          courseName: "Algoritmos",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "PRELIMINARY",
          version: 1,
        },
        {
          id: "off-deep",
          courseId: "course-deep",
          courseName: "Algoritmos Avanzados",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "PRELIMINARY",
          version: 1,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    const subscriptions = [
      {
        id: "sub-2",
        programId: PROGRAM_ID,
        programName: "Ing Sistemas",
        planId: "plan-1",
        planName: "Plan 2020",
        referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
        version: 1,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const curriculum = {
      subscriptionId: "sub-2",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        {
          recommendedSemester: 2,
          courses: [
            {
              courseId: "course-req",
              officialCode: "ALG101",
              name: "Algoritmos",
              credits: 3,
              type: "REQUIRED",
              progressStatus: "AVAILABLE",
              unmetRequirements: [],
            },
            {
              courseId: "course-deep",
              officialCode: "ALG201",
              name: "Algoritmos Avanzados",
              credits: 3,
              type: "DEEPENING",
              progressStatus: "AVAILABLE",
              unmetRequirements: [],
            },
          ],
        },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(mixedTypeOfferings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(subscriptions)),
      http.get("/api/v1/me/subscriptions/sub-2/curriculum", () => HttpResponse.json(curriculum))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Algoritmos");

    // search="algoritmos" + type="DEEPENING" → only "Algoritmos Avanzados" matches both
    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "algoritmos");

    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    await user.selectOptions(typeSelect, "DEEPENING");

    await waitFor(() => {
      expect(screen.getByText("Algoritmos Avanzados")).toBeInTheDocument();
      expect(screen.queryByText(/^Algoritmos$/)).not.toBeInTheDocument();
    });
  });

  it("blocked offering with [Recomendado] prefix: hard chip under 'Te falta aprobar', soft chip under 'Recomendado antes' (Task 3 / #11)", async () => {
    const advisoryOfferings = {
      content: [
        {
          id: "off-adv",
          courseId: "course-adv",
          courseName: "Materia Recomendada",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
      ],
      totalElements: 1,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    const advisorySubscriptions = [
      {
        id: "sub-1",
        programId: PROGRAM_ID,
        programName: "Ing Sistemas",
        planId: "plan-1",
        planName: "Plan 2020",
        referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
        version: 1,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const advisoryCurriculum = {
      subscriptionId: "sub-1",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        {
          recommendedSemester: 2,
          courses: [
            {
              courseId: "course-adv",
              officialCode: "ADV101",
              name: "Materia Recomendada",
              credits: 3,
              type: "REQUIRED",
              progressStatus: "BLOCKED",
              // One hard requirement + one advisory recommendation
              unmetRequirements: ["Lógica de Programación", "[Recomendado] Cálculo I"],
            },
          ],
        },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(advisoryOfferings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(advisorySubscriptions)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(advisoryCurriculum))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Materia Recomendada");

    // Hard requirement — rendered as chip under "Te falta aprobar:"
    expect(screen.getByText("Te falta aprobar:")).toBeInTheDocument();
    const hardChip = screen.getByText("Lógica de Programación");
    expect(hardChip).toBeInTheDocument();
    // Hard chip uses warning-subtle tokens
    expect(hardChip).toHaveClass("bg-warning-subtle");
    expect(hardChip).toHaveClass("text-warning-subtle-foreground");

    // Soft recommendation — rendered under "Recomendado antes:" with prefix STRIPPED
    expect(screen.getByText("Recomendado antes:")).toBeInTheDocument();
    const softChip = screen.getByText("Cálculo I");
    expect(softChip).toBeInTheDocument();
    // Soft chip uses muted tokens
    expect(softChip).toHaveClass("bg-muted");
    expect(softChip).toHaveClass("text-muted-foreground");

    // The raw "[Recomendado]" prefix string must NOT appear in the DOM
    expect(screen.queryByText(/\[Recomendado\]/)).not.toBeInTheDocument();
  });

  it("empty state message is visible when filter produces no matches", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");

    // Type a search that matches nothing
    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "xyzzy-no-match");

    await waitFor(() => {
      expect(screen.getByText(/no hay materias que coincidan/i)).toBeInTheDocument();
    });
  });

  it("empty state disappears when filter is cleared", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");

    const searchInput = screen.getByRole("searchbox");
    await user.type(searchInput, "xyzzy-no-match");

    await waitFor(() => {
      expect(screen.getByText(/no hay materias que coincidan/i)).toBeInTheDocument();
    });

    // Clear the search input
    await user.clear(searchInput);

    await waitFor(() => {
      expect(screen.queryByText(/no hay materias que coincidan/i)).not.toBeInTheDocument();
      expect(screen.getByText("Cálculo I")).toBeInTheDocument();
    });
  });

  it("all-PASSED curriculum: Disponibles and Bloqueadas empty, all rows in Ya cursadas, no crash", async () => {
    const allPassedOfferings = {
      content: [
        {
          id: "off-p1",
          courseId: "course-p1",
          courseName: "Álgebra Lineal",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
        {
          id: "off-p2",
          courseId: "course-p2",
          courseName: "Cálculo Integral",
          programId: PROGRAM_ID,
          periodId: PERIOD_ID,
          status: "FINAL",
          version: 1,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    };

    const allPassedSubscriptions = [
      {
        id: "sub-1",
        programId: PROGRAM_ID,
        programName: "Ing Sistemas",
        planId: "plan-1",
        planName: "Plan 2020",
        referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
        version: 1,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const allPassedCurriculum = {
      subscriptionId: "sub-1",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        {
          recommendedSemester: 1,
          courses: [
            {
              courseId: "course-p1",
              officialCode: "ALG101",
              name: "Álgebra Lineal",
              credits: 4,
              type: "REQUIRED",
              progressStatus: "PASSED",
              unmetRequirements: [],
            },
            {
              courseId: "course-p2",
              officialCode: "MAT102",
              name: "Cálculo Integral",
              credits: 4,
              type: "REQUIRED",
              progressStatus: "PASSED",
              unmetRequirements: [],
            },
          ],
        },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(allPassedOfferings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(allPassedSubscriptions)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(allPassedCurriculum))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    // Ya cursadas bucket has both courses
    const cursadasSection = await screen.findByRole("region", { name: /ya cursadas/i });
    expect(cursadasSection).toBeInTheDocument();
    expect(cursadasSection).toHaveTextContent("Álgebra Lineal");
    expect(cursadasSection).toHaveTextContent("Cálculo Integral");

    // Disponibles and Bloqueadas buckets are absent (no items)
    expect(screen.queryByRole("region", { name: /disponibles/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /bloqueadas/i })).not.toBeInTheDocument();

    // No crash — no error state rendered
    expect(screen.queryByText(/no se pudo cargar/i)).not.toBeInTheDocument();
  });

  // ─── Dynamic semester options ─────────────────────────────────────────────────

  it("semester select includes options from curriculum data (incl. semesters > 10)", async () => {
    const semOfferings = {
      content: [
        { id: "off-s11", courseId: "course-s11", courseName: "Proyecto de Grado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-s12", courseId: "course-s12", courseName: "Opción de Grado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 2, totalPages: 1, size: 20, number: 0,
    };
    const highSemesterSubs = [
      { id: "sub-hs", programId: PROGRAM_ID, programName: "Ingeniería", planId: "p1", planName: "Plan", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, version: 1, createdAt: "2025-01-01T00:00:00Z" },
    ];
    const highSemCurriculum = {
      subscriptionId: "sub-hs",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        { recommendedSemester: 11, courses: [{ courseId: "course-s11", officialCode: "PG1", name: "Proyecto de Grado", credits: 6, type: "DEGREE_WORK", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
        { recommendedSemester: 12, courses: [{ courseId: "course-s12", officialCode: "OG1", name: "Opción de Grado", credits: 6, type: "DEGREE_WORK", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(semOfferings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(highSemesterSubs)),
      http.get("/api/v1/me/subscriptions/sub-hs/curriculum", () => HttpResponse.json(highSemCurriculum))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Proyecto de Grado");

    const semSelect = screen.getByLabelText("Semestre");
    const options = [...semSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Semestre 11");
    expect(options).toContain("Semestre 12");
    // Should NOT have semesters that have no data
    expect(options).not.toContain("Semestre 1");
    expect(options).not.toContain("Semestre 10");
  });

  // ─── Semester options from full malla, not just current offerings ─────────────

  it("semester 12 appears in semester select even when NO offering exists for it this period", async () => {
    // Curriculum has sem 11 (with offering) and sem 12 (NO offering this period).
    // The semester select must include "Semestre 12" because the malla has it.
    const onlySem11Offerings = {
      content: [
        { id: "off-s11b", courseId: "course-s11b", courseName: "Proyecto de Grado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        // NOTE: no offering for course-s12b — it exists only in the malla
      ],
      totalElements: 1, totalPages: 1, size: 20, number: 0,
    };
    const fullMallaSubs = [
      { id: "sub-fm", programId: PROGRAM_ID, programName: "Ingeniería", planId: "p1", planName: "Plan", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, version: 1, createdAt: "2025-01-01T00:00:00Z" },
    ];
    const fullMallaCurriculum = {
      subscriptionId: "sub-fm",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        { recommendedSemester: 11, courses: [{ courseId: "course-s11b", officialCode: "PG1", name: "Proyecto de Grado", credits: 6, type: "DEGREE_WORK", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
        // Semester 12 in the malla but no offering this period
        { recommendedSemester: 12, courses: [{ courseId: "course-s12b", officialCode: "OG1", name: "Opción de Grado", credits: 6, type: "DEGREE_WORK", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(onlySem11Offerings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(fullMallaSubs)),
      http.get("/api/v1/me/subscriptions/sub-fm/curriculum", () => HttpResponse.json(fullMallaCurriculum))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Proyecto de Grado");

    const semSelect = screen.getByLabelText("Semestre");
    const options = [...semSelect.querySelectorAll("option")].map((o) => o.textContent);
    // Semester 11 — has an offering this period
    expect(options).toContain("Semestre 11");
    // Semester 12 — in the malla but NO offering this period; must still appear
    expect(options).toContain("Semestre 12");
  });

  // ─── Program filter integration ───────────────────────────────────────────────

  it("with 2 programs, selecting one hides the other's offerings", async () => {
    const twoProgSubs = [
      { id: "sub-p1", programId: PROGRAM_ID, programName: "Ingeniería de Sistemas", planId: "p1", planName: "Plan", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, version: 1, createdAt: "2025-01-01T00:00:00Z" },
      { id: "sub-p2", programId: PROGRAM_ID_2, programName: "Ingeniería Civil", planId: "p1", planName: "Plan", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, version: 1, createdAt: "2025-01-01T00:00:00Z" },
    ];

    server.use(
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        const programId = url.searchParams.get("programId");
        if (programId === PROGRAM_ID_2) {
          return HttpResponse.json({ content: [{ id: "off-civil", courseId: "course-civil", courseName: "Mecánica de Suelos", programId: PROGRAM_ID_2, periodId: PERIOD_ID, status: "FINAL", version: 1 }], totalElements: 1, totalPages: 1, size: 20, number: 0 });
        }
        return HttpResponse.json({ content: [{ id: "off-sis", courseId: "course-sis", courseName: "Algoritmos", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 }], totalElements: 1, totalPages: 1, size: 20, number: 0 });
      }),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(twoProgSubs)),
      http.get("/api/v1/me/subscriptions/sub-p1/curriculum", () => HttpResponse.json({ subscriptionId: "sub-p1", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, semesters: [{ recommendedSemester: 1, courses: [{ courseId: "course-sis", officialCode: "ALG", name: "Algoritmos", credits: 3, type: "REQUIRED", progressStatus: "AVAILABLE", unmetRequirements: [] }] }] })),
      http.get("/api/v1/me/subscriptions/sub-p2/curriculum", () => HttpResponse.json({ subscriptionId: "sub-p2", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, semesters: [{ recommendedSemester: 1, courses: [{ courseId: "course-civil", officialCode: "MS", name: "Mecánica de Suelos", credits: 3, type: "REQUIRED", progressStatus: "AVAILABLE", unmetRequirements: [] }] }] }))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }, { programId: PROGRAM_ID_2, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByText("Algoritmos")).toBeInTheDocument();
    expect(screen.getByText("Mecánica de Suelos")).toBeInTheDocument();

    // Program select should be visible (2 programs)
    const programSelect = screen.getByLabelText(/carrera/i);
    expect(programSelect).toBeInTheDocument();

    // Select only PROGRAM_ID
    await user.selectOptions(programSelect, PROGRAM_ID);

    await waitFor(() => {
      expect(screen.getByText("Algoritmos")).toBeInTheDocument();
      expect(screen.queryByText("Mecánica de Suelos")).not.toBeInTheDocument();
    });
  });

  it("with 1 program, no program select rendered", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    expect(screen.queryByLabelText(/carrera/i)).not.toBeInTheDocument();
  });

  // ─── Jornada filter ───────────────────────────────────────────────────────────

  it("with DIURNA+NOCTURNA scope, jornada select renders with both options", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }, { programId: PROGRAM_ID, journeyCode: "NOCTURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");

    const jornadaSelect = screen.getByLabelText(/jornada/i);
    expect(jornadaSelect).toBeInTheDocument();
    const options = [...jornadaSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Diurna");
    expect(options).toContain("Nocturna");
  });

  it("with single-journey scope, no jornada select rendered", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    expect(screen.queryByLabelText(/jornada/i)).not.toBeInTheDocument();
  });

  // ─── Clear filters ────────────────────────────────────────────────────────────

  it("applying 2 filters then 'Limpiar filtros' restores the full list", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");
    expect(screen.getByText("Física I")).toBeInTheDocument();

    // Apply search filter
    await user.type(screen.getByRole("searchbox"), "calculo");
    await waitFor(() => expect(screen.queryByText("Física I")).not.toBeInTheDocument());

    // Limpiar filtros button appears
    const clearBtn = screen.getByRole("button", { name: /limpiar filtros/i });
    expect(clearBtn).toBeInTheDocument();

    // Click clear
    await user.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText("Cálculo I")).toBeInTheDocument();
      expect(screen.getByText("Física I")).toBeInTheDocument();
    });

    // Limpiar filtros button disappears after clearing
    expect(screen.queryByRole("button", { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  // ─── Semester subgroups in Disponibles bucket ────────────────────────────────

  it("Disponibles bucket shows semester subheadings when offerings have curriculum data", async () => {
    const semGroupedOfferings = {
      content: [
        { id: "off-g1", courseId: "course-sg1", courseName: "Lógica de Programación", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-g2", courseId: "course-sg2", courseName: "Estructuras de Datos", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 2, totalPages: 1, size: 20, number: 0,
    };

    const subgrpSubs = [{ id: "sub-sg", programId: PROGRAM_ID, programName: "Ing. Sistemas", planId: "p1", planName: "Plan", referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" }, version: 1, createdAt: "2025-01-01T00:00:00Z" }];
    const subgrpCurriculum = {
      subscriptionId: "sub-sg",
      referenceJourney: { id: "j-d", code: "DIURNA", name: "Diurna" },
      semesters: [
        { recommendedSemester: 1, courses: [{ courseId: "course-sg1", officialCode: "LOG1", name: "Lógica de Programación", credits: 3, type: "REQUIRED", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
        { recommendedSemester: 3, courses: [{ courseId: "course-sg2", officialCode: "ED3", name: "Estructuras de Datos", credits: 4, type: "REQUIRED", progressStatus: "AVAILABLE", unmetRequirements: [] }] },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(semGroupedOfferings)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(subgrpSubs)),
      http.get("/api/v1/me/subscriptions/sub-sg/curriculum", () => HttpResponse.json(subgrpCurriculum))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Lógica de Programación");

    const disponiblesSection = screen.getByRole("region", { name: /disponibles/i });
    expect(disponiblesSection).toHaveTextContent("Semestre 1");
    expect(disponiblesSection).toHaveTextContent("Semestre 3");
    expect(disponiblesSection).toHaveTextContent("Lógica de Programación");
    expect(disponiblesSection).toHaveTextContent("Estructuras de Datos");

    // Ya cursadas stays flat (no subheadings)
    expect(screen.queryByRole("region", { name: /ya cursadas/i })).not.toBeInTheDocument();
  });

  // ─── Jornada narrowing — exact journeyCode sent ───────────────────────────────

  it("selecting Nocturna jornada sends exactly NOCTURNA journeyCode and not DIURNA for a program with both", async () => {
    const offeringBothJourneys = {
      content: [
        { id: "off-jn", courseId: "course-jn", courseName: "Cálculo I", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 1, totalPages: 1, size: 20, number: 0,
    };

    const capturedRequests: { journeyCodes: string[] }[] = [];
    server.use(
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        capturedRequests.push({ journeyCodes: url.searchParams.getAll("journeyCode") });
        return HttpResponse.json(offeringBothJourneys);
      }),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        // scope has BOTH journeys for this program
        scopeEntries={[
          { programId: PROGRAM_ID, journeyCode: "DIURNA" },
          { programId: PROGRAM_ID, journeyCode: "NOCTURNA" },
        ]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo I");

    // Select Nocturna in the jornada select
    const jornadaSelect = screen.getByLabelText(/jornada/i);
    await user.selectOptions(jornadaSelect, "NOCTURNA");

    // Wait for the re-fetch triggered by the jornada selection
    await waitFor(() => {
      const lastReq = capturedRequests.at(-1);
      expect(lastReq?.journeyCodes).toContain("NOCTURNA");
      expect(lastReq?.journeyCodes).not.toContain("DIURNA");
    });
  });

  // ─── Group offerings by course ────────────────────────────────────────────────

  it("three offerings with the same courseId collapse to ONE course row", async () => {
    const threeOfferingsOneCourse = {
      content: [
        { id: "off-c1a", courseId: "course-grouped", courseName: "Introducción a la Ingeniería", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-c1b", courseId: "course-grouped", courseName: "Introducción a la Ingeniería", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-c1c", courseId: "course-grouped", courseName: "Introducción a la Ingeniería", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 3, totalPages: 1, size: 20, number: 0,
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(threeOfferingsOneCourse)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Introducción a la Ingeniería");

    // Exactly ONE row/button for this course name
    const buttons = screen.getAllByRole("button", { name: /introducción a la ingeniería/i });
    expect(buttons).toHaveLength(1);
  });

  it("expanding a grouped course row shows schedule options from ALL its offerings combined, filtered by journey", async () => {
    const groupedOfferings = {
      content: [
        { id: "off-g1", courseId: "course-multi", courseName: "Cálculo Avanzado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-g2", courseId: "course-multi", courseName: "Cálculo Avanzado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 2, totalPages: 1, size: 20, number: 0,
    };

    const detailG1 = {
      id: "off-g1", courseId: "course-multi", courseName: "Cálculo Avanzado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1,
      scheduleOptions: [
        { id: "opt-g1a", offeringId: "off-g1", label: "Grupo A Diurno", journeyCode: "DIURNA", weeklyHours: 4, sessions: [], version: 1 },
        { id: "opt-g1b", offeringId: "off-g1", label: "Grupo Nocturno (filtrado)", journeyCode: "NOCTURNA", weeklyHours: 4, sessions: [], version: 1 },
      ],
    };

    const detailG2 = {
      id: "off-g2", courseId: "course-multi", courseName: "Cálculo Avanzado", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1,
      scheduleOptions: [
        { id: "opt-g2a", offeringId: "off-g2", label: "Grupo B Diurno", journeyCode: "DIURNA", weeklyHours: 4, sessions: [], version: 1 },
      ],
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(groupedOfferings)),
      http.get("/api/v1/offerings/off-g1", () => HttpResponse.json(detailG1)),
      http.get("/api/v1/offerings/off-g2", () => HttpResponse.json(detailG2)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo Avanzado");
    await user.click(screen.getByRole("button", { name: /cálculo avanzado/i }));

    await waitFor(() => {
      expect(screen.getByText("Grupo A Diurno")).toBeInTheDocument();
      expect(screen.getByText("Grupo B Diurno")).toBeInTheDocument();
      expect(screen.queryByText("Grupo Nocturno (filtrado)")).not.toBeInTheDocument();
    });
  });

  it("two different courses render as two separate rows", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    expect(await screen.findByRole("button", { name: /cálculo i/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /física i/i })).toBeInTheDocument();
  });

  it("result count shows course count not raw offering count (3 offerings → 1 course → '1 de 1')", async () => {
    const threeOfferingsOneCourse = {
      content: [
        { id: "off-c1a", courseId: "course-grouped", courseName: "Introducción a la Ingeniería", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-c1b", courseId: "course-grouped", courseName: "Introducción a la Ingeniería", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
        { id: "off-c1c", courseId: "course-grouped", courseName: "Introducción a la Ingeniería", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 3, totalPages: 1, size: 20, number: 0,
    };

    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(threeOfferingsOneCourse)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    render(
      <OfferingBrowser simulationId={SIMULATION_ID} periodId={PERIOD_ID} scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]} />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Introducción a la Ingeniería");
    expect(screen.getByText(/1 de 1/)).toBeInTheDocument();
  });

  // ─── Remove "Requisitos pendientes" badge, keep BlockedReasons chips ─────────

  it("#14: blocked course has NO 'Requisitos pendientes' badge but DOES show 'Te falta aprobar:' chips", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(MIXED_OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(CURRICULUM_FIXTURE))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Física Bloqueada");

    // The "Requisitos pendientes" badge must NOT appear anywhere in the DOM
    expect(screen.queryByText("Requisitos pendientes")).not.toBeInTheDocument();

    // But the BlockedReasons component's "Te falta aprobar:" label and course chip MUST still show
    expect(screen.getByText("Te falta aprobar:")).toBeInTheDocument();
    // At least one element with "Cálculo I" text exists (the prerequisite chip)
    expect(screen.getAllByText("Cálculo I").length).toBeGreaterThan(0);
  });

  it("#14: passed course still renders 'Ya cursada' badge", async () => {
    server.use(
      http.get("/api/v1/offerings", () => HttpResponse.json(MIXED_OFFERINGS_FIXTURE)),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json(SUBSCRIPTIONS_FIXTURE)),
      http.get("/api/v1/me/subscriptions/sub-1/curriculum", () => HttpResponse.json(CURRICULUM_FIXTURE))
    );

    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[{ programId: PROGRAM_ID, journeyCode: "DIURNA" }]}
      />,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Cálculo Aprobada");

    // The "Ya cursada" badge must still appear
    expect(screen.getByText("Ya cursada")).toBeInTheDocument();
  });

  it("fail-open fix: prog-B with DIURNA-only scope is not fetched when Nocturna selected", async () => {
    // prog-A has DIURNA+NOCTURNA; prog-B has DIURNA only.
    // When jornada="NOCTURNA" is selected, prog-B's journeyCodes becomes [].
    // The enabled guard (journeyCodes.length > 0) must skip prog-B entirely.
    // Without the fix, prog-B would send journeyCode:undefined → backend returns all → prog-B offerings shown.

    const progAOfferings = {
      content: [
        { id: "off-a", courseId: "course-a", courseName: "Materia A Nocturna", programId: PROGRAM_ID, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 1, totalPages: 1, size: 20, number: 0,
    };
    const progBOfferings = {
      content: [
        { id: "off-b", courseId: "course-b", courseName: "Materia B Solo Diurna", programId: PROGRAM_ID_2, periodId: PERIOD_ID, status: "FINAL", version: 1 },
      ],
      totalElements: 1, totalPages: 1, size: 20, number: 0,
    };

    const progBFetchedWith: string[][] = [];
    server.use(
      http.get("/api/v1/offerings", ({ request }) => {
        const url = new URL(request.url);
        const programId = url.searchParams.get("programId");
        const journeyCodes = url.searchParams.getAll("journeyCode");
        if (programId === PROGRAM_ID_2) {
          progBFetchedWith.push(journeyCodes);
          return HttpResponse.json(progBOfferings);
        }
        return HttpResponse.json(progAOfferings);
      }),
      http.get("/api/v1/me/subscriptions", () => HttpResponse.json([]))
    );

    const user = userEvent.setup();
    render(
      <OfferingBrowser
        simulationId={SIMULATION_ID}
        periodId={PERIOD_ID}
        scopeEntries={[
          { programId: PROGRAM_ID, journeyCode: "DIURNA" },
          { programId: PROGRAM_ID, journeyCode: "NOCTURNA" },
          { programId: PROGRAM_ID_2, journeyCode: "DIURNA" }, // DIURNA only
        ]}
      />,
      { wrapper: createWrapper() }
    );

    // Initially both programs' offerings are visible (no jornada filter)
    expect(await screen.findByText("Materia A Nocturna")).toBeInTheDocument();
    expect(await screen.findByText("Materia B Solo Diurna")).toBeInTheDocument();

    // Select Nocturna jornada
    const jornadaSelect = screen.getByLabelText(/jornada/i);
    await user.selectOptions(jornadaSelect, "NOCTURNA");

    // prog-B (DIURNA only) should disappear — its query is skipped (enabled=false)
    await waitFor(() => {
      expect(screen.queryByText("Materia B Solo Diurna")).not.toBeInTheDocument();
    });

    // Additionally: prog-B must not have been fetched with an empty/undefined journeyCode after the jornada change.
    // Any fetch to prog-B after the initial load (with NOCTURNA selected) would be the bug.
    // The enabled guard prevents it — progBFetchedWith should only contain the initial fetch (before NOCTURNA was selected).
    // After selecting NOCTURNA, no new request to prog-B should have been made with an empty journeyCode.
    const progBFetchesAfterFilter = progBFetchedWith.filter((codes) => codes.length === 0);
    expect(progBFetchesAfterFilter).toHaveLength(0);
  });
});
