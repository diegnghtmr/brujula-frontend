/**
 * SimulationDetailPage
 *
 * Route: /simulations/:simulationId
 *
 * Assembles:
 * - OutdatedBanner
 * - WeeklyScheduleGrid
 * - CreditSummaryPanel
 * - ValidationNoticeList
 * - OfferingBrowser
 * - Selections list grouped by semester (ascending), sorted by courseName within each group
 */

import { useParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulationDetail } from "@/features/simulation/hooks/use-simulation-detail";
import { useRemoveSelection } from "@/features/simulation/hooks/use-remove-selection";
import { useCurriculumMap } from "@/features/simulation/hooks/use-curriculum-map";
import { BackLink } from "@/components/layout/back-link";
import { SimulationStatusBadge } from "./simulation-status-badge";
import { OutdatedBanner } from "./outdated-banner";
import { WeeklyScheduleGrid } from "./weekly-schedule-grid";
import { CreditSummaryPanel } from "./credit-summary-panel";
import { ValidationNoticeList } from "./validation-notice-list";
import { OfferingBrowser } from "./offering-browser";
import { SelectionRow } from "./selection-row";
import { Skeleton } from "@/components/ui/skeleton";
import type { Simulation } from "@/api/generated/models/simulation";
import type { SimulationSelection } from "@/api/generated/models/simulation-selection";
import type { ProgramCreditSummary } from "@/api/generated/models/program-credit-summary";
import type { WeeklyScheduleEntry } from "@/api/generated/models/weekly-schedule-entry";
import type { SimulationValidation } from "@/api/generated/models/simulation-validation";
import type { SimulationScopeEntry } from "@/api/generated/models/simulation-scope-entry";
// SimulationScopeEntry is used as the type for scopeEntries in SelectionsWithCurriculumProps

// SimulationDetail is typed as Simulation in the generated client,
// but our API extends it with extra fields
interface SimulationDetailExtended extends Simulation {
  selections?: SimulationSelection[];
  creditSummary?: ProgramCreditSummary[];
  weeklySchedule?: WeeklyScheduleEntry[];
  totalWeeklyHours?: number;
  validation?: SimulationValidation;
}

// ─── Selections grouped by semester ──────────────────────────────────────────

interface SelectionGroup {
  semester: number | null;
  label: string;
  selections: SimulationSelection[];
}

function groupSelectionsBySemester(
  selections: SimulationSelection[],
  semesterMap: Map<string, number>
): SelectionGroup[] {
  const groupMap = new Map<number | null, SimulationSelection[]>();

  for (const sel of selections) {
    const sem = semesterMap.get(sel.courseId) ?? null;
    const existing = groupMap.get(sem) ?? [];
    existing.push(sel);
    groupMap.set(sem, existing);
  }

  // Sort within each group by courseName
  for (const group of groupMap.values()) {
    group.sort((a, b) =>
      a.courseName.localeCompare(b.courseName, "es", { sensitivity: "base" })
    );
  }

  // Sort groups: numbered semesters ascending, null last
  const sortedKeys = [...groupMap.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  return sortedKeys.map((sem) => ({
    semester: sem,
    label: sem !== null ? `Semestre ${sem}` : "Otras",
    selections: groupMap.get(sem)!,
  }));
}

// ─── Page component ──────────────────────────────────────────────────────────

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
      <div className="p-6 max-w-6xl mx-auto" role="status" aria-live="polite">
        <span className="sr-only">Cargando simulación…</span>
        {/* Header skeleton */}
        <div className="mb-6 flex flex-col gap-2">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        {/* Full-width schedule + stacked content skeleton */}
        <div className="flex flex-col gap-6">
          <Skeleton className="h-96 w-full rounded-none" />
          <Skeleton className="h-28 w-full rounded-none" />
          <Skeleton className="h-48 w-full rounded-none" />
        </div>
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
  const scopeEntries: SimulationScopeEntry[] = (simulation as { scopeEntries?: SimulationScopeEntry[] }).scopeEntries ?? [];
  const selections = detail.selections ?? [];

  return (
    <SelectionsWithCurriculum
      simulationId={simulationId!}
      detail={detail}
      scopeEntries={scopeEntries}
      selections={selections}
      onReviewSuccess={handleReviewSuccess}
      onRemoveSelection={handleRemoveSelection}
      isRemoving={removeSelectionMutation.isPending}
    />
  );
}

