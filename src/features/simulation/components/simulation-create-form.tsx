/**
 * SimulationCreateForm — FE-001, SIM-001
 *
 * Route: /simulations/new
 *
 * Flow:
 * 1. GET /periods → populate period dropdown (real periodId from data, not hardcoded)
 * 2. GET /me/subscriptions → populate programIds checkboxes (student's programs)
 * 3. RHF+Zod: name 1-120, periodId required, programIds 1-2 unique (no hardcoded values)
 * 4. Submit → POST /me/simulations with Idempotency-Key uuidv4
 * 5. 201 → navigate to /simulations/:id
 * 6. 422/400 → inline error shown
 *
 * WCAG: error messages shown inline near field.
 * No hardcoded periodId or programId in submission — all from data.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import { useCreateSimulation } from "@/features/simulation/hooks/use-create-simulation";
import { cn } from "@/lib/utils";

const offeringsApi = createApiInstance(OfferingsApi);
const subscriptionsApi = createApiInstance(SubscriptionsApi);

const createSimulationSchema = z.object({
  name: z
    .string()
    .min(1, { message: "El nombre es requerido." })
    .max(120, { message: "El nombre no puede exceder 120 caracteres." }),
  periodId: z.string().min(1, { message: "Seleccioná un período académico." }),
  programIds: z
    .array(z.string())
    .min(1, { message: "Seleccioná al menos un programa." })
    .max(2, { message: "Máximo 2 programas permitidos." })
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Los programas deben ser únicos.",
    }),
});

type CreateSimulationFormData = z.infer<typeof createSimulationSchema>;

function SimulationCreateForm() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  // Load periods from real API — periodId values come from data, not hardcoded
  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ["periods"],
    queryFn: () => offeringsApi.listPeriods({}).then((r) => r.data),
  });

  // Load student subscriptions — programId values come from data, not hardcoded
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => subscriptionsApi.listMySubscriptions().then((r) => r.data),
  });

  const createMutation = useCreateSimulation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSimulationFormData>({
    resolver: zodResolver(createSimulationSchema),
    defaultValues: { name: "", periodId: "", programIds: [] },
  });

  function onSubmit(data: CreateSimulationFormData) {
    setApiError(null);
    createMutation.mutate(
      {
        name: data.name,
        periodId: data.periodId,
        programIds: new Set(data.programIds),
      },
      {
        onSuccess: (simulation) => {
          navigate(`/simulations/${simulation.id}`);
        },
        onError: (error: Error) => {
          const axiosError = error as AxiosError;
          const status = axiosError.response?.status;
          const detail = (axiosError.response?.data as { detail?: string } | undefined)?.detail;
          if (status === 422 || status === 400) {
            setApiError(detail ?? "Los datos del formulario no son válidos.");
          } else {
            setApiError("Error al crear la simulación. Intentá nuevamente.");
          }
        },
      }
    );
  }

  const isLoading = periodsLoading || subscriptionsLoading;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Nueva simulación
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Planificá tu carga académica para el próximo período.
        </p>
      </header>

      {apiError && (
        <div
          role="alert"
          className={cn(
            "mb-4 p-3 text-sm border rounded",
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          )}
        >
          <span aria-hidden="true" className="font-bold mr-1">✕</span>
          {apiError}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12" role="status">
          <span className="sr-only">Cargando datos del formulario...</span>
          <div
            className={cn(
              "w-6 h-6 border-4 rounded-full motion-safe:animate-spin",
              "border-muted border-t-primary"
            )}
            aria-hidden="true"
          />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Name field */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sim-name" className="text-sm font-medium text-foreground">
              Nombre de la simulación
            </label>
            <input
              id="sim-name"
              type="text"
              aria-label="Nombre"
              placeholder="Ej: Semestre 2026-2 Sistemas"
              className={cn(
                "border rounded px-3 py-2 text-sm bg-background text-foreground",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                errors.name && "border-red-500"
              )}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>

          {/* Period dropdown — values come from API, not hardcoded */}
          <div className="flex flex-col gap-1">
            <label htmlFor="sim-period" className="text-sm font-medium text-foreground">
              Período académico
            </label>
            <select
              id="sim-period"
              aria-label="Período"
              className={cn(
                "border rounded px-3 py-2 text-sm bg-background text-foreground",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                errors.periodId && "border-red-500"
              )}
              {...register("periodId")}
            >
              <option value="">Seleccioná un período...</option>
              {(periods ?? []).map((period) => (
                <option key={period.id} value={period.id}>
                  {period.name}
                </option>
              ))}
            </select>
            {errors.periodId && (
              <p className="text-xs text-red-600">{errors.periodId.message}</p>
            )}
          </div>

          {/* Program checkboxes — values come from subscriptions, not hardcoded */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Programas (máx. 2)
            </span>
            <div className="flex flex-col gap-1">
              {(subscriptions ?? []).map((sub) => (
                <label
                  key={sub.programId}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={sub.programId}
                    {...register("programIds")}
                    className="rounded border-border"
                  />
                  {sub.programName}
                </label>
              ))}
            </div>
            {errors.programIds && (
              <p className="text-xs text-red-600">{errors.programIds.message}</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-2 mt-2">
            <button
              type="submit"
              disabled={createMutation.isPending}
              aria-label="Crear simulación"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded border transition-colors",
                "bg-primary text-primary-foreground border-primary hover:opacity-90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {createMutation.isPending ? "Creando..." : "Crear simulación"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/simulations")}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded border transition-colors",
                "border-border hover:bg-muted/40"
              )}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export { SimulationCreateForm };
