/**
 * DeclareProgressForm — per-subscription malla with per-course attempt declaration (PRG-1).
 *
 * Route: /progress/subscriptions/:subscriptionId/declare
 *
 * Flow:
 * 1. Fetch GET /me/subscriptions/{subscriptionId}/curriculum → semester buckets.
 * 2. Render semester groupings with per-course status badges (WCAG AA).
 * 3. Each course: "Declarar" button opens an inline form.
 * 4. Inline form: status select, optional grade (hidden for CANCELLED), periodId input.
 * 5. Submit → POST /me/course-attempts with Idempotency-Key per attempt.
 * 6. On 422 → show error (grade-status mismatch).
 * 7. On 409 → show conflict error.
 *
 * WCAG: course status badge uses CourseStatusBadge (color + icon + label).
 * No color as sole signal.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import type { CurriculumCourse } from "@/api/generated/models/curriculum-course";
import { AttemptStatus } from "@/api/generated/models/attempt-status";
import { CourseStatusBadge } from "./course-status-badge";
import { cn } from "@/lib/utils";

const progressApi = createApiInstance(ProgressApi);

/** Generate a v4 UUID using crypto.randomUUID when available. */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const declareAttemptSchema = z.object({
  status: z.enum(["PASSED", "FAILED", "CANCELLED"], {
    error: "Seleccioná un estado.",
  }),
  finalGrade: z.coerce
    .number()
    .min(0, { message: "La nota mínima es 0.0." })
    .max(5, { message: "La nota máxima es 5.0." })
    .optional()
    .nullable(),
  periodId: z.string().min(1, { message: "El ID del período es requerido." }),
});

type DeclareAttemptFormData = z.infer<typeof declareAttemptSchema>;

interface InlineDeclareFormProps {
  subscriptionId: string;
  referenceJourneyCode: string;
  course: CurriculumCourse;
  onClose: () => void;
}

