/**
 * OfferingBrowser — FE-002, FE-003
 *
 * Browses published offerings for a simulation's period+programs.
 * Fetches offerings for ALL programIds in the simulation (spec FE-002).
 * Shows schedule options; fires addSelection mutation on "Agregar".
 *
 * CRITICAL: scheduleOptionId passed to addSelection comes from data — NOT hardcoded.
 * 409 blocking errors surfaced to user with detail from problem+json.
 */

import { useState } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { OfferingsApi } from "@/api/generated/api/offerings-api";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import type { ScheduleOption } from "@/api/generated/models/schedule-option";
import type { Offering } from "@/api/generated/models/offering";
import type { OfferingPage } from "@/api/generated/models/offering-page";
import { useAddSelection } from "@/features/simulation/hooks/use-add-selection";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const offeringsApi = createApiInstance(OfferingsApi);
const OFFERINGS_PAGE_SIZE = 100;
const UNKNOWN_SEMESTER = Number.MAX_SAFE_INTEGER;

interface OfferingBrowserProps {
  simulationId: string;
  periodId: string;
  programIds: string[];
  selectedOfferingIds?: string[];
}

interface OfferingRowProps {
  simulationId: string;
  offering: Offering;
}

interface OfferingWithSemester extends Offering {
  recommendedSemester?: number | null;
}

interface SemesterGroup {
  semester: number | null;
  offerings: OfferingWithSemester[];
}

async function fetchAllOfferingsForProgram(periodId: string, programId: string): Promise<Offering[]> {
  const firstPage = await fetchOfferingsPage(periodId, programId, 0);
  const offerings = [...firstPage.content];
  const totalPages = firstPage.totalPages;

  for (let page = 1; page < totalPages; page += 1) {
    const nextPage = await fetchOfferingsPage(periodId, programId, page);
    offerings.push(...nextPage.content);
  }

  return offerings;
}

function fetchOfferingsPage(periodId: string, programId: string, page: number): Promise<OfferingPage> {
  return offeringsApi
    .listOfferings({ periodId, programId, page, size: OFFERINGS_PAGE_SIZE })
    .then((response) => response.data);
}

function getOfferingSemester(offering: OfferingWithSemester): number | null {
  if (typeof offering.recommendedSemester === "number") {
    return offering.recommendedSemester;
  }

  const notes = offering.notes ?? "";
  const levelMatch = /(?:source\s+)?level\s+(\d+)/i.exec(notes);
  if (!levelMatch?.[1]) return null;

  return Number.parseInt(levelMatch[1], 10);
}

function groupOfferingsBySemester(offerings: Offering[]): SemesterGroup[] {
  const groups = new Map<number | null, OfferingWithSemester[]>();

  for (const offering of offerings) {
    const semester = getOfferingSemester(offering as OfferingWithSemester);
    const current = groups.get(semester) ?? [];
    current.push(offering as OfferingWithSemester);
    groups.set(semester, current);
  }

  return Array.from(groups.entries())
    .map(([semester, groupOfferings]) => ({
      semester,
      offerings: groupOfferings.sort(compareOfferings),
    }))
    .sort((a, b) => semesterSortValue(a.semester) - semesterSortValue(b.semester));
}

function compareOfferings(a: OfferingWithSemester, b: OfferingWithSemester): number {
  return a.courseName.localeCompare(b.courseName, "es", { sensitivity: "base" });
}

function semesterSortValue(semester: number | null): number {
  return semester ?? UNKNOWN_SEMESTER;
}

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
          const detail = data?.detail ?? "Error al agregar la selección.";
          const metadata = data?.metadata;
          let msg = detail;
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
                {s.day?.slice(0, 3)} {s.startsAt}–{s.endsAt}
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
            // §2.4: blocking error → destructive-subtle
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

function OfferingRow({ simulationId, offering }: OfferingRowProps) {
  const [expanded, setExpanded] = useState(false);

  const { data: detail } = useQuery({
    queryKey: ["offering", offering.id],
    queryFn: () =>
      offeringsApi.getOffering({ offeringId: offering.id }).then((r) => r.data),
    enabled: expanded,
  });

  // §6.4/§5.1: content tile → rounded-none
  return (
    <li className="border rounded-none bg-card border-border">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
        aria-label={offering.courseName}
        className={cn(
          "w-full flex items-center justify-between gap-2 p-3 text-left",
          "hover:bg-muted/20 transition-colors"
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">
            {offering.courseName}
          </span>
          <span className="text-xs text-muted-foreground">{offering.status}</span>
        </div>
        <span aria-hidden="true" className="text-muted-foreground text-xs">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && detail && (
        <div className="border-t border-border pb-2">
          {(detail as Offering & { scheduleOptions?: ScheduleOption[] }).scheduleOptions?.map((option) => (
            <ScheduleOptionRow
              key={option.id}
              simulationId={simulationId}
              option={option}
            />
          ))}
          {(!((detail as Offering & { scheduleOptions?: ScheduleOption[] }).scheduleOptions?.length)) && (
            <p className="text-xs text-muted-foreground p-3">
              Sin opciones de horario disponibles.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

function OfferingBrowser({
  simulationId,
  periodId,
  programIds,
  selectedOfferingIds = [],
}: OfferingBrowserProps) {
  // Fetch offerings for ALL programIds (spec FE-002 — plural programs supported)
  const results = useQueries({
    queries: programIds.map((programId) => ({
      queryKey: ["offerings", periodId, programId, "all-pages"],
      queryFn: () => fetchAllOfferingsForProgram(periodId, programId),
      enabled: !!periodId,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
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

  // Merge offerings from all programs; dedupe by offering id
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

  if (offerings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay ofertas disponibles para agregar en este período y programa.
      </p>
    );
  }

  const semesterGroups = groupOfferingsBySemester(offerings);

  return (
    <div className="flex flex-col gap-4">
      {semesterGroups.map((group) => (
        <section key={group.semester ?? "unknown"} aria-labelledby={`semester-${group.semester ?? "unknown"}-heading`}>
          <h3
            id={`semester-${group.semester ?? "unknown"}-heading`}
            className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide"
          >
            {group.semester ? `Semestre ${group.semester}` : "Semestre no definido"}
          </h3>
          <ul className="flex flex-col gap-2">
            {group.offerings.map((offering) => (
              <OfferingRow
                key={offering.id}
                simulationId={simulationId}
                offering={offering}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export { OfferingBrowser };
