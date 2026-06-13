/**
 * OfferingBrowser
 *
 * Browses published offerings for a simulation's period+programs.
 * Fetches offerings for ALL scopeEntries in the simulation.
 * Each scopeEntry = { programId, journeyCode } — journeyCode filter applied to listOfferings.
 * Shows schedule options filtered by selectedJourneys; fires addSelection mutation on "Agregar".
 *
 * New (simulation-browser-ux):
 * - useCurriculumMap: fetches curriculum data and builds a per-course eligibility map.
 * - deriveEligibility: per-offering verdict (available / blocked / passed / unknown).
 * - Three-bucket layout: Disponibles / Bloqueadas / Ya cursadas.
 * - EligibilityBadge: student-facing status (icon + text, WCAG 2.2 AA, never color alone).
 * - OfferingFilterBar: AND-composed client-side filters (search, semester, credits, type,
 *   program, jornada). Dynamic semester options from curriculum data.
 * - Semester subgroups in Disponibles and Bloqueadas buckets.
 * - Jornada filter: narrows the fetch query, not client-side predicate.
 *
 * CRITICAL: scheduleOptionId passed to addSelection comes from data — NOT hardcoded.
 * 409 blocking errors surfaced to user with detail from problem+json.
 */

import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import type { ScheduleOption } from "@/api/generated/models/schedule-option";
import type { Offering } from "@/api/generated/models/offering";
import type { OfferingPage } from "@/api/generated/models/offering-page";
import type { SimulationScopeEntry } from "@/api/generated/models/simulation-scope-entry";
import { useAddSelection } from "@/features/simulation/hooks/use-add-selection";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";
import { weekdayEs } from "../lib/weekday-es";
import { useCurriculumMap } from "../hooks/use-curriculum-map";
import { deriveEligibility } from "../lib/eligibility";
import type { EligibilityVerdict } from "../lib/eligibility";
import { applyOfferingFilters, offeringFilterSchema } from "../lib/offering-filters";
import type { OfferingFilter, OfferingWithVerdict } from "../lib/offering-filters";
import { OfferingBucket } from "./offering-bucket";
import { OfferingFilterBar } from "./offering-filter-bar";

const offeringsApi = createApiInstance(OfferingsApi);
const OFFERINGS_PAGE_SIZE = 100;

interface OfferingBrowserProps {
  simulationId: string;
  periodId: string;
  scopeEntries: SimulationScopeEntry[];
  selectedOfferingIds?: string[];
}

interface CourseGroup {
  courseId: string;
  courseName: string;
  programId: string;
  verdict: EligibilityVerdict;
  offerings: Offering[];
}

async function fetchAllOfferingsForProgram(periodId: string, programId: string, journeyCodes: string[] = []): Promise<Offering[]> {
  const firstPage = await fetchOfferingsPage(periodId, programId, 0, journeyCodes);
  const offerings = [...firstPage.content];
  const totalPages = firstPage.totalPages;

  for (let page = 1; page < totalPages; page += 1) {
    const nextPage = await fetchOfferingsPage(periodId, programId, page, journeyCodes);
    offerings.push(...nextPage.content);
  }

  return offerings;
}

function fetchOfferingsPage(periodId: string, programId: string, page: number, journeyCodes: string[] = []): Promise<OfferingPage> {
  return offeringsApi
    .listOfferings({ periodId, programId, journeyCode: journeyCodes.length > 0 ? journeyCodes : undefined, page, size: OFFERINGS_PAGE_SIZE })
    .then((response) => response.data);
}

// ─── BlockedReasons — splits and renders hard/soft prerequisite chips ─────────

const SOFT_PREFIX = "[Recomendado] ";

function splitBlockedReasons(reasons: string[]): { hard: string[]; soft: string[] } {
  const hard: string[] = [];
  const soft: string[] = [];
  for (const reason of reasons) {
    if (reason.startsWith(SOFT_PREFIX)) {
      soft.push(reason.slice(SOFT_PREFIX.length));
    } else {
      hard.push(reason);
    }
  }
  return { hard, soft };
}

