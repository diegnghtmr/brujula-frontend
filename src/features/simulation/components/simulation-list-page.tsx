/**
 * SimulationListPage — SIM-002, FE-001
 *
 * Route: /simulations
 *
 * Lists student's simulations with status badges.
 * "Nueva simulación" → /simulations/new
 */

import { useNavigate } from "react-router";
import { useSimulations } from "@/features/simulation/hooks/use-simulations";
import { SimulationStatusBadge } from "./simulation-status-badge";
import { cn } from "@/lib/utils";

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
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
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
        <div className="flex items-center justify-center py-12" role="status">
          <span className="sr-only">Cargando simulaciones...</span>
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
              "border-primary text-primary hover:bg-primary/10"
            )}
          >
            Crear primera simulación
          </button>
        </div>
      )}

      {!isLoading && simulations.length > 0 && (
        <ul className="flex flex-col gap-3">
          {simulations.map((sim) => (
            <li
              key={sim.id}
              className={cn(
                "p-4 border rounded bg-card border-border",
                "flex items-start justify-between gap-3 flex-wrap"
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

              <button
                type="button"
                onClick={() => navigate(`/simulations/${sim.id}`)}
                aria-label={`Ver simulación ${sim.name}`}
                className={cn(
                  "shrink-0 px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                  "border-primary text-primary hover:bg-primary/10"
                )}
              >
                Ver detalle
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { SimulationListPage };