// ─── Inner component — uses useCurriculumMap (hooks must not be conditional) ──

interface SelectionsWithCurriculumProps {
  simulationId: string;
  detail: SimulationDetailExtended;
  scopeEntries: SimulationScopeEntry[];
  selections: SimulationSelection[];
  onReviewSuccess: () => void;
  onRemoveSelection: (selectionId: string) => void;
  isRemoving: boolean;
}

function SelectionsWithCurriculum({
  simulationId,
  detail,
  scopeEntries,
  selections,
  onReviewSuccess,
  onRemoveSelection,
  isRemoving,
}: SelectionsWithCurriculumProps) {
  // React Query deduplicates — same query key as OfferingBrowser's useCurriculumMap call.
  // This is cheap: hits the existing cache if OfferingBrowser already fetched it.
  const { map: curriculumMap } = useCurriculumMap(scopeEntries);

  // Build courseId → recommendedSemester lookup from the curriculum map
  const semesterMap = new Map<string, number>();
  for (const [courseId, entry] of curriculumMap) {
    semesterMap.set(courseId, entry.recommendedSemester);
  }

  const selectionGroups = selections.length > 0
    ? groupSelectionsBySemester(selections, semesterMap)
    : [];

  return (
    <div className="p-6 max-w-6xl mx-auto">
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

      {/* OUTDATED banner */}
      {detail.status === "OUTDATED" && simulationId && (
        <div className="mb-6">
          <OutdatedBanner
            simulationId={simulationId}
            status={detail.status}
            onReviewSuccess={onReviewSuccess}
          />
        </div>
      )}

      {/* Validation notices */}
      {detail.validation && (
        <div className="mb-6">
          <ValidationNoticeList validation={detail.validation} />
        </div>
      )}

      {/* Weekly schedule — full width (moved out of the sidebar grid so it uses the whole width) */}
      <section aria-labelledby="schedule-heading" className="mb-6">
        <h2 id="schedule-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
          Horario semanal
        </h2>
        <WeeklyScheduleGrid entries={detail.weeklySchedule ?? []} />
      </section>

      {/* Credit summary + weekly hours — moved below the schedule */}
      {((detail.creditSummary && detail.creditSummary.length > 0) ||
        (detail.totalWeeklyHours !== undefined && detail.totalWeeklyHours > 0)) && (
        <section aria-labelledby="credits-heading" className="mb-6">
          <h2 id="credits-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
            Resumen de créditos
          </h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            {detail.creditSummary && detail.creditSummary.length > 0 && (
              <div className="flex-1">
                <CreditSummaryPanel summaries={detail.creditSummary} />
              </div>
            )}
            {detail.totalWeeklyHours !== undefined && detail.totalWeeklyHours > 0 && (
              <div className="p-3 rounded border bg-muted/10 border-border sm:w-56 sm:shrink-0">
                <span className="text-xs text-muted-foreground">Total horas semanales</span>
                <div className="text-lg font-bold text-foreground">{detail.totalWeeklyHours}h</div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Selections list — grouped by semester */}
      {selectionGroups.length > 0 && (
        <section aria-labelledby="selections-heading" className="mb-6">
          <h2 id="selections-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
            Materias seleccionadas
          </h2>
          <div className="flex flex-col gap-3">
            {selectionGroups.map((group) => (
              <div key={group.semester ?? "otras"}>
                <h3 className="text-xs font-medium text-muted-foreground mb-1 px-1">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-2">
                  {group.selections.map((sel) => (
                    <SelectionRow
                      key={sel.id}
                      simulationId={simulationId}
                      selection={sel}
                      onRemove={onRemoveSelection}
                      isRemoving={isRemoving}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Offering browser */}
      <section aria-labelledby="offerings-heading">
        <h2 id="offerings-heading" className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
          Explorar ofertas
        </h2>
        <OfferingBrowser
          simulationId={simulationId}
          periodId={detail.periodId}
          scopeEntries={scopeEntries}
          selectedOfferingIds={selections.map((selection) => selection.offeringId)}
        />
      </section>
    </div>
  );
}

export { SimulationDetailPage };
