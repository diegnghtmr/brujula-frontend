/**
 * MallaView — curricular grid view for a study plan (CUR-008).
 * Route: /curriculum/plans/:planId/malla
 *
 * Design contract:
 * - Fetches GET /plans/{planId}/malla?journeyCode={journeyCode}.
 * - Renders semesters as horizontal scroll columns.
 * - Journey selector toggles between DIURNA/NOCTURNA (re-fetches malla).
 * - Fetches plan metadata to discover available journeys.
 * - graduationRequirements advisory text rendered at the bottom.
 * - WCAG 2.2 AA: confidence badges use color + icon + text label.
 * - READ-ONLY — no simulator enforcement in Fase 2.
 */

import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CurriculumApi } from "@/api/generated/api/curriculum-api";
import { CatalogApi } from "@/api/generated/api/catalog-api";
import { createApiInstance } from "@/api/client";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { SemesterColumn } from "./semester-column";
import { cn } from "@/lib/utils";

const curriculumApi = createApiInstance(CurriculumApi);
const catalogApi = createApiInstance(CatalogApi);

/** Default journey code when plan has no journey info yet. */
const DEFAULT_JOURNEY = "DIURNA";

/** Journey codes accepted by the backend and rendered by this component. */
const VALID_JOURNEY_CODES = new Set(["DIURNA", "NOCTURNA"]);

function MallaView() {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();

  // Initialize from ?journeyCode= query param; fall back to DEFAULT_JOURNEY when
  // the param is absent or contains an unrecognised value.
  const initialJourney = (() => {
    const param = searchParams.get("journeyCode");
    return param && VALID_JOURNEY_CODES.has(param) ? param : DEFAULT_JOURNEY;
  })();

  const [selectedJourney, setSelectedJourney] = useState(initialJourney);

  // Fetch plan metadata to discover available journeys
  const { data: plan } = useQuery({
    queryKey: ["plans", planId],
    queryFn: () =>
      catalogApi.getStudyPlan({ planId: planId! }).then((r) => r.data),
    enabled: !!planId,
  });

  const availableJourneys = plan?.applicableJourneys ?? [];

  // Fetch malla for the selected journey
  const {
    data: malla,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["plans", planId, "malla", selectedJourney],
    queryFn: () =>
      curriculumApi
        .getPlanMalla({ planId: planId!, journeyCode: selectedJourney })
        .then((r) => r.data),
    enabled: !!planId,
  });

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* BackLink — navigate(-1) because malla can be reached from multiple parents */}
      <BackLink />
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Malla curricular
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vista de materias por semestre del plan de estudios.
          </p>
        </div>

        {/* Journey selector */}
        {availableJourneys.length > 1 && (
          <nav aria-label="Selector de jornada" className="flex gap-2">
            {availableJourneys.map((journey) => (
              <button
                key={journey.code}
                onClick={() => setSelectedJourney(journey.code)}
                aria-pressed={selectedJourney === journey.code}
                aria-label={journey.name}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium border rounded transition-colors",
                  selectedJourney === journey.code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {journey.name}
              </button>
            ))}
          </nav>
        )}

        {/* Single journey: show as static label, still offer toggle if no plan loaded yet */}
        {availableJourneys.length === 0 && (
          <div className="flex gap-2">
            {["DIURNA", "NOCTURNA"].map((code) => (
              <button
                key={code}
                onClick={() => setSelectedJourney(code)}
                aria-pressed={selectedJourney === code}
                aria-label={code === "DIURNA" ? "Diurna" : "Nocturna"}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium border rounded transition-colors",
                  selectedJourney === code
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:bg-muted/40"
                )}
              >
                {code === "DIURNA" ? "Diurna" : "Nocturna"}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Malla grid */}
      {isLoading ? (
        <div role="status" aria-live="polite" className="flex gap-4 overflow-x-auto pb-4">
          <span className="sr-only">Cargando malla curricular…</span>
          {/* Simulate semester columns */}
          <Skeleton className="h-96 w-48 shrink-0 rounded-none" />
          <Skeleton className="h-96 w-48 shrink-0 rounded-none" />
          <Skeleton className="h-96 w-48 shrink-0 rounded-none" />
          <Skeleton className="h-96 w-48 shrink-0 rounded-none" />
          <Skeleton className="h-96 w-48 shrink-0 rounded-none" />
        </div>
      ) : isError || !malla ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No se pudo cargar la malla curricular. Intentá nuevamente.
        </p>
      ) : (
        <>
          {/* Semester columns — horizontal scroll */}
          <section
            aria-label="Semestres del plan"
            className="flex gap-4 overflow-x-auto pb-4"
          >
            {malla.semesterBuckets.map((bucket) => (
              <SemesterColumn
                key={bucket.recommendedSemester}
                bucket={bucket}
              />
            ))}
          </section>

          {/* Graduation requirements advisory */}
          {malla.graduationRequirements && (
            <aside
              aria-label="Requisitos de grado (orientativo)"
              className={cn(
                "p-4 border border-border bg-muted/30 rounded",
                "text-sm text-muted-foreground"
              )}
            >
              <h2 className="text-sm font-semibold text-foreground mb-1">
                Requisitos de grado (orientativo)
              </h2>
              <p>{malla.graduationRequirements}</p>
            </aside>
          )}
        </>
      )}
    </div>
  );
}

export { MallaView };
