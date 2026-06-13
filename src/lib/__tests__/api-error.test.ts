/**
 * Unit tests for getApiErrorMessage — api-error.ts
 *
 * Contract:
 * - Known error code → its Spanish message
 * - Unknown code + known status → status-based Spanish message
 * - No response → fallback
 * - English .detail field is NEVER returned
 */

import { describe, it, expect } from "vitest";
import { getApiErrorMessage } from "@/lib/api-error";

// ---------------------------------------------------------------------------
// Helpers — build minimal fake AxiosError shapes
// ---------------------------------------------------------------------------

function makeAxiosError(options: {
  status?: number;
  code?: string;
  detail?: string;
}): unknown {
  return {
    response: {
      status: options.status,
      data: {
        detail: options.detail,
        code: options.code,
      },
    },
  };
}

function makeNoResponseError(): unknown {
  return { response: undefined };
}

function makeNonAxiosError(): unknown {
  return new Error("network failure");
}

// ---------------------------------------------------------------------------
// Suite: known error codes
// ---------------------------------------------------------------------------

describe("getApiErrorMessage — known error codes", () => {
  it("SUBSCRIPTION_PROGRAM_LIMIT_EXCEEDED returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 409,
      code: "SUBSCRIPTION_PROGRAM_LIMIT_EXCEEDED",
      detail: "Student already has 2 active subscriptions",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe(
      "Llegaste al máximo de 2 carreras. Dá de baja una carrera para suscribirte a otra."
    );
    expect(msg).not.toContain("Student");
  });

  it("SUBSCRIPTION_DUPLICATE_JORNADA returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 409,
      code: "SUBSCRIPTION_DUPLICATE_JORNADA",
      detail: "Duplicate journey for same program",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Ya estás suscrito a esta carrera en esa jornada.");
    expect(msg).not.toContain("Duplicate");
  });

  it("SUBSCRIPTION_LAST_ACTIVE returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 409,
      code: "SUBSCRIPTION_LAST_ACTIVE",
      detail: "Cannot delete last active subscription",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Tenés que conservar al menos una suscripción activa.");
    expect(msg).not.toContain("Cannot delete");
  });

  it("SUBSCRIPTION_PLAN_INACTIVE returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 422,
      code: "SUBSCRIPTION_PLAN_INACTIVE",
      detail: "Study plan is not active",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe(
      "El plan de estudios seleccionado no está activo. Elegí otro plan."
    );
    expect(msg).not.toContain("Study plan");
  });

  it("SUBSCRIPTION_HISTORY_IMPACT_NOT_ACKNOWLEDGED returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 409,
      code: "SUBSCRIPTION_HISTORY_IMPACT_NOT_ACKNOWLEDGED",
      detail: "Impact not acknowledged",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Confirmá el impacto en tu historial para continuar.");
    expect(msg).not.toContain("Impact not acknowledged");
  });

  it("IDEMPOTENCY_KEY_CONFLICT returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 409,
      code: "IDEMPOTENCY_KEY_CONFLICT",
      detail: "Idempotency key already used",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe(
      "Hubo un conflicto al procesar tu solicitud. Recargá la página e intentá de nuevo."
    );
    expect(msg).not.toContain("Idempotency");
  });

  it("OPTIMISTIC_LOCK_CONFLICT returns the correct Spanish message", () => {
    const error = makeAxiosError({
      status: 409,
      code: "OPTIMISTIC_LOCK_CONFLICT",
      detail: "Optimistic lock failure: entity was modified",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe(
      "Los datos cambiaron mientras editabas. Recargá la página e intentá de nuevo."
    );
    expect(msg).not.toContain("Optimistic lock");
  });
});

// ---------------------------------------------------------------------------
// Suite: unknown code + known status → status message
// ---------------------------------------------------------------------------

