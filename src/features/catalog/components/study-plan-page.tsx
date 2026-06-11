/**
 * StudyPlanPage — view for a single study plan (CAT-002/CAT-003).
 * Route: /catalog/plans/:planId
 *
 * Design contract:
 * - Fetches GET /plans/{planId} and renders plan name, totalCredits, status, journeys.
 * - The API already filters DRAFT plans for STUDENT role — this view renders what it gets.
 * - JourneyBadge handles individual journey display.
 * - WCAG 2.2 AA: status displayed with color + icon + label.
 */

import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CatalogApi } from "@/api/generated/api/catalog-api";
import { createApiInstance } from "@/api/client";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { JourneyBadge } from "./journey-badge";

const catalogApi = createApiInstance(CatalogApi);

const PLAN_STATUS_CONFIG = {
  ACTIVE: {
    label: "Activo",
    icon: "●",
    // §8 / FIX 2: icon carries the semantic color; label uses text-foreground (≥4.5:1)
    iconClassName: "text-success",
    labelClassName: "text-foreground",
  },
  DRAFT: {
    label: "Borrador",
    icon: "◑",
    // §8 / FIX 2: icon carries the semantic color; label uses text-foreground (≥4.5:1)
    iconClassName: "text-warning",
    labelClassName: "text-foreground",
  },
  ARCHIVED: {
    label: "Archivado",
    icon: "◌",
    iconClassName: "text-muted-foreground",
    labelClassName: "text-muted-foreground",
  },
} as const;

type PlanStatusKey = keyof typeof PLAN_STATUS_CONFIG;

function getStatusConfig(status: string) {
  return (
    PLAN_STATUS_CONFIG[status as PlanStatusKey] ?? PLAN_STATUS_CONFIG["DRAFT"]
  );
}

function StudyPlanPage() {
  const { planId } = useParams<{ planId: string }>();

  const { data: plan, isLoading, isError } = useQuery({
    queryKey: ["plans", planId],
    queryFn: () =>
      catalogApi
        .getStudyPlan({ planId: planId! })
        .then((r) => r.data),
    enabled: !!planId,
  });

  const statusConf = plan ? getStatusConfig(plan.status) : null;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BackLink to="/catalog/programs" />

      {isLoading && (
        <div role="status" aria-live="polite" className="mt-2 flex flex-col gap-3">
          <span className="sr-only">Cargando plan de estudios…</span>
          {/* Header: title bar + status badge */}
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          {/* Journey badges row */}
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      )}

      {(isError || (!isLoading && !plan)) && (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Plan no encontrado o no disponible.
        </p>
      )}

      {plan && statusConf && (
        <>
          <header className="mb-6 mt-2">
            {/* Plan name */}
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold text-foreground font-display leading-tight">
                {plan.name}
              </h1>
              {/* Status: color on icon only; label uses text-foreground for WCAG AA contrast */}
              <span
                className="inline-flex items-center gap-1 text-xs font-medium shrink-0 mt-1"
                aria-label={`Estado: ${statusConf.label}`}
              >
                <span aria-hidden="true" className={statusConf.iconClassName}>{statusConf.icon}</span>
                <span className={statusConf.labelClassName}>{statusConf.label}</span>
              </span>
            </div>

            {/* Credits */}
            <p className="text-sm text-muted-foreground mt-2">
              <span className="font-medium text-foreground">{plan.totalCredits}</span>
              {" créditos totales"}
              {plan.referenceYear && ` · Año de referencia: ${plan.referenceYear}`}
            </p>
          </header>

          {/* Journeys section */}
          {plan.applicableJourneys && plan.applicableJourneys.length > 0 && (
            <section aria-label="Jornadas del plan" className="mb-6">
              <h2 className="text-sm font-semibold text-foreground mb-2">
                Jornadas disponibles
              </h2>
              <div className="flex flex-wrap gap-2">
                {plan.applicableJourneys.map((journey) => (
                  <JourneyBadge key={journey.code} journey={journey} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export { StudyPlanPage };
