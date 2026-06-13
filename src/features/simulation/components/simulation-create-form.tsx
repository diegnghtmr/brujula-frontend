/**
 * SimulationCreateForm — FE-001, SIM-001
 *
 * Route: /simulations/new
 *
 * Flow:
 * 1. GET /periods → populate period dropdown (real periodId from data, not hardcoded)
 * 2. GET /me/subscriptions → populate subscription checkboxes (student's programs × jornadas)
 * 3. RHF+Zod: name 1-120, periodId required, subscriptionIds min 1, max 4,
 *    and at most 2 distinct programIds across selected subscriptions.
 * 4. Submit → POST /me/simulations with Idempotency-Key uuidv4, body has selections: SimulationScopeEntry[]
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
import type { Subscription } from "@/api/generated/models/subscription";
import { useCreateSimulation } from "@/features/simulation/hooks/use-create-simulation";
import { BackLink } from "@/components/layout/back-link";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";

const offeringsApi = createApiInstance(OfferingsApi);
const subscriptionsApi = createApiInstance(SubscriptionsApi);

/**
 * Build the Zod schema dynamically so the refine for distinct programs
 * can resolve programId from subscription data.
 */
function buildSchema(subs: Subscription[]) {
  return z.object({
    name: z
      .string()
      .min(1, { message: "El nombre es requerido." })
      .max(120, { message: "El nombre no puede exceder 120 caracteres." }),
    periodId: z.string().min(1, { message: "Seleccioná un período académico." }),
    subscriptionIds: z
      .array(z.string())
      .min(1, { message: "Seleccioná al menos una opción." })
      .max(4, { message: "Podés seleccionar hasta 4 combinaciones." })
      .refine(
        (ids) => {
          const programIds = ids
            .map((id) => subs.find((s) => s.id === id)?.programId)
            .filter((p): p is string => Boolean(p));
          return new Set(programIds).size <= 2;
        },
        { message: "Máximo 2 programas distintos permitidos." }
      ),
  });
}

type CreateSimulationFormData = {
  name: string;
  periodId: string;
  subscriptionIds: string[];
};

function SimulationCreateForm() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  // Load periods from real API — periodId values come from data, not hardcoded
  const { data: periods, isLoading: periodsLoading } = useQuery({
    queryKey: ["periods"],
    queryFn: () => offeringsApi.listPeriods({}).then((r) => r.data),
  });

  // Load student subscriptions — subscription id, programId, and referenceJourney come from data
  const { data: subscriptions, isLoading: subscriptionsLoading } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => subscriptionsApi.listMySubscriptions().then((r) => r.data),
  });

  const createMutation = useCreateSimulation();

  const schema = buildSchema(subscriptions ?? []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateSimulationFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", periodId: "", subscriptionIds: [] },
  });

  function onSubmit(data: CreateSimulationFormData) {
    setApiError(null);
    const selections = data.subscriptionIds
      .map((id) => (subscriptions ?? []).find((s) => s.id === id))
      .filter((sub): sub is Subscription => Boolean(sub))
      .map((sub) => ({ programId: sub.programId, journeyCode: sub.referenceJourney.code }));
    if (selections.length === 0) {
      setApiError("Tus suscripciones cambiaron. Recargá la página e intentá de nuevo.");
      return;
    }
    createMutation.mutate(
      {
        name: data.name,
        periodId: data.periodId,
        selections,
      },
      {
        onSuccess: (simulation) => {
          navigate(`/simulations/${simulation.id}`);
        },
        onError: (error: Error) => {
          setApiError(
            getApiErrorMessage(error, "Error al crear la simulación. Intentá nuevamente.")
          );
        },
      }
    );
  }

  const isLoading = periodsLoading || subscriptionsLoading;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BackLink to="/simulations" />
      <header className="mb-6 mt-2">
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
            // §2.4: API error → destructive-subtle
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
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
                errors.name && "border-destructive"
              )}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
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
                errors.periodId && "border-destructive"
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
              <p className="text-xs text-destructive">{errors.periodId.message}</p>
            )}
          </div>

          {/* Subscription checkboxes — each row = program × jornada */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Programas y jornadas (máx. 2 programas)
            </span>
            <div className="flex flex-col gap-1">
              {(subscriptions ?? []).map((sub) => (
                <label
                  key={sub.id}
                  className="flex items-center gap-2 text-sm text-foreground cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={sub.id}
                    {...register("subscriptionIds")}
                    className="rounded border-border"
                  />
                  {sub.programName} · {sub.referenceJourney.name}
                </label>
              ))}
            </div>
            {errors.subscriptionIds && (
              <p className="text-xs text-destructive">{errors.subscriptionIds.message}</p>
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
