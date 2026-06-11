/**
 * SubscribeForm — create a new program subscription (SUB-1).
 *
 * Flow:
 * 1. Load active programs → populate program selector.
 * 2. On program select → load active plans for that program.
 * 3. On plan select → enable journey selector (options loaded from GET /journeys).
 * 4. Submit → POST /me/subscriptions with Idempotency-Key (uuid v4 per attempt).
 * 5. On 201 → navigate to subscriptions list.
 * 6. On 409 → show error alert (cap=2 / duplicate program).
 * 7. On 422 → show validation error.
 *
 * NOTE: Journey options come from GET /journeys (CatalogApi.listJourneys), NOT from
 * plan.applicableJourneys. The backend deliberately returns applicableJourneys: []
 * on plan responses (not loaded in ProgramView scope).
 *
 * RHF + Zod 4 validation; TanStack Query for server state.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { CatalogApi } from "@/api/generated/api/catalog-api";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import { cn } from "@/lib/utils";

const catalogApi = createApiInstance(CatalogApi);
const subscriptionsApi = createApiInstance(SubscriptionsApi);

// DEBT-F3-001: listPrograms and listStudyPlans return allOf *Page types.
// The generator collapses allOf to PageMeta; cast to the full shape at usage.
interface ProgramPageFull {
  content: Array<{
    id: string;
    name: string;
    faculty: string;
    status: string;
    availableJourneys: Array<{ code: string; name: string }>;
    version: number;
  }>;
  totalPages: number;
}

interface StudyPlanPageFull {
  content: Array<{
    id: string;
    programId: string;
    name: string;
    status: string;
    totalCredits: number;
    version: number;
  }>;
  totalPages: number;
}

const subscribeSchema = z.object({
  programId: z.string().min(1, { message: "Seleccioná un programa." }),
  planId: z.string().min(1, { message: "Seleccioná un plan de estudios." }),
  referenceJourneyCode: z.string().min(1, { message: "Seleccioná una jornada de referencia." }),
});

type SubscribeFormData = z.infer<typeof subscribeSchema>;

/** Generate a v4 UUID (using crypto.randomUUID when available). */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments that don't support crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function SubscribeForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeFormData>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: { programId: "", planId: "", referenceJourneyCode: "" },
  });

  // Load active programs
  // DEBT-F3-001: listPrograms returns ProgramPage (allOf collapsed by generator) — cast to full shape
  const { data: programData } = useQuery({
    queryKey: ["programs", "list", 0],
    queryFn: () =>
      catalogApi
        .listPrograms({ status: "ACTIVE" as const, page: 0, size: 50 })
        .then((r) => r.data as unknown as ProgramPageFull),
  });

  const programs = programData?.content ?? [];

  // Load active plans for the selected program (listProgramPlans returns Array<StudyPlan> — plain array, no cast needed)
  const { data: planList } = useQuery({
    queryKey: ["plans", "list", selectedProgramId],
    queryFn: () =>
      catalogApi
        .listProgramPlans({ programId: selectedProgramId, status: "ACTIVE" as const })
        .then((r) => r.data),
    enabled: !!selectedProgramId,
  });

  const plans = (planList ?? []) as StudyPlanPageFull["content"];

  // Load journeys from GET /journeys — independent of plan (plan.applicableJourneys is always empty)
  const {
    data: journeyList,
    isLoading: journeysLoading,
    isError: journeysError,
  } = useQuery({
    queryKey: ["journeys"],
    queryFn: () => catalogApi.listJourneys().then((r) => r.data),
  });

  const journeys = journeyList ?? [];

  // Create subscription mutation
  const createMutation = useMutation({
    mutationFn: (data: SubscribeFormData) =>
      subscriptionsApi.createSubscription({
        idempotencyKey: generateUUID(),
        xXSRFTOKEN: "",
        subscriptionCreateRequest: {
          programId: data.programId,
          planId: data.planId,
          referenceJourneyCode: data.referenceJourneyCode,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      navigate("/progress/subscriptions");
    },
    onError: (error: AxiosError) => {
      const status = error.response?.status;
      const detail =
        (error.response?.data as { detail?: string } | undefined)?.detail;

      if (status === 409) {
        setApiError(
          detail ?? "Ya tenés el máximo de suscripciones activas o ya estás suscrito a este programa."
        );
      } else if (status === 422) {
        setApiError(
          detail ?? "El plan de estudios no está activo o los datos son inválidos."
        );
      } else {
        setApiError("Ocurrió un error al suscribirse. Intentá nuevamente.");
      }
    },
  });

  function onSubmit(data: SubscribeFormData) {
    setApiError(null);
    createMutation.mutate(data);
  }

  // Submit is blocked while journeys are loading or errored (same pattern as DeclareProgressForm)
  const submitDisabled = isSubmitting || createMutation.isPending || journeysLoading || journeysError;

  return (
    <div className="p-6 max-w-lg mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Suscribirse a un programa
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Seleccioná el programa, plan y jornada para agregar a tu planificación.
        </p>
      </header>

      {apiError && (
        <div
          role="alert"
          className={cn(
            "mb-4 p-3 border rounded text-sm",
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          )}
        >
          {apiError}
        </div>
      )}

      {journeysError && (
        <div
          role="alert"
          className={cn(
            "mb-4 p-3 border rounded text-sm",
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          )}
        >
          No se pudieron cargar las jornadas. Intentá nuevamente.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
        {/* Program selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="programId" className="text-sm font-medium text-foreground">
            Programa académico
          </label>
          <select
            id="programId"
            aria-label="Programa"
            className={cn(
              "border rounded px-3 py-2 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              errors.programId && "border-red-500"
            )}
            {...register("programId")}
            onChange={(e) => {
              setSelectedProgramId(e.target.value);
              setSelectedPlanId("");
              register("programId").onChange(e);
            }}
          >
            <option value="">— Seleccioná un programa —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.programId && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.programId.message}
            </p>
          )}
        </div>

        {/* Plan selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="planId" className="text-sm font-medium text-foreground">
            Plan de estudios
          </label>
          <select
            id="planId"
            aria-label="Plan"
            disabled={!selectedProgramId || plans.length === 0}
            className={cn(
              "border rounded px-3 py-2 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              errors.planId && "border-red-500"
            )}
            {...register("planId")}
            onChange={(e) => {
              setSelectedPlanId(e.target.value);
              register("planId").onChange(e);
            }}
          >
            <option value="">— Seleccioná un plan —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {errors.planId && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.planId.message}
            </p>
          )}
        </div>

        {/* Journey selector — options from GET /journeys, enabled only after plan is selected */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="referenceJourneyCode" className="text-sm font-medium text-foreground">
            Jornada de referencia
          </label>
          <select
            id="referenceJourneyCode"
            aria-label="Jornada"
            disabled={!selectedPlanId || journeysLoading || journeysError || journeys.length === 0}
            className={cn(
              "border rounded px-3 py-2 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-2 focus:ring-primary",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              errors.referenceJourneyCode && "border-red-500"
            )}
            {...register("referenceJourneyCode")}
          >
            <option value="">— Seleccioná una jornada —</option>
            {journeys.map((j) => (
              <option key={j.code} value={j.code}>
                {j.name}
              </option>
            ))}
          </select>
          {errors.referenceJourneyCode && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {errors.referenceJourneyCode.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={submitDisabled}
          aria-label="Suscribir"
          className={cn(
            "px-4 py-2 text-sm font-medium rounded border transition-colors",
            "bg-primary text-primary-foreground border-primary",
            "hover:opacity-90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {createMutation.isPending ? "Suscribiendo..." : "Suscribir"}
        </button>
      </form>
    </div>
  );
}

export { SubscribeForm };