function InlineDeclareForm({ subscriptionId, referenceJourneyCode, course, onClose }: InlineDeclareFormProps) {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedStatus, setSelectedStatus] = useState<"PASSED" | "FAILED" | "CANCELLED">("PASSED");
  const showGrade = selectedStatus !== "CANCELLED";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DeclareAttemptFormData>({
    resolver: zodResolver(declareAttemptSchema),
    defaultValues: { status: "PASSED", finalGrade: null, periodId: "" },
  });

  const createMutation = useMutation({
    mutationFn: (data: DeclareAttemptFormData) =>
      progressApi.createCourseAttempt({
        idempotencyKey: generateUUID(),
        xXSRFTOKEN: "",
        courseAttemptCreateRequest: {
          subscriptionId,
          courseId: course.courseId,
          periodId: data.periodId,
          journeyCode: referenceJourneyCode,
          status: data.status as (typeof AttemptStatus)[keyof typeof AttemptStatus],
          finalGrade: showGrade ? (data.finalGrade ?? null) : null,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["curriculum", subscriptionId] });
      onClose();
    },
    onError: (error: AxiosError) => {
      const status = error.response?.status;
      const detail = (error.response?.data as { detail?: string } | undefined)?.detail;
      if (status === 422) {
        setApiError(detail ?? "La nota no es válida para el estado seleccionado.");
      } else if (status === 409) {
        setApiError(detail ?? "Conflicto al registrar el intento. Intentá nuevamente.");
      } else {
        setApiError("Ocurrió un error al registrar el intento.");
      }
    },
  });

  return (
    <div
      className={cn(
        "mt-2 p-3 border rounded bg-muted/20 border-border",
        "flex flex-col gap-3"
      )}
    >
      {apiError && (
        <div
          role="alert"
          className={cn(
            "p-2 text-xs border rounded",
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          )}
        >
          {apiError}
        </div>
      )}

      <form
        onSubmit={handleSubmit((data) => {
          setApiError(null);
          createMutation.mutate(data);
        })}
        className="flex flex-col gap-2"
        noValidate
      >
        {/* Status select */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`status-${course.courseId}`} className="text-xs font-medium text-foreground">
            Estado cursado
          </label>
          <select
            id={`status-${course.courseId}`}
            aria-label="Estado"
            className={cn(
              "border rounded px-2 py-1.5 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              errors.status && "border-red-500"
            )}
            {...register("status")}
            onChange={(e) => {
              const val = e.target.value as "PASSED" | "FAILED" | "CANCELLED";
              setSelectedStatus(val);
              // Also let RHF track the value
              register("status").onChange(e);
            }}
          >
            <option value="PASSED">Aprobada</option>
            <option value="FAILED">Reprobada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          {errors.status && (
            <p className="text-xs text-red-600">{errors.status.message}</p>
          )}
        </div>

        {/* Grade field — hidden for CANCELLED */}
        {showGrade && (
          <div className="flex flex-col gap-1">
            <label htmlFor={`grade-${course.courseId}`} className="text-xs font-medium text-foreground">
              Nota definitiva (0.0–5.0)
            </label>
            <input
              id={`grade-${course.courseId}`}
              type="number"
              step="0.1"
              min="0"
              max="5"
              aria-label="Nota"
              className={cn(
                "border rounded px-2 py-1.5 text-sm bg-background text-foreground w-24",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                errors.finalGrade && "border-red-500"
              )}
              {...register("finalGrade")}
            />
            {errors.finalGrade && (
              <p className="text-xs text-red-600">{errors.finalGrade.message}</p>
            )}
          </div>
        )}

        {/* Period ID */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`period-${course.courseId}`} className="text-xs font-medium text-foreground">
            Período (ID del semestre)
          </label>
          <input
            id={`period-${course.courseId}`}
            type="text"
            aria-label="Período"
            placeholder="UUID del período académico"
            className={cn(
              "border rounded px-2 py-1.5 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              errors.periodId && "border-red-500"
            )}
            {...register("periodId")}
          />
          {errors.periodId && (
            <p className="text-xs text-red-600">{errors.periodId.message}</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            aria-label="Guardar intento"
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "bg-primary text-primary-foreground border-primary hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {createMutation.isPending ? "Guardando..." : "Guardar intento"}
          </button>
          <button
            type="button"
            onClick={onClose}
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

interface CourseRowProps {
  subscriptionId: string;
  referenceJourneyCode: string;
  course: CurriculumCourse;
}

function CourseRow({ subscriptionId, referenceJourneyCode, course }: CourseRowProps) {
  const [declaring, setDeclaring] = useState(false);

  return (
    <li className={cn("p-3 border rounded bg-card border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {course.name}
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{course.credits} cr</span>
            {course.officialCode && (
              <span className="text-xs text-muted-foreground">{course.officialCode}</span>
            )}
            <CourseStatusBadge
              status={course.progressStatus}
              unmetRequirements={course.unmetRequirements}
            />
          </div>
        </div>
        <button
          type="button"
          aria-label={`Declarar intento para ${course.name}`}
          onClick={() => setDeclaring((prev) => !prev)}
          className={cn(
            "shrink-0 px-2.5 py-1 text-xs font-medium rounded border transition-colors",
            "border-border hover:bg-muted/40"
          )}
        >
          Declarar
        </button>
      </div>

      {declaring && (
        <InlineDeclareForm
          subscriptionId={subscriptionId}
          referenceJourneyCode={referenceJourneyCode}
          course={course}
          onClose={() => setDeclaring(false)}
        />
      )}
    </li>
  );
}

function DeclareProgressForm() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();

  const {
    data: curriculum,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["curriculum", subscriptionId],
    queryFn: () =>
      progressApi
        .getSubscriptionCurriculum({ subscriptionId: subscriptionId! })
        .then((r) => r.data),
    enabled: !!subscriptionId,
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Declarar avance académico
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registrá los cursos que ya cursaste en este programa.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status">
          <span className="sr-only">Cargando malla curricular...</span>
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
          No se pudo cargar la malla curricular. Intentá nuevamente.
        </p>
      )}

      {curriculum && !isLoading && (
        <div className="flex flex-col gap-6">
          {curriculum.semesters.map((semester) => (
            <section key={semester.recommendedSemester} aria-label={`Semestre ${semester.recommendedSemester}`}>
              <h2 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Semestre {semester.recommendedSemester}
              </h2>
              <ul className="flex flex-col gap-2">
                {semester.courses.map((course) => (
                  <CourseRow
                    key={course.courseId}
                    subscriptionId={subscriptionId!}
                    referenceJourneyCode={curriculum.referenceJourney.code}
                    course={course}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export { DeclareProgressForm };