describe("getApiErrorMessage — unknown code, known status", () => {
  it("status 400 with unknown code returns status-based message", () => {
    const error = makeAxiosError({
      status: 400,
      code: "UNKNOWN_CODE",
      detail: "Bad request details in English",
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Revisá los datos e intentá nuevamente.");
    expect(msg).not.toContain("Bad request");
  });

  it("status 401 with no code returns status-based message", () => {
    const error = makeAxiosError({ status: 401, detail: "Unauthorized" });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Tu sesión expiró. Iniciá sesión de nuevo.");
    expect(msg).not.toContain("Unauthorized");
  });

  it("status 403 with no code returns status-based message", () => {
    const error = makeAxiosError({ status: 403, detail: "Forbidden" });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("No tenés permisos para realizar esta acción.");
  });

  it("status 404 with no code returns status-based message", () => {
    const error = makeAxiosError({ status: 404, detail: "Not found" });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("No encontramos lo que buscabas.");
  });

  it("status 409 with no code returns status-based message", () => {
    const error = makeAxiosError({ status: 409, detail: "Conflict" });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Hay un conflicto con el estado actual. Recargá e intentá de nuevo.");
  });

  it("status 422 with no code returns status-based message", () => {
    const error = makeAxiosError({ status: 422, detail: "Validation failed" });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Revisá los datos del formulario e intentá nuevamente.");
    expect(msg).not.toContain("Validation failed");
  });

  it("status 500 with no code returns server error message", () => {
    const error = makeAxiosError({ status: 500, detail: "Internal server error" });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Ocurrió un error en el servidor. Intentá más tarde.");
  });

  it("status 502 with no code returns server error message", () => {
    const error = makeAxiosError({ status: 502 });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Ocurrió un error en el servidor. Intentá más tarde.");
  });

  it("status 503 with no code returns server error message", () => {
    const error = makeAxiosError({ status: 503 });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Ocurrió un error en el servidor. Intentá más tarde.");
  });

  it("status 504 with no code returns server error message", () => {
    const error = makeAxiosError({ status: 504 });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).toBe("Ocurrió un error en el servidor. Intentá más tarde.");
  });
});

// ---------------------------------------------------------------------------
// Suite: no response → fallback
// ---------------------------------------------------------------------------

describe("getApiErrorMessage — no response", () => {
  it("returns fallback when error has no response", () => {
    const error = makeNoResponseError();

    const msg = getApiErrorMessage(error, "Mi mensaje de fallback");

    expect(msg).toBe("Mi mensaje de fallback");
  });

  it("returns fallback for a plain Error (network failure)", () => {
    const error = makeNonAxiosError();

    const msg = getApiErrorMessage(error, "Error de red");

    expect(msg).toBe("Error de red");
  });

  it("returns fallback for null", () => {
    const msg = getApiErrorMessage(null, "fallback para null");

    expect(msg).toBe("fallback para null");
  });

  it("returns fallback for undefined", () => {
    const msg = getApiErrorMessage(undefined, "fallback para undefined");

    expect(msg).toBe("fallback para undefined");
  });
});

// ---------------------------------------------------------------------------
// Suite: English detail is NEVER returned
// ---------------------------------------------------------------------------

describe("getApiErrorMessage — English detail is never surfaced", () => {
  it("does not return English detail string for known code", () => {
    const englishDetail = "Student already has 2 active subscriptions";
    const error = makeAxiosError({
      status: 409,
      code: "SUBSCRIPTION_PROGRAM_LIMIT_EXCEEDED",
      detail: englishDetail,
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).not.toBe(englishDetail);
    expect(msg).not.toContain("Student");
  });

  it("does not return English detail string for unknown code + known status", () => {
    const englishDetail = "Validation failed for field 'email'";
    const error = makeAxiosError({
      status: 422,
      code: "SOME_UNKNOWN_VALIDATION_CODE",
      detail: englishDetail,
    });

    const msg = getApiErrorMessage(error, "fallback");

    expect(msg).not.toBe(englishDetail);
    expect(msg).not.toContain("Validation failed");
  });

  it("does not return English detail for unknown code + unknown status", () => {
    const englishDetail = "Unexpected backend error";
    const error = makeAxiosError({
      status: 418,
      code: "I_AM_A_TEAPOT",
      detail: englishDetail,
    });

    const msg = getApiErrorMessage(error, "fallback");

    // Should fall through to fallback, not return detail
    expect(msg).toBe("fallback");
    expect(msg).not.toContain("Unexpected backend error");
  });
});
