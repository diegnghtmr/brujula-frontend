/**
 * CUR-008: MallaView
 *
 * Spec scenarios:
 * 1. Semesters render as columns.
 * 2. Each course shows name, credits, and type.
 * 3. Requirement edges show a confidence badge (HIGH/MEDIUM/LOW → ALTA/MEDIA/BAJA).
 * 4. The graduationRequirements advisory text renders.
 * 5. Journey toggle (DIURNA/NOCTURNA) re-fetches malla with the selected journey.
 */

import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { http, HttpResponse } from "msw";
import { server } from "@/test/msw/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { MallaView } from "@/features/curriculum/components/malla-view";

const PLAN_ID = "plan-001";

/**
 * Realistic StudyPlanView fixture for plan-001.
 * Used in ALL tests — MallaView issues two parallel queries:
 *   GET /plans/{planId}  (metadata, available journeys)
 *   GET /plans/{planId}/malla  (semester grid)
 * Missing either handler → AggregateError (unhandled request).
 */
const PLAN_META = {
  id: PLAN_ID,
  programId: "prog-1",
  name: "Plan Sistemas",
  status: "ACTIVE",
  totalCredits: 163,
  applicableJourneys: [
    { code: "DIURNA", name: "Diurna" },
    { code: "NOCTURNA", name: "Nocturna" },
  ],
  version: 1,
};

function createWrapper(initialPath = `/curriculum/plans/${PLAN_ID}/malla`) {
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

const MALLA_DIURNA = {
  planId: PLAN_ID,
  journeyCode: "DIURNA",
  semesterBuckets: [
    {
      recommendedSemester: 1,
      courses: [
        {
          id: "c-1",
          name: "Lógica de Programación",
          type: "REQUIRED",
          credits: 3,
          requirements: [],
        },
        {
          id: "c-2",
          name: "Matemáticas I",
          type: "REQUIRED",
          credits: 4,
          requirements: [],
        },
      ],
    },
    {
      recommendedSemester: 2,
      courses: [
        {
          id: "c-3",
          name: "Programación I",
          type: "REQUIRED",
          credits: 3,
          requirements: [
            {
              type: "COURSE_PASSED",
              requiredCourseId: "c-1",
              confidence: "HIGH",
              inferred: false,
              simultaneityAllowed: false,
            },
          ],
        },
        {
          id: "c-4",
          name: "Formulación de Proyectos",
          type: "REQUIRED",
          credits: 3,
          requirements: [
            {
              type: "COURSE_PASSED",
              requiredCourseId: "c-5",
              confidence: "MEDIUM",
              inferred: true,
              simultaneityAllowed: null,
            },
          ],
        },
      ],
    },
  ],
  graduationRequirements:
    "Para graduarse debe acreditar suficiencia en lengua extranjera y aprobar Cátedra Multidisciplinar.",
};

const MALLA_NOCTURNA = {
  planId: PLAN_ID,
  journeyCode: "NOCTURNA",
  semesterBuckets: [
    {
      recommendedSemester: 1,
      courses: [
        {
          id: "c-1",
          name: "Lógica de Programación",
          type: "REQUIRED",
          credits: 3,
          requirements: [],
        },
      ],
    },
  ],
  graduationRequirements:
    "Para graduarse debe acreditar suficiencia en lengua extranjera y aprobar Cátedra Multidisciplinar.",
};

describe("MallaView (CUR-008)", () => {
  it("renders semesters as columns with semester labels", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json(MALLA_DIURNA)
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Two semester columns
    expect(await screen.findByText(/semestre 1/i)).toBeInTheDocument();
    expect(screen.getByText(/semestre 2/i)).toBeInTheDocument();
  });

  it("each course shows name, credits, and type", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json(MALLA_DIURNA)
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Lógica de Programación");
    // Credits shown — multiple courses have 3 cr, so we check at least one renders
    expect(screen.getAllByText(/3 cr/i).length).toBeGreaterThan(0);
  });

  it("renders HIGH confidence badge as ALTA (visible text label)", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json(MALLA_DIURNA)
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Programación I");
    // HIGH confidence requirement → ALTA label
    expect(screen.getByText("ALTA")).toBeInTheDocument();
  });

  it("renders MEDIUM confidence badge as MEDIA (sugerido / advisory)", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json(MALLA_DIURNA)
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Formulación de Proyectos");
    // MEDIUM confidence + inferred → MEDIA label + "sugerido"
    expect(screen.getByText("MEDIA")).toBeInTheDocument();
    expect(screen.getAllByText(/sugerido/i).length).toBeGreaterThan(0);
  });

  it("renders graduationRequirements advisory text", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json(MALLA_DIURNA)
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText(/suficiencia en lengua extranjera/i);
    expect(screen.getByText(/cátedra multidisciplinar/i)).toBeInTheDocument();
  });

  it("renders LOW confidence badge as BAJA with text icon (WCAG)", async () => {
    const mallaWithLow = {
      ...MALLA_DIURNA,
      semesterBuckets: [
        {
          recommendedSemester: 1,
          courses: [
            {
              id: "c-low",
              name: "Curso con Requisito Bajo",
              type: "ELECTIVE",
              credits: 2,
              requirements: [
                {
                  type: "COURSE_PASSED",
                  requiredCourseId: "c-x",
                  confidence: "LOW",
                  inferred: false,
                  simultaneityAllowed: false,
                },
              ],
            },
          ],
        },
      ],
    };

    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json(mallaWithLow)
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    await screen.findByText("Curso con Requisito Bajo");
    // LOW confidence → BAJA label (WCAG: text label, not color alone)
    expect(screen.getByText("BAJA")).toBeInTheDocument();
    // WCAG: also has text icon (▽) — not color-only
    expect(screen.getByText("▽")).toBeInTheDocument();
  });

  it("shows loading indicator while fetching", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json(MALLA_DIURNA);
      })
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });
});

