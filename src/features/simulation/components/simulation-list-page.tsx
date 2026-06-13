/**
 * SimulationListPage — SIM-002, FE-001
 *
 * Route: /simulations
 *
 * Lists student's simulations with status badges.
 * "Nueva simulación" → /simulations/new
 * "Eliminar" → DELETE /me/simulations/{id} with inline confirmation (mirrors SubscriptionListPage).
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { useSimulations } from "@/features/simulation/hooks/use-simulations";
import { useDeleteSimulation } from "@/features/simulation/hooks/use-delete-simulation";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { SimulationStatusBadge } from "./simulation-status-badge";
import { cn } from "@/lib/utils";
import type { Simulation } from "@/api/generated/models/simulation";
import { getApiErrorMessage } from "@/lib/api-error";

// ---------------------------------------------------------------------------
// SimulationCard — with inline delete confirmation (mirrors SubscriptionCard)
// ---------------------------------------------------------------------------

interface SimulationCardProps {
  sim: Simulation;
}

function SimulationCard({ sim }: SimulationCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useDeleteSimulation();

  function handleDelete() {
    setDeleteError(null);
    deleteMutation.mutate(
      { simulationId: sim.id },
      {
        onSuccess: () => {
          setConfirmDelete(false);
        },
        onError: (error: unknown) => {
          setDeleteError(
            getApiErrorMessage(error, "No se pudo eliminar la simulación. Intentá nuevamente.")
          );
          setConfirmDelete(false);
        },
      }
    );
  }

  return (
    <li
      className={cn(
        // §6.4/§5.1: content tile → rounded-none
        "p-4 border rounded-none bg-card border-border",
        "flex flex-col gap-3"
      )}
    >
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground truncate">
            {sim.name}
          </span>
          <SimulationStatusBadge status={sim.status} />
        </div>
        <span className="text-xs text-muted-foreground">{sim.periodName}</span>
      </div>

      {/* Error alert from failed delete */}
      {deleteError && (
        <div
          role="alert"
          className={cn(
            "p-2 text-xs border rounded",
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          {deleteError}
        </div>
      )}

      {/* Action buttons row */}
      {!confirmDelete && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate(`/simulations/${sim.id}`)}
            aria-label={`Ver simulación ${sim.name}`}
            className={cn(
              "shrink-0 px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-primary text-primary hover:bg-accent"
            )}
          >
            Ver detalle
          </button>

          {/* Destructive action — outline style, not heavy fill (§6.1/§2.3) */}
          <button
            type="button"
            aria-label={`Eliminar simulación ${sim.name}`}
            disabled={deleteMutation.isPending}
            onClick={() => {
              setDeleteError(null);
              setConfirmDelete(true);
            }}
            className={cn(
              "shrink-0 px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-destructive text-destructive hover:bg-destructive-subtle",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      )}

      {/* Inline delete confirmation — mirrors SubscriptionListPage pattern */}
      {confirmDelete && (
        <div
          className={cn(
            "flex items-center gap-3 p-2 border rounded",
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          <span className="text-xs flex-1">
            ¿Confirmás que querés eliminar esta simulación? Esta acción no se puede deshacer.
          </span>
          <button
            type="button"
            aria-label="Confirmar eliminación"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
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
    </li>
  );
}

// ---------------------------------------------------------------------------
// SimulationListPage
// ---------------------------------------------------------------------------

function SimulationListPage() {
  const navigate = useNavigate();

  const {
    data: page,
    isLoading,
    isError,
  } = useSimulations();

  const simulations = page?.content ?? [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackLink to="/dashboard" />
      <header className="flex items-start justify-between gap-4 mb-6 mt-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Mis simulaciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Planificaciones académicas por período.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/simulations/new")}
          aria-label="Nueva simulación"
          className={cn(
            "px-4 py-2 text-sm font-medium rounded border transition-colors",
            "bg-primary text-primary-foreground border-primary hover:opacity-90"
          )}
        >
          + Nueva simulación
        </button>
      </header>

      {isLoading && (
        <div role="status" aria-live="polite" className="flex flex-col gap-3">
          <span className="sr-only">Cargando simulaciones…</span>
          <Skeleton className="h-20 w-full rounded-none" />
          <Skeleton className="h-20 w-full rounded-none" />
          <Skeleton className="h-20 w-full rounded-none" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No se pudieron cargar las simulaciones. Intentá nuevamente.
        </p>
      )}

      {!isLoading && !isError && simulations.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No tenés simulaciones todavía. Creá una para empezar a planificar.
          </p>
          <button
            type="button"
            onClick={() => navigate("/simulations/new")}
            className={cn(
              "mt-4 px-4 py-2 text-sm font-medium rounded border transition-colors",
              "border-primary text-primary hover:bg-accent"
            )}
          >
            Crear primera simulación
          </button>
        </div>
      )}

      {!isLoading && simulations.length > 0 && (
        <ul className="flex flex-col gap-3">
          {simulations.map((sim) => (
            <SimulationCard key={sim.id} sim={sim} />
          ))}
        </ul>
      )}
    </div>
  );
}

export { SimulationListPage };
