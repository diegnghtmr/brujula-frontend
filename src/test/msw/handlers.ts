import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for tests.
 * These mock the generated API endpoints so tests don't need a running backend.
 * Handlers cover: registration, email verification, password recovery,
 * admin allowed-email-domains, admin staff, simulation CRUD, offerings, periods.
 */
export const handlers = [
  // Health endpoint smoke mock
  http.get("/api/actuator/health", () => {
    return HttpResponse.json({ status: "UP" });
  }),

  // --- Auth: Registration ---
  http.post("/api/v1/auth/registration", () => {
    return HttpResponse.json(
      {
        userId: "550e8400-e29b-41d4-a716-446655440000",
        status: "PENDING_VERIFICATION",
        message: "Te enviamos un correo de verificación. Revisa tu bandeja para activar la cuenta.",
      },
      { status: 202 }
    );
  }),

  // --- Auth: Email verification resend ---
  http.post("/api/v1/auth/email-verifications/resend", () => {
    return new HttpResponse(null, { status: 202 });
  }),

  // --- Auth: Password recovery ---
  http.post("/api/v1/auth/password-recovery", () => {
    return new HttpResponse(null, { status: 202 });
  }),

  // --- Admin: Allowed email domains ---
  http.get("/api/v1/admin/allowed-email-domains", () => {
    return HttpResponse.json([
      { id: "dom-1", domain: "uniquindio.edu.co" },
      { id: "dom-2", domain: "uq.edu.co" },
    ]);
  }),

  http.post("/api/v1/admin/allowed-email-domains", () => {
    return HttpResponse.json(
      { id: "dom-3", domain: "otrauniversidad.edu.co" },
      { status: 201 }
    );
  }),

  http.delete("/api/v1/admin/allowed-email-domains/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // --- Admin: Staff ---
  http.get("/api/v1/admin/staff", () => {
    return HttpResponse.json({
      content: [
        {
          id: "staff-1",
          fullName: "Alice Garcia",
          email: "alice@uniquindio.edu.co",
          status: "ACTIVE",
          version: 1,
        },
        {
          id: "staff-2",
          fullName: "Bob Torres",
          email: "bob@uniquindio.edu.co",
          status: "ACTIVE",
          version: 1,
        },
      ],
      totalElements: 2,
      totalPages: 1,
      size: 20,
      number: 0,
    });
  }),

  http.post("/api/v1/admin/staff", () => {
    return HttpResponse.json(
      {
        id: "staff-3",
        fullName: "Carol Ruiz",
        email: "carol@uniquindio.edu.co",
        status: "ACTIVE",
        version: 1,
      },
      { status: 201 }
    );
  }),

  http.patch("/api/v1/admin/staff/:staffId", () => {
    return HttpResponse.json({
      id: "staff-1",
      fullName: "Alice Garcia",
      email: "alice@uniquindio.edu.co",
      status: "INACTIVE",
      version: 2,
    });
  }),

  // ---- Simulation CRUD + Offerings + Periods ----

  // GET /me/subscriptions — student program subscriptions (global fallback; inline server.use() overrides take precedence)
  http.get("/api/v1/me/subscriptions", () => {
    return HttpResponse.json([]);
  }),

  // GET /periods — academic periods list
  http.get("/api/v1/periods", () => {
    return HttpResponse.json([
      {
        id: "550e8400-e29b-41d4-a716-aaa000000001",
        name: "2026-2",
        status: "ACTIVE",
        version: 0,
      },
    ]);
  }),

  // GET /offerings — published offerings (periodId required)
  http.get("/api/v1/offerings", () => {
    return HttpResponse.json({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    });
  }),

  // GET /offerings/:offeringId — offering detail with schedule options
  http.get("/api/v1/offerings/:offeringId", () => {
    return HttpResponse.json({
      id: "off-default",
      courseId: "course-default",
      courseName: "Curso de Prueba",
      programId: "prog-default",
      periodId: "550e8400-e29b-41d4-a716-aaa000000001",
      status: "PRELIMINARY",
      version: 1,
      scheduleOptions: [],
    });
  }),

  // GET /me/simulations — list simulations
  http.get("/api/v1/me/simulations", () => {
    return HttpResponse.json({
      content: [],
      totalElements: 0,
      totalPages: 0,
      size: 20,
      number: 0,
    });
  }),

  // POST /me/simulations — create simulation
  http.post("/api/v1/me/simulations", () => {
    return HttpResponse.json(
      {
        id: "sim-default-1",
        name: "Simulación Default",
        periodId: "550e8400-e29b-41d4-a716-aaa000000001",
        periodName: "2026-2",
        programIds: ["prog-default"],
        status: "CURRENT",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        version: 0,
      },
      { status: 201 }
    );
  }),

  // GET /me/simulations/:simulationId — simulation detail
  http.get("/api/v1/me/simulations/:simulationId", () => {
    return HttpResponse.json({
      id: "sim-default-1",
      name: "Simulación Default",
      periodId: "550e8400-e29b-41d4-a716-aaa000000001",
      periodName: "2026-2",
      programIds: ["prog-default"],
      status: "CURRENT",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 1,
      selections: [],
      creditSummary: [],
      weeklySchedule: [],
      totalWeeklyHours: 0,
      validation: { blocking: [], warnings: [] },
    });
  }),

  // PATCH /me/simulations/:simulationId — update simulation
  http.patch("/api/v1/me/simulations/:simulationId", async ({ request }) => {
    const body = await request.json() as { name?: string; version?: number };
    return HttpResponse.json({
      id: "sim-default-1",
      name: body.name ?? "Simulación Default",
      periodId: "550e8400-e29b-41d4-a716-aaa000000001",
      periodName: "2026-2",
      programIds: ["prog-default"],
      status: "CURRENT",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: (body.version ?? 0) + 1,
    });
  }),

  // DELETE /me/simulations/:simulationId — delete simulation
  http.delete("/api/v1/me/simulations/:simulationId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /me/simulations/:simulationId/duplications — duplicate
  http.post("/api/v1/me/simulations/:simulationId/duplications", () => {
    return HttpResponse.json(
      {
        id: "sim-dup-1",
        name: "Copia de Simulación",
        periodId: "550e8400-e29b-41d4-a716-aaa000000001",
        periodName: "2026-2",
        programIds: ["prog-default"],
        status: "CURRENT",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        version: 0,
      },
      { status: 201 }
    );
  }),

  // GET /me/simulations/:simulationId/selections — list selections
  http.get("/api/v1/me/simulations/:simulationId/selections", () => {
    return HttpResponse.json([]);
  }),

  // POST /me/simulations/:simulationId/selections — add selection
  http.post("/api/v1/me/simulations/:simulationId/selections", () => {
    return HttpResponse.json(
      {
        id: "sel-default-1",
        offeringId: "off-default",
        scheduleOptionId: "opt-default",
        courseId: "course-default",
        courseName: "Curso de Prueba",
        programId: "prog-default",
        credits: 3,
        journeyCode: "DIURNA",
        offeringStatus: "PRELIMINARY",
        selectedOfferingVersion: 1,
        sessions: [],
        warnings: [],
      },
      { status: 201 }
    );
  }),

  // DELETE /me/simulations/:simulationId/selections/:selectionId
  http.delete("/api/v1/me/simulations/:simulationId/selections/:selectionId", () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /me/simulations/:simulationId/review
  http.post("/api/v1/me/simulations/:simulationId/review", () => {
    return HttpResponse.json({
      id: "sim-default-1",
      name: "Simulación Default",
      periodId: "550e8400-e29b-41d4-a716-aaa000000001",
      periodName: "2026-2",
      programIds: ["prog-default"],
      status: "CURRENT",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      version: 2,
      selections: [],
      creditSummary: [],
      weeklySchedule: [],
      totalWeeklyHours: 0,
      validation: { blocking: [], warnings: [] },
    });
  }),
];