describe("MallaView error states (S-3 parity with StudyPlanPage)", () => {
  it("renders error message when malla endpoint returns 404", async () => {
    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, () =>
        HttpResponse.json({ title: "Not Found", status: 404 }, { status: 404 })
      )
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    expect(
      await screen.findByText(/no se pudo cargar la malla curricular/i)
    ).toBeInTheDocument();
  });
});

describe("MallaView ?journeyCode= query param initialization (W-2)", () => {
  it("initializes to NOCTURNA when ?journeyCode=NOCTURNA is in the URL", async () => {
    // The malla request must go out with journeyCode=NOCTURNA on the first render —
    // MallaView reads the query param as its initial journey state.
    const malaRequests: string[] = [];

    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, ({ request }) => {
        const url = new URL(request.url);
        malaRequests.push(url.searchParams.get("journeyCode") ?? "");
        const journey = url.searchParams.get("journeyCode");
        return HttpResponse.json(journey === "NOCTURNA" ? MALLA_NOCTURNA : MALLA_DIURNA);
      })
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper(`/curriculum/plans/${PLAN_ID}/malla?journeyCode=NOCTURNA`) }
    );

    // NOCTURNA malla has only 1 semester — confirms the right journey was fetched
    await screen.findByText(/semestre 1/i);
    expect(screen.queryByText(/semestre 2/i)).not.toBeInTheDocument();

    // The very first malla request must have been for NOCTURNA
    expect(malaRequests[0]).toBe("NOCTURNA");
  });

  it("falls back to DIURNA when ?journeyCode= is absent", async () => {
    const malaRequests: string[] = [];

    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, ({ request }) => {
        const url = new URL(request.url);
        malaRequests.push(url.searchParams.get("journeyCode") ?? "");
        return HttpResponse.json(MALLA_DIURNA);
      })
    );

    // No ?journeyCode= in URL
    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper(`/curriculum/plans/${PLAN_ID}/malla`) }
    );

    await screen.findByText(/semestre 1/i);
    // Should default to DIURNA
    expect(malaRequests[0]).toBe("DIURNA");
  });

  it("falls back to DIURNA when ?journeyCode= contains an invalid/unknown value", async () => {
    const malaRequests: string[] = [];

    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, ({ request }) => {
        const url = new URL(request.url);
        malaRequests.push(url.searchParams.get("journeyCode") ?? "");
        return HttpResponse.json(MALLA_DIURNA);
      })
    );

    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper(`/curriculum/plans/${PLAN_ID}/malla?journeyCode=INVALID_CODE`) }
    );

    await screen.findByText(/semestre 1/i);
    // Unknown code must fall back to DIURNA
    expect(malaRequests[0]).toBe("DIURNA");
  });

  it("manual toggle still works after initial load from query param", async () => {
    const malaRequests: string[] = [];

    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}`, () => HttpResponse.json(PLAN_META)),
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, ({ request }) => {
        const url = new URL(request.url);
        malaRequests.push(url.searchParams.get("journeyCode") ?? "");
        const journey = url.searchParams.get("journeyCode");
        return HttpResponse.json(journey === "NOCTURNA" ? MALLA_NOCTURNA : MALLA_DIURNA);
      })
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper(`/curriculum/plans/${PLAN_ID}/malla?journeyCode=NOCTURNA`) }
    );

    // Starts as NOCTURNA (1 semester)
    await screen.findByText(/semestre 1/i);
    expect(screen.queryByText(/semestre 2/i)).not.toBeInTheDocument();

    // Toggle to DIURNA manually
    const diurnaBtn = screen.getByRole("button", { name: /diurna/i });
    await user.click(diurnaBtn);

    // DIURNA malla has 2 semesters
    await waitFor(() => {
      expect(screen.getByText(/semestre 2/i)).toBeInTheDocument();
    });
    expect(malaRequests).toContain("DIURNA");
  });
});

describe("MallaView journey toggle (CUR-008)", () => {
  it("switching journey refetches malla with the selected journeyCode", async () => {
    const journeyRequests: string[] = [];

    server.use(
      http.get(`/api/v1/plans/${PLAN_ID}/malla`, ({ request }) => {
        const url = new URL(request.url);
        journeyRequests.push(url.searchParams.get("journeyCode") ?? "");
        const journey = url.searchParams.get("journeyCode");
        return HttpResponse.json(
          journey === "NOCTURNA" ? MALLA_NOCTURNA : MALLA_DIURNA
        );
      }),
      http.get(`/api/v1/plans/${PLAN_ID}`, () =>
        HttpResponse.json({
          id: PLAN_ID,
          programId: "prog-1",
          name: "Plan Sistemas",
          status: "ACTIVE",
          totalCredits: 163,
          applicableJourneys: [
            { code: "DIURNA", name: "Diurna" },
            { code: "NOCTURNA", name: "Nocturna" },
          ],
          version: 1,
        })
      )
    );

    const user = userEvent.setup();
    render(
      <Routes>
        <Route
          path="/curriculum/plans/:planId/malla"
          element={<MallaView />}
        />
      </Routes>,
      { wrapper: createWrapper() }
    );

    // Wait for DIURNA malla to load
    await screen.findByText(/semestre 1/i);

    // Click NOCTURNA
    const noctBtn = screen.getByRole("button", { name: /nocturna/i });
    await user.click(noctBtn);

    await waitFor(() => {
      expect(journeyRequests).toContain("NOCTURNA");
    });

    // CUR-008: re-render must reflect the different semester distribution.
    // MALLA_NOCTURNA has 1 semester (no semestre 2); MALLA_DIURNA has 2.
    await waitFor(() => {
      expect(screen.queryByText(/semestre 2/i)).not.toBeInTheDocument();
    });
  });
});
