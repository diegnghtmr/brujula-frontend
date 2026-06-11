/**
 * SimulationDetailPage — FE-003..007, SIM-003
 *
 * Route: /simulations/:simulationId
 *
 * Assembles:
 * - OutdatedBanner (STALE-001/STALE-002)
 * - WeeklyScheduleGrid (DET-001)
 * - CreditSummaryPanel (DET-002)
 * - ValidationNoticeList (DET-003/FE-006)
 * - OfferingBrowser (FE-002/FE-003)
 * - Selections list with remove
 */

import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulationDetail } from "@/features/simulation/hooks/use-simulation-detail";
import { useRemoveSelection } from "@/features/simulation/hooks/use-remove-selection";
import { BackLink } from "@/components/layout/back-link";
import { SimulationStatusBadge } from "./simulation-status-badge";
import { OutdatedBanner } from "./outdated-banner";
import { WeeklyScheduleGrid } from "./weekly-schedule-grid";
import { CreditSummaryPanel } from "./credit-summary-panel";
import { ValidationNoticeList } from "./validation-notice-list";
import { OfferingBrowser } from "./offering-browser";
import { SelectionRow } from "./selection-row";
import { cn } from "@/lib/utils";
import type { Simulation } from "@/api/generated/models/simulation";
import type { SimulationSelection } from "@/api/generated/models/simulation-selection";
import type { ProgramCreditSummary } from "@/api/generated/models/program-credit-summary";
import type { WeeklyScheduleEntry } from "@/api/generated/models/weekly-schedule-entry";
import type { SimulationValidation } from "@/api/generated/models/simulation-validation";

// SimulationDetail is typed as Simulation in the generated client,
// but our API extends it with extra fields
interface SimulationDetailExtended extends Simulation {
  selections?: SimulationSelection[];
  creditSummary?: ProgramCreditSummary[];
  weeklySchedule?: WeeklyScheduleEntry[];
  totalWeeklyHours?: number;
  validation?: SimulationValidation;
}

function SimulationDetailPage() {
  const { simulationId } = useParams<{ simulationId: string }>();
  const queryClient = useQueryClient();

  const {
    data: simulation,
    isLoading,
    isError,
  } = useSimulationDetail(simulationId ?? null);

  const removeSelectionMutation = useRemoveSelection();

  function handleReviewSuccess() {
    queryClient.invalidateQueries({ queryKey: ["simulation", simulationId] });
  }

  function handleRemoveSelection(selectionId: string) {
    if (!simulationId) return;
    removeSelectionMutation.mutate({ simulationId, selectionId });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <span className="sr-only">Cargando simulación...</span>
        <div
          className={cn(
            "w-6 h-6 border-4 rounded-full motion-safe:animate-spin",
            "border-muted border-t-primary"
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  if (isError || !simulation) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-sm text-muted-foreground py-8 text-center">
          No se pudo cargar la simulación. Intentá nuevamente.
        </p>
      </div>
    );
  }

  const detail = simulation as SimulationDetailExtended;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <BackLink to="/simulations" />
        <div className="mt-2 flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground font-display">
                {detail.name}
              </h1>
              <SimulationStatusBadge status={detail.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {detail.periodName}
            </p>
          </div>
        </div>
      </header>

      {/* OUTDATED banner — FE-007 */}
      {detail.status === "OUTDATED" && simulationId && (
        <div className="mb-6">
          <OutdatedBanner
            simulationId={simulationId}
            status={detail.status}
            onReviewSuccess={handleReviewSuccess}
          />
        </div>
      )}

      {/* Validation notices — FE-006 */}
      {detail.validation && (
        <div className="mb-6">
          <ValidationNoticeList validation={detail.validation} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: schedule + selections */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Weekly schedule grid — FE-004 */}
          <section aria-labelledby="schedule-heading">
            <h2 id="schedule-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
              Horario semanal
            </h2>
            <WeeklyScheduleGrid entries={detail.weeklySchedule ?? []} />
          </section>

          {/* Selections list */}
          {detail.selections && detail.selections.length > 0 && (
            <section aria-labelledby="selections-heading">
              <h2 id="selections-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Materias seleccionadas
              </h2>
              <ul className="flex flex-col gap-2">
                {detail.selections.map((sel) => (
                  <SelectionRow
                    key={sel.id}
                    simulationId={simulationId!}
                    selection={sel}
                    onRemove={handleRemoveSelection}
                    isRemoving={removeSelectionMutation.isPending}
                  />
                ))}
              </ul>
            </section>
          )}

          {/* Offering browser — FE-002 */}
          <section aria-labelledby="offerings-heading">
            <h2 id="offerings-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
              Explorar ofertas
            </h2>
            <OfferingBrowser
              simulationId={simulationId!}
              periodId={detail.periodId}
              programIds={detail.programIds}
            />
          </section>
        </div>

        {/* Right column: credit summary */}
        <div className="flex flex-col gap-6">
          {/* Credit summary — FE-005 */}
          {detail.creditSummary && detail.creditSummary.length > 0 && (
            <section aria-labelledby="credits-heading">
              <h2 id="credits-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
                Resumen de créditos
              </h2>
              <CreditSummaryPanel summaries={detail.creditSummary} />
            </section>
          )}

          {detail.totalWeeklyHours !== undefined && detail.totalWeeklyHours > 0 && (
            <div className="p-3 rounded border bg-muted/10 border-border">
              <span className="text-xs text-muted-foreground">Total horas semanales</span>
              <div className="text-lg font-bold text-foreground">{detail.totalWeeklyHours}h</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export { SimulationDetailPage };
