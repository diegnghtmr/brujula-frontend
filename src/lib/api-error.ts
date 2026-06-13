/**
 * api-error.ts — Centralized API error message mapper.
 *
 * Converts AxiosError<ProblemDetail> responses into user-facing Spanish (Rioplatense voseo) messages.
 * NEVER surfaces raw backend English detail strings to the UI.
 */

import type { AxiosError } from "@/api/client";

interface ProblemDetail {
  detail?: string;
  code?: string;
  status?: number;
}

// CODE → Spanish message mapping (Rioplatense voseo)
const CODE_MESSAGES: Record<string, string> = {
  SUBSCRIPTION_PROGRAM_LIMIT_EXCEEDED:
    "Llegaste al máximo de 2 carreras. Dá de baja una carrera para suscribirte a otra.",
  SUBSCRIPTION_DUPLICATE_JORNADA:
    "Ya estás suscrito a esta carrera en esa jornada.",
  SUBSCRIPTION_LAST_ACTIVE:
    "Tenés que conservar al menos una suscripción activa.",
  SUBSCRIPTION_PLAN_INACTIVE:
    "El plan de estudios seleccionado no está activo. Elegí otro plan.",
  SUBSCRIPTION_HISTORY_IMPACT_NOT_ACKNOWLEDGED:
    "Confirmá el impacto en tu historial para continuar.",
  IDEMPOTENCY_KEY_CONFLICT:
    "Hubo un conflicto al procesar tu solicitud. Recargá la página e intentá de nuevo.",
  OPTIMISTIC_LOCK_CONFLICT:
    "Los datos cambiaron mientras editabas. Recargá la página e intentá de nuevo.",
  SIMULATION_SCHEDULE_CLASH:
    "La simulación tiene conflictos de horario activos. Revisá las opciones seleccionadas.",
  DOMAIN_NOT_ALLOWED:
    "El dominio del correo no está habilitado para registrarse.",
  EMAIL_ALREADY_REGISTERED:
    "El correo ya está registrado. Intentá iniciar sesión.",
};

// HTTP status → Spanish message mapping (Rioplatense voseo)
const STATUS_MESSAGES: Record<number, string> = {
  400: "Revisá los datos e intentá nuevamente.",
  401: "Tu sesión expiró. Iniciá sesión de nuevo.",
  403: "No tenés permisos para realizar esta acción.",
  404: "No encontramos lo que buscabas.",
  409: "Hay un conflicto con el estado actual. Recargá e intentá de nuevo.",
  422: "Revisá los datos del formulario e intentá nuevamente.",
  500: "Ocurrió un error en el servidor. Intentá más tarde.",
  502: "Ocurrió un error en el servidor. Intentá más tarde.",
  503: "Ocurrió un error en el servidor. Intentá más tarde.",
  504: "Ocurrió un error en el servidor. Intentá más tarde.",
};

/**
 * Maps an API error to a user-facing Spanish message.
 *
 * Resolution order:
 * 1. Known error code → specific Spanish message
 * 2. Known HTTP status → generic Spanish message
 * 3. Fallback string provided by caller
 *
 * NEVER returns error.response.data.detail (English backend text).
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  // Narrow defensively to AxiosError
  const axiosError = error as AxiosError<ProblemDetail>;

  if (!axiosError?.response) {
    return fallback;
  }

  const status = axiosError.response.status;
  const data = axiosError.response.data as ProblemDetail | undefined;
  const code = data?.code;

  // 1. Exact code match
  if (code && CODE_MESSAGES[code]) {
    return CODE_MESSAGES[code];
  }

  // 2. Status match
  if (status && STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  return fallback;
}
