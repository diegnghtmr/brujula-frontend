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
import { useAddSelection } from "@/features/simulation/hooks/use-add-selection";
import { cn } from "@/lib/utils";

const offeringsApi = createApiInstance(OfferingsApi);

interface OfferingBrowserProps {
  simulationId: string;
  periodId: string;
  programIds: string[];
}

interface OfferingRowProps {
  simulationId: string;
  offering: Offering;
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
        onError: (error: AxiosError) => {
          const data = error.response?.data as {
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
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
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

  return (
    <li className="border rounded bg-card border-border">
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

function OfferingBrowser({ simulationId, periodId, programIds }: OfferingBrowserProps) {
  // Fetch offerings for ALL programIds (spec FE-002 — plural programs supported)
  const results = useQueries({
    queries: programIds.map((programId) => ({
      queryKey: ["offerings", periodId, programId],
      queryFn: () =>
        offeringsApi
          .listOfferings({ periodId, programId })
          .then((r) => r.data),
      enabled: !!periodId,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8" role="status">
        <span className="sr-only">Cargando ofertas...</span>
        <div
          className={cn(
            "w-5 h-5 border-4 rounded-full motion-safe:animate-spin",
            "border-muted border-t-primary"
          )}
          aria-hidden="true"
        />
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
  const seen = new Set<string>();
  const offerings: Offering[] = [];
  for (const result of results) {
    for (const offering of (result.data?.content ?? [])) {
      if (!seen.has(offering.id)) {
        seen.add(offering.id);
        offerings.push(offering);
      }
    }
  }

  if (offerings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No hay ofertas publicadas para este período y programa.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {offerings.map((offering) => (
        <OfferingRow
          key={offering.id}
          simulationId={simulationId}
          offering={offering}
        />
      ))}
    </ul>
  );
}

export { OfferingBrowser };
