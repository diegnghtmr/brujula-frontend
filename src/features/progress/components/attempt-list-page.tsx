/**
 * AttemptListPage — course attempt history for a subscription (Slice C).
 *
 * Route: /progress/subscriptions/:subscriptionId/attempts
 *
 * Renders:
 * - List of CourseAttempt rows: courseName, periodName, status badge, finalGrade.
 * - Per-row inline edit (PUT with version for optimistic-lock; 409 → recoverable notice).
 * - Per-row delete with inline confirmation step.
 * - Empty-state message when no attempts.
 * - Pagination controls when totalPages > 1.
 *
 * WCAG 2.2 AA: status conveyed by color + icon + visible text label (never color-only).
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams } from "react-router";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import type { CourseAttempt } from "@/api/generated/models/course-attempt";
import { AttemptStatus } from "@/api/generated/models/attempt-status";
import { useCourseAttempts } from "@/features/progress/hooks/use-course-attempts";
import { useUpdateCourseAttempt } from "@/features/progress/hooks/use-update-course-attempt";
import { useDeleteCourseAttempt } from "@/features/progress/hooks/use-delete-course-attempt";
import { BackLink } from "@/components/layout/back-link";
import { cn } from "@/lib/utils";

const offeringsApi = createApiInstance(OfferingsApi);

// ---------------------------------------------------------------------------
// Status badge config — mirrors CourseStatusBadge pattern (color + icon + label)
// ---------------------------------------------------------------------------

const ATTEMPT_STATUS_CONFIG = {
  PASSED: {
    label: "Aprobada",
    textIcon: "✓",
    // §2.4: aprobada → state-aprobada (solid badge per §6.3)
    className: "bg-state-aprobada text-state-aprobada-foreground border-transparent",
  },
  FAILED: {
    label: "Reprobada",
    textIcon: "✕",
    // §2.4: reprobada → state-reprobada
    className: "bg-state-reprobada text-state-reprobada-foreground border-transparent",
  },
  CANCELLED: {
    label: "Cancelada",
    textIcon: "∅",
    // §2.4: cancelada → state-cancelada
    className: "bg-state-cancelada text-state-cancelada-foreground border-transparent",
  },
} as const;

type AttemptStatusKey = keyof typeof ATTEMPT_STATUS_CONFIG;

interface AttemptStatusBadgeProps {
  status: string;
}

function AttemptStatusBadge({ status }: AttemptStatusBadgeProps) {
  const config =
    ATTEMPT_STATUS_CONFIG[status as AttemptStatusKey] ??
    ATTEMPT_STATUS_CONFIG.CANCELLED;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border",
        config.className
      )}
      aria-label={`Estado: ${config.label}`}
    >
      <span aria-hidden="true">{config.textIcon}</span>
      {config.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Edit form schema
// ---------------------------------------------------------------------------

const editAttemptSchema = z.object({
  status: z.enum(["PASSED", "FAILED", "CANCELLED"], {
    error: "Seleccioná un estado.",
  }),
  finalGrade: z.coerce
    .number()
    .min(0, { message: "La nota mínima es 0.0." })
    .max(5, { message: "La nota máxima es 5.0." })
    .optional()
    .nullable(),
  periodId: z.string().min(1, { message: "El período es requerido." }),
});

interface EditAttemptFormData {
  status: "PASSED" | "FAILED" | "CANCELLED";
  finalGrade?: number | null;
  periodId: string;
}

// ---------------------------------------------------------------------------
// Inline edit form
// ---------------------------------------------------------------------------

interface InlineEditFormProps {
  attempt: CourseAttempt;
  subscriptionId: string;
  onClose: () => void;
}

function InlineEditForm({ attempt, subscriptionId, onClose }: InlineEditFormProps) {
  const queryClient = useQueryClient();
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<"PASSED" | "FAILED" | "CANCELLED">(
    (attempt.status as "PASSED" | "FAILED" | "CANCELLED") ?? "PASSED"
  );
  const showGrade = selectedStatus !== "CANCELLED";

  const {
    data: periods,
    isLoading: periodsLoading,
    isError: periodsError,
  } = useQuery({
    queryKey: ["periods"],
    queryFn: () => offeringsApi.listPeriods({}).then((r) => r.data),
  });

  const hasPeriods = (periods?.length ?? 0) > 0;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditAttemptFormData>({
    resolver: zodResolver(editAttemptSchema) as unknown as Resolver<EditAttemptFormData>,
    defaultValues: {
      status: (attempt.status as "PASSED" | "FAILED" | "CANCELLED") ?? "PASSED",
      finalGrade: attempt.finalGrade ?? null,
      periodId: attempt.periodId ?? "",
    },
  });

  const updateMutation = useUpdateCourseAttempt();

  const submitDisabled =
    updateMutation.isPending || periodsLoading || periodsError || !hasPeriods;

  function onSubmit(data: EditAttemptFormData) {
    setConflictError(null);
    setApiError(null);
    updateMutation.mutate(
      {
        attemptId: attempt.id,
        subscriptionId,
        status: data.status as (typeof AttemptStatus)[keyof typeof AttemptStatus],
        finalGrade: showGrade ? (data.finalGrade ?? null) : null,
        periodId: data.periodId,
        journeyCode: attempt.journeyCode,
        version: attempt.version,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (error: unknown) => {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;
          const detail = (axiosError.response?.data as { detail?: string } | undefined)?.detail;
          if (status === 409) {
            // Non-destructive: show notice, refetch list, keep form open with user values
            setConflictError(
              detail ??
                "Este registro cambió; recargá para ver la versión actual."
            );
            queryClient.invalidateQueries({ queryKey: ["course-attempts", subscriptionId] });
          } else if (status === 422) {
            setApiError(detail ?? "La nota no es válida para el estado seleccionado.");
          } else {
            setApiError("Ocurrió un error al actualizar el intento.");
          }
        },
      }
    );
  }

  return (
    <div
      className={cn(
        "mt-2 p-3 border rounded bg-muted/20 border-border",
        "flex flex-col gap-3"
      )}
    >
      {conflictError && (
        <div
          role="alert"
          className={cn(
            "p-2 text-xs border rounded",
            // §2.4: 409 conflict (advertencia recuperable) → warning-subtle
            "bg-warning-subtle text-warning-subtle-foreground border-transparent"
          )}
        >
          {conflictError}
        </div>
      )}

      {apiError && (
        <div
          role="alert"
          className={cn(
            "p-2 text-xs border rounded",
            // §2.4: API error → destructive-subtle
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          {apiError}
        </div>
      )}

      {periodsError && (
        <div
          role="alert"
          className={cn(
            "p-2 text-xs border rounded",
            // §2.4: load error → destructive-subtle
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          No se pudieron cargar los períodos académicos. Intentá nuevamente.
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-2"
        noValidate
      >
        {/* Status select */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`edit-status-${attempt.id}`}
            className="text-xs font-medium text-foreground"
          >
            Estado cursado
          </label>
          <select
            id={`edit-status-${attempt.id}`}
            aria-label="Estado"
            className={cn(
              "border rounded px-2 py-1.5 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              errors.status && "border-destructive"
            )}
            {...register("status")}
            onChange={(e) => {
              const val = e.target.value as "PASSED" | "FAILED" | "CANCELLED";
              setSelectedStatus(val);
              register("status").onChange(e);
            }}
          >
            <option value="PASSED">Aprobada</option>
            <option value="FAILED">Reprobada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          {errors.status && (
            <p className="text-xs text-destructive">{errors.status.message}</p>
          )}
        </div>

        {/* Grade — hidden for CANCELLED */}
        {showGrade && (
          <div className="flex flex-col gap-1">
            <label
              htmlFor={`edit-grade-${attempt.id}`}
              className="text-xs font-medium text-foreground"
            >
              Nota definitiva (0.0–5.0)
            </label>
            <input
              id={`edit-grade-${attempt.id}`}
              type="number"
              step="0.1"
              min="0"
              max="5"
              aria-label="Nota"
              className={cn(
                "border rounded px-2 py-1.5 text-sm bg-background text-foreground w-24",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                errors.finalGrade && "border-destructive"
              )}
              {...register("finalGrade")}
            />
            {errors.finalGrade && (
              <p className="text-xs text-destructive">{errors.finalGrade.message}</p>
            )}
          </div>
        )}

        {/* Period select */}
        <div className="flex flex-col gap-1">
          <label
            htmlFor={`edit-period-${attempt.id}`}
            className="text-xs font-medium text-foreground"
          >
            Período académico
          </label>
          <select
            id={`edit-period-${attempt.id}`}
            aria-label="Período"
            disabled={periodsLoading || periodsError || !hasPeriods}
            className={cn(
              "border rounded px-2 py-1.5 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              errors.periodId && "border-destructive"
            )}
            {...register("periodId")}
          >
            {periodsLoading && (
              <option value="" disabled>
                Cargando períodos...
              </option>
            )}
            {!periodsLoading && !periodsError && !hasPeriods && (
              <option value="" disabled>
                No hay períodos disponibles
              </option>
            )}
            {!periodsLoading && !periodsError && hasPeriods && (
              <option value="">Seleccioná un período...</option>
            )}
            {(periods ?? []).map((period) => (
              <option key={period.id} value={period.id}>
                {period.name}
              </option>
            ))}
          </select>
          {errors.periodId && (
            <p className="text-xs text-destructive">{errors.periodId.message}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitDisabled}
            aria-label="Guardar cambios"
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "bg-primary text-primary-foreground border-primary hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {updateMutation.isPending ? "Guardando..." : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancelar edición"
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40"
            )}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attempt row