function BlockedReasons({ reasons }: { reasons: string[] }) {
  const { hard, soft } = splitBlockedReasons(reasons);

  return (
    <div className="mt-1 flex flex-col gap-1">
      {hard.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-warning-subtle-foreground">Te falta aprobar:</span>
          <div className="flex flex-wrap gap-1">
            {hard.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-warning-subtle text-warning-subtle-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
      {soft.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-muted-foreground">Recomendado antes:</span>
          <div className="flex flex-wrap gap-1">
            {soft.map((name) => (
              <span
                key={name}
                className="inline-flex items-center rounded px-1.5 py-0.5 text-xs bg-muted text-muted-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EligibilityBadge — WCAG 2.2 AA: color + text (never color alone) ──

const ELIGIBILITY_BADGE_CONFIG = {
  passed: {
    label: "Ya cursada",
    className: "bg-success-subtle text-success-subtle-foreground border-transparent",
  },
} as const;

function EligibilityBadge({ status }: { status: EligibilityVerdict["status"] }) {
  const config = ELIGIBILITY_BADGE_CONFIG[status as keyof typeof ELIGIBILITY_BADGE_CONFIG];
  if (!config) return null;

  return (
    <span
      aria-label={`Estado: ${config.label}`}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ─── ScheduleOptionRow ─────────────────────────────────────────────────────────

function ScheduleOptionRow({
  simulationId,
  option,
}: {
  simulationId: string;
  option: ScheduleOption;
}) {
  const [addError, setAddError] = useState<string | null>(null);
  const addSelectionMutation = useAddSelection();

  function handleAdd() {
    setAddError(null);
    addSelectionMutation.mutate(
      {
        simulationId,
        request: {
          // scheduleOptionId from real data — not hardcoded
          scheduleOptionId: option.id,
        },
      },
      {
        onError: (error: Error) => {
          const axiosError = error as AxiosError;
          const data = axiosError.response?.data as {
            detail?: string;
            code?: string;
            metadata?: Record<string, unknown>;
          } | undefined;
          const metadata = data?.metadata;
          // Route through mapper (never surfaces English detail)
          let msg = getApiErrorMessage(error, "Error al agregar la selección.");
          // Preserve conflictingCourseName enrichment from metadata
          if (metadata?.conflictingCourseName) {
            msg += ` (conflicto con ${metadata.conflictingCourseName})`;
          }
          setAddError(msg);
        },
      }
    );
  }

  return (
    <div className="ml-4 mb-2 p-2 border rounded bg-muted/10 border-border">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-medium text-foreground">{option.label}</span>
          <span className="text-xs text-muted-foreground">{option.journeyCode} · {option.weeklyHours}h/sem</span>
          <div className="text-xs text-muted-foreground">
            {option.sessions.map((s, idx) => (
              <span key={idx} className="mr-2">
                {weekdayEs(s.day)} {s.startsAt}–{s.endsAt}
              </span>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={addSelectionMutation.isPending}
          aria-label={`Agregar ${option.label}`}
          className={cn(
            "shrink-0 px-2.5 py-1 text-xs font-medium rounded border transition-colors",
            "bg-primary text-primary-foreground border-primary hover:opacity-90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {addSelectionMutation.isPending ? "Agregando..." : "Agregar"}
        </button>
      </div>

      {addError && (
        <div
          role="alert"
          className={cn(
            "mt-2 p-2 text-xs border rounded",
            // blocking error → destructive-subtle
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          <span aria-hidden="true" className="font-bold mr-1">✕</span>
          {addError}
        </div>
      )}
    </div>
  );
}

// ─── CourseRow ─────────────────────────────────────────────────────────────────

function CourseRow({ simulationId, group, selectedJourneys }: {
  simulationId: string;
  group: CourseGroup;
  selectedJourneys: Set<string>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPassed = group.verdict.status === "passed";

  // Fetch detail for ALL offerings in the group when expanded
  const detailResults = useQueries({
    queries: group.offerings.map((o) => ({
      queryKey: ["offering", o.id],
      queryFn: () => offeringsApi.getOffering({ offeringId: o.id }).then((r) => r.data),
      enabled: expanded,
    })),
  });

  // Combine all scheduleOptions from loaded details; dedupe by option.id; filter by selectedJourneys
  const allOptions: ScheduleOption[] = [];
  const seenOptionIds = new Set<string>();
  for (const result of detailResults) {
    const detail = result.data as (Offering & { scheduleOptions?: ScheduleOption[] }) | undefined;
    for (const option of (detail?.scheduleOptions ?? [])) {
      if (!seenOptionIds.has(option.id) && selectedJourneys.has(option.journeyCode)) {
        seenOptionIds.add(option.id);
        allOptions.push(option);
      }
    }
  }

  return (
    <li
      className={cn(
        "border rounded-none bg-card border-border",
        isPassed && "opacity-60"
      )}
    >
      <button
        type="button"
        aria-disabled={isPassed ? "true" : undefined}
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={group.courseName}
        className={cn(
          "w-full flex items-center justify-between gap-2 p-3 text-left",
          "hover:bg-muted/20 transition-colors"
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {group.courseName}
          </span>
          <EligibilityBadge status={group.verdict.status} />
          {group.verdict.status === "blocked" && group.verdict.reasons.length > 0 && (
            <BlockedReasons reasons={group.verdict.reasons} />
          )}
        </div>
        <span aria-hidden="true" className="text-muted-foreground text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && !isPassed && (
        <div className="border-t border-border pb-2">
          {allOptions.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3">
              Sin opciones de horario disponibles.
            </p>
          ) : (
            allOptions.map((option) => (
              <ScheduleOptionRow
                key={option.id}
                simulationId={simulationId}
                option={option}
              />
            ))
          )}
        </div>
      )}
    </li>
  );
}

// ─── OfferingBrowser (container) ──────────────────────────────────────────────

function OfferingBrowser({
  simulationId,
  periodId,
  scopeEntries,
  selectedOfferingIds = [],
}: OfferingBrowserProps) {
  // Filter state — defaults from Zod schema; React Compiler handles derivations
  const [filter, setFilter] = useState<OfferingFilter>(offeringFilterSchema.parse({}));

  // Build a map from programId → set of journey codes from scope entries
  const journeysByProgramScope = new Map<string, Set<string>>();
  for (const entry of scopeEntries) {
    const set = journeysByProgramScope.get(entry.programId) ?? new Set<string>();
    set.add(entry.journeyCode);
    journeysByProgramScope.set(entry.programId, set);
  }
  const programIds = [...journeysByProgramScope.keys()];

  // Distinct scope journeys for the jornada filter UI
  const scopeJourneys: string[] = [...new Set(scopeEntries.map((e) => e.journeyCode))].sort();

  // Apply jornada narrowing to fetch queries
  // When filter.jornada is set, intersect each program's journey set with {filter.jornada}
  const journeysByProgram = new Map<string, Set<string>>();
  for (const [programId, journeys] of journeysByProgramScope) {
    if (filter.jornada) {
      const narrowed = new Set<string>();
      if (journeys.has(filter.jornada)) narrowed.add(filter.jornada);
      journeysByProgram.set(programId, narrowed);
    } else {
      journeysByProgram.set(programId, journeys);
    }
  }

  // Fetch offerings for ALL programIds filtered by their respective (possibly narrowed) journey codes
  const results = useQueries({
    queries: programIds.map((programId) => {
      const journeyCodes = [...(journeysByProgram.get(programId) ?? [])].sort();
      return {
        queryKey: ["offerings", periodId, programId, journeyCodes, "all-pages"],
        queryFn: () => fetchAllOfferingsForProgram(periodId, programId, journeyCodes),
        enabled: !!periodId && journeyCodes.length > 0,
      };
    }),
  });

  // Curriculum map (eligibility data) — degrades gracefully on mismatch/error
  const { map: curriculumMap, programNames, isLoading: isCurriculumLoading, isDegraded } = useCurriculumMap(scopeEntries);

  const isLoading = results.some((r) => r.isLoading) || isCurriculumLoading;
  const isError = results.some((r) => r.isError);

  if (isLoading) {
    return (
      <div role="status" aria-live="polite" className="flex flex-col gap-2">
        <span className="sr-only">Cargando ofertas…</span>
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-none" />
        <Skeleton className="h-12 w-full rounded-none" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No se pudo cargar la lista de ofertas. Intentá nuevamente.
      </p>
    );
  }

  // Merge offerings from all programs; dedupe by offering id; exclude already-selected
  const selectedIds = new Set(selectedOfferingIds);
  const seen = new Set<string>();
  const offerings: Offering[] = [];
  for (const result of results) {
    for (const offering of (result.data ?? [])) {
      if (!seen.has(offering.id) && !selectedIds.has(offering.id)) {
        seen.add(offering.id);
        offerings.push(offering);
      }
    }
  }

  // Sort deterministically by courseName to eliminate query-arrival-order flakiness
  offerings.sort((a, b) => a.courseName.localeCompare(b.courseName, "es", { sensitivity: "base" }));

  if (offerings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay ofertas disponibles para agregar en este período y programa.
      </p>
    );
  }

  // Derive verdict for each offering (pure, React Compiler-safe)
  const itemsWithVerdicts: OfferingWithVerdict[] = offerings.map((offering) => ({
    offering,
    verdict: deriveEligibility(offering.courseId, curriculumMap),
  }));

  // Compute dynamic semester options from the FULL curriculum (all semesters in malla,
  // not just those with current-period offerings). This ensures semester 12 appears
  // even when no offering exists for it this period.
  const availableSemesters: number[] = [...new Set(
    [...curriculumMap.values()]
      .map((e) => e.recommendedSemester)
      .filter((s): s is number => s !== undefined)
  )].sort((a, b) => a - b);

  // Build program options for the filter bar
  const programs: { id: string; name: string }[] = programIds.map((id) => ({
    id,
    name: programNames.get(id) ?? id,
  }));

  // Apply filter (pure AND composition; jornada is not applied client-side)
  const visibleItems = applyOfferingFilters(itemsWithVerdicts, filter);

  // Compute totalCount as number of unique courses in ALL itemsWithVerdicts (not filtered)
  const totalCourseGroupMap = new Map<string, true>();
  for (const item of itemsWithVerdicts) {
    totalCourseGroupMap.set(item.offering.courseId, true);
  }
  const totalCount = totalCourseGroupMap.size;

  // Group visibleItems by courseId
  const courseGroupMap = new Map<string, CourseGroup>();
  for (const item of visibleItems) {
    const existing = courseGroupMap.get(item.offering.courseId);
    if (existing) {
      existing.offerings.push(item.offering);
    } else {
      courseGroupMap.set(item.offering.courseId, {
        courseId: item.offering.courseId,
        courseName: item.offering.courseName,
        programId: item.offering.programId,
        verdict: item.verdict,
        offerings: [item.offering],
      });
    }
  }
  // Preserve courseName sort (already sorted before filtering)
  const courseGroups: CourseGroup[] = [...courseGroupMap.values()];

  // Partition courseGroups into three buckets
  const availableGroups = courseGroups.filter(
    (g) => g.verdict.status === "available" || g.verdict.status === "unknown"
  );
  const blockedGroups = courseGroups.filter((g) => g.verdict.status === "blocked");
  const passedGroups = courseGroups.filter((g) => g.verdict.status === "passed");

  function renderCourseGroup(group: CourseGroup) {
    return (
      <CourseRow
        key={group.courseId}
        simulationId={simulationId}
        group={group}
        selectedJourneys={journeysByProgram.get(group.programId) ?? new Set()}
      />
    );
  }

  function handleClear() {
    setFilter(offeringFilterSchema.parse({}));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <OfferingFilterBar
        filter={filter}
        onChange={(partial) => setFilter((prev) => ({ ...prev, ...partial }))}
        onClear={handleClear}
        totalCount={totalCount}
        visibleCount={courseGroups.length}
        availableSemesters={availableSemesters}
        programs={programs}
        journeys={scopeJourneys}
      />

      {/* Degradation notice — non-blocking, shown only when eligibility data is partial */}
      {isDegraded && !isLoading && (
        <p role="status" className="text-xs text-muted-foreground px-1">
          No pudimos verificar tu elegibilidad para algunas materias. Podés agregarlas igual; el sistema valida al confirmar.
        </p>
      )}

      {/* Empty state when filters yield zero results */}
      {courseGroups.length === 0 && (
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground py-4 text-center"
        >
          No hay materias que coincidan con los filtros aplicados.
        </p>
      )}

      {/* Bucket 1: Disponibles (available + unknown) — grouped by semester */}
      <OfferingBucket
        titleId="bucket-available-heading"
        title="Disponibles"
        tone="available"
        offerings={availableGroups}
        renderOffering={renderCourseGroup}
        groupBySemester
      />

      {/* Bucket 2: Bloqueadas (advisory, add still enabled) — grouped by semester */}
      <OfferingBucket
        titleId="bucket-blocked-heading"
        title="Bloqueadas"
        tone="blocked"
        offerings={blockedGroups}
        renderOffering={renderCourseGroup}
        groupBySemester
      />

      {/* Bucket 3: Ya cursadas (passed, add disabled, always last) — flat */}
      <OfferingBucket
        titleId="bucket-passed-heading"
        title="Ya cursadas"
        tone="passed"
        offerings={passedGroups}
        renderOffering={renderCourseGroup}
      />
    </div>
  );
}

export { OfferingBrowser };
