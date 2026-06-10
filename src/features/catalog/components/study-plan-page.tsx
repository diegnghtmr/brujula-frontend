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
import { JourneyBadge } from "./journey-badge";
import { cn } from "@/lib/utils";

const catalogApi = createApiInstance(CatalogApi);

const PLAN_STATUS_CONFIG = {
  ACTIVE: {
    label: "Activo",
    icon: "●",
    // text-green-800 (#166534) gives ~5.4:1 against near-white — WCAG AA ✓
    // (text-green-600 was #00a63e at 3.13:1 — insufficient)
    className: "text-green-800 dark:text-green-400",
  },
  DRAFT: {
    label: "Borrador",
    icon: "◑",
    className: "text-yellow-600 dark:text-yellow-400",
  },
  ARCHIVED: {
    label: "Archivado",
    icon: "◌",
    className: "text-muted-foreground",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16" role="status">
        <span className="sr-only">Cargando plan de estudios...</span>
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

  if (isError || !plan) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <p className="text-sm text-muted-foreground py-8 text-center">
          Plan no encontrado o no disponible.
        </p>
      </div>
    );
  }

  const statusConf = getStatusConfig(plan.status);

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <header className="mb-6">
        {/* Plan name */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground font-display leading-tight">
            {plan.name}
          </h1>
          {/* Status: color + icon + label (WCAG AA) */}
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium shrink-0 mt-1",
              statusConf.className
            )}
            aria-label={`Estado: ${statusConf.label}`}
          >
            <span aria-hidden="true">{statusConf.icon}</span>
            {statusConf.label}
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
    </div>
  );
}

export { StudyPlanPage };