// ---------------------------------------------------------------------------

interface AttemptRowProps {
  attempt: CourseAttempt;
  subscriptionId: string;
}

function AttemptRow({ attempt, subscriptionId }: AttemptRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const deleteMutation = useDeleteCourseAttempt();

  function handleDelete() {
    deleteMutation.mutate({ attemptId: attempt.id, subscriptionId });
    setConfirmDelete(false);
  }

  return (
    <li
      className={cn(
        // §6.4/§5.1: content tile → rounded-none
        "p-4 border rounded-none bg-card border-border",
        "flex flex-col gap-2"
      )}
    >
      {/* Row summary */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground">
            {attempt.courseName}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              {attempt.periodName ?? attempt.periodId}
            </span>
            <AttemptStatusBadge status={attempt.status} />
            {attempt.finalGrade != null && (
              // §3.1/§9: tabular-nums for grade values
              <span className="text-xs text-foreground font-medium tabular-nums">
                {attempt.finalGrade.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        {!editing && !confirmDelete && (
          <div className="flex gap-1.5 shrink-0">
            <button
              type="button"
              aria-label={`Editar intento de ${attempt.courseName}`}
              onClick={() => setEditing(true)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
                "border-border hover:bg-muted/40"
              )}
            >
              Editar
            </button>
            <button
              type="button"
              aria-label={`Eliminar intento de ${attempt.courseName}`}
              onClick={() => setConfirmDelete(true)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
                // §6.1/§2.3: destructive action outline style
                "border-destructive text-destructive hover:bg-destructive-subtle"
              )}
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete && !editing && (
        <div
          className={cn(
            "flex items-center gap-3 p-2 border rounded",
            // §2.3: destructive-subtle for the confirmation container
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          <span className="text-xs flex-1">
            ¿Confirmás la eliminación de este intento? Esta acción no se puede deshacer.
          </span>
          <button
            type="button"
            aria-label="Confirmar eliminación"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
              // §6.1/§2.3: destructive solid button for confirm action
              "bg-destructive text-destructive-foreground border-transparent hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Confirmar"}
          </button>
          <button
            type="button"
            aria-label="Cancelar eliminación"
            onClick={() => setConfirmDelete(false)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40"
            )}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <InlineEditForm
          attempt={attempt}
          subscriptionId={subscriptionId}
          onClose={() => setEditing(false)}
        />
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// AttemptListPage
// ---------------------------------------------------------------------------

function AttemptListPage() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();
  const [currentPage, setCurrentPage] = useState(0);

  const { data: page, isLoading, isError } = useCourseAttempts({
    subscriptionId: subscriptionId!,
    page: currentPage,
  });

  const attempts = page?.content ?? [];
  const totalPages = page?.totalPages ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackLink to="/progress/subscriptions" />
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Historial de intentos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Intentos académicos registrados para esta suscripción.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status">
          <span className="sr-only">Cargando historial de intentos...</span>
          <div
            className={cn(
              "w-6 h-6 border-4 rounded-full motion-safe:animate-spin",
              "border-muted border-t-primary"
            )}
            aria-hidden="true"
          />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No se pudo cargar el historial de intentos. Intentá nuevamente.
        </p>
      )}

      {!isLoading && !isError && attempts.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No hay intentos registrados para esta suscripción.
          </p>
        </div>
      )}

      {!isLoading && !isError && attempts.length > 0 && (
        <ul className="flex flex-col gap-3">
          {attempts.map((attempt) => (
            <AttemptRow
              key={attempt.id}
              attempt={attempt}
              subscriptionId={subscriptionId!}
            />
          ))}
        </ul>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav
          aria-label="Paginación de intentos"
          className="mt-6 flex items-center justify-center gap-2"
        >
          <button
            type="button"
            aria-label="Página anterior"
            disabled={currentPage === 0}
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Anterior
          </button>
          <span className="text-xs text-muted-foreground">
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            type="button"
            aria-label="Página siguiente"
            disabled={currentPage >= totalPages - 1}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Siguiente
          </button>
        </nav>
      )}
    </div>
  );
}

export { AttemptListPage };
