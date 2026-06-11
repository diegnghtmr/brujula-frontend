/**
 * ProgressSummaryView — student progress summary for a subscription (AVL-2).
 *
 * Route: /progress/subscriptions/:subscriptionId/progress
 *
 * Renders:
 * - totalPlanCredits, approvedCredits, pendingCredits
 * - progressPercentage (progress bar)
 * - passedCourses, pendingFailedCourses
 * - estimatedHistoricalAverage (nullable → "—")
 * - averagesByPeriod table
 * - disclaimer (CROSS-6 — non-empty, self-declared notice)
 *
 * Data source: GET /me/subscriptions/{subscriptionId}/progress via TanStack Query.
 */

import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { ProgressApi } from "@/api/generated/api/progress-api";
import { createApiInstance } from "@/api/client";
import { BackLink } from "@/components/layout/back-link";
import { cn } from "@/lib/utils";

const progressApi = createApiInstance(ProgressApi);

function ProgressSummaryView() {
  const { subscriptionId } = useParams<{ subscriptionId: string }>();

  const {
    data: summary,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["progress", subscriptionId],
    queryFn: () =>
      progressApi
        .getSubscriptionProgress({ subscriptionId: subscriptionId! })
        .then((r) => r.data),
    enabled: !!subscriptionId,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BackLink to="/progress/subscriptions" />
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Resumen de avance
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimación basada en datos autodeclarados.
        </p>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status">
          <span className="sr-only">Cargando resumen de avance...</span>
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
          No se pudo cargar el resumen de avance. Intentá nuevamente.
        </p>
      )}

      {summary && !isLoading && (
        <div className="flex flex-col gap-6">
          {/* Credit summary */}
          <section
            aria-label="Resumen de créditos"
            className={cn(
              "grid grid-cols-2 sm:grid-cols-3 gap-4 p-4",
              // §6.4/§5.1: content tile → rounded-none
                "border rounded-none bg-card border-border"
            )}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Créditos aprobados
              </span>
              {/* §3.1/§9: tabular-nums for credit values */}
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {summary.approvedCredits}
              </span>
              <span className="text-xs text-muted-foreground">
                de {summary.totalPlanCredits} totales
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Créditos pendientes
              </span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {summary.pendingCredits}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Avance estimado
              </span>
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {summary.progressPercentage.toFixed(1)}%
              </span>
            </div>
          </section>

          {/* Progress bar */}
          <div
            aria-label={`Progreso: ${summary.progressPercentage.toFixed(1)}%`}
            className="w-full h-2 bg-muted rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${Math.min(summary.progressPercentage, 100)}%` }}
              aria-hidden="true"
            />
          </div>

          {/* Course counts */}
          <section
            aria-label="Conteo de materias"
            className="grid grid-cols-2 gap-4"
          >
            <div className={cn("p-3 border rounded-none bg-card border-border")}>
              <span className="text-xs text-muted-foreground">Materias aprobadas</span>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {summary.passedCourses}
              </p>
            </div>
            <div className={cn("p-3 border rounded-none bg-card border-border")}>
              <span className="text-xs text-muted-foreground">Materias por recuperar</span>
              <p className="text-xl font-bold text-foreground mt-0.5">
                {summary.pendingFailedCourses}
              </p>
            </div>
          </section>

          {/* Average */}
          <section
            aria-label="Promedio histórico estimado"
            className={cn("p-4 border rounded-none bg-card border-border")}
          >
            <h2 className="text-sm font-semibold text-foreground mb-3">
              Promedio histórico estimado
            </h2>
            {/* §3.1/§9: tabular-nums for average values */}
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {summary.estimatedHistoricalAverage != null
                ? summary.estimatedHistoricalAverage.toFixed(2)
                : "—"}
            </p>

            {/* Averages by period */}
            {summary.averagesByPeriod && summary.averagesByPeriod.length > 0 && (
              <div className="mt-4">
                <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                  Por período
                </h3>
                <ul className="flex flex-col gap-1">
                  {summary.averagesByPeriod.map((pa) => (
                    <li
                      key={pa.periodId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-muted-foreground truncate">
                        {pa.periodName ?? pa.periodId}
                      </span>
                      <span className="font-medium text-foreground ml-4 shrink-0 tabular-nums">
                        {pa.estimatedAverage.toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Disclaimer (CROSS-6) — required, always non-empty */}
          <aside
            aria-label="Aviso de datos autodeclarados"
            className={cn(
              "p-3 border rounded text-xs",
              // §6.13/P1-5: persistent calm notice → warning-subtle (not assertive alert color)
              "bg-warning-subtle text-warning-subtle-foreground border-transparent"
            )}
          >
            <p>{summary.disclaimer}</p>
          </aside>
        </div>
      )}
    </div>
  );
}

export { ProgressSummaryView };
