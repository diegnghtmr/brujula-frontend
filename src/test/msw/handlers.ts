import { http, HttpResponse } from "msw";

/**
 * MSW request handlers for tests.
 * These mock the generated API endpoints so tests don't need a running backend.
 * Slice-2 handlers added for: registration, email verification, password recovery,
 * admin allowed-email-domains, admin staff.
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
];
