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
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import type { CurriculumCourse } from "@/api/generated/models/curriculum-course";
import { AttemptStatus } from "@/api/generated/models/attempt-status";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { CourseStatusBadge } from "./course-status-badge";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";

const progressApi = createApiInstance(ProgressApi);
const offeringsApi = createApiInstance(OfferingsApi);

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

// Explicit output type: z.coerce.number() infers unknown for input but number for output.
// Using z.infer<> here causes a zodResolver generic mismatch with @hookform/resolvers v5.
// Defining the output type explicitly avoids the Resolver<input,ctx,output> incompatibility.
interface DeclareAttemptFormData {
  status: "PASSED" | "FAILED" | "CANCELLED";
  finalGrade?: number | null;
  periodId: string;
}

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

  // Load academic periods from API — same pattern as SimulationCreateForm
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
  } = useForm<DeclareAttemptFormData>({
    // Cast required: @hookform/resolvers v5 types zodResolver as Resolver<input,any,output>.
    // z.coerce.number() makes input type unknown, which is incompatible with form values type.
    // The cast is safe because zodResolver correctly validates and transforms at runtime.
    resolver: zodResolver(declareAttemptSchema) as unknown as Resolver<DeclareAttemptFormData>,
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
      setApiError(
        getApiErrorMessage(error, "Ocurrió un error al registrar el intento.")
      );
    },
  });

  // Submit is disabled when: mutation pending, periods still loading, periods errored, or no periods available
  const submitDisabled = createMutation.isPending || periodsLoading || periodsError || !hasPeriods;

  return (
    <div
      className={cn(
        "mt-2 p-3 border rounded bg-muted/20 border-border",
        "flex flex-col gap-3"
      )}
    >
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
              errors.status && "border-destructive"
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
            <p className="text-xs text-destructive">{errors.status.message}</p>
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
                errors.finalGrade && "border-destructive"
              )}
              {...register("finalGrade")}
            />
            {errors.finalGrade && (
              <p className="text-xs text-destructive">{errors.finalGrade.message}</p>
            )}
          </div>
        )}

        {/* Period select — values come from GET /periods API */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`period-${course.courseId}`} className="text-xs font-medium text-foreground">
            Período académico
          </label>
          <select
            id={`period-${course.courseId}`}
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
              <option value="" disabled>Cargando períodos...</option>
            )}
            {!periodsLoading && !periodsError && !hasPeriods && (
              <option value="" disabled>No hay períodos disponibles</option>
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

  // §6.4/§5.1: content tile → rounded-none
  return (
    <li className={cn("p-3 border rounded-none bg-card border-border")}>
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
      <BackLink to="/progress/subscriptions" />
      <header className="flex items-start justify-between gap-4 mb-6 mt-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Declarar avance académico
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Registrá los cursos que ya cursaste en este programa.
          </p>
        </div>
        {subscriptionId && (
          <Link
            to={`/progress/subscriptions/${subscriptionId}/attempts`}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40 text-foreground"
            )}
          >
            Ver historial de intentos
          </Link>
        )}
      </header>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex flex-col gap-6">
          <span className="sr-only">Cargando malla curricular…</span>
          {/* Simulate semester sections */}
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-12 w-full rounded-none" />
            <Skeleton className="h-12 w-full rounded-none" />
          </div>
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
