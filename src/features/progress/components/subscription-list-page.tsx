/**
 * SubscriptionListPage — list the student's active subscriptions (SUB-2).
 *
 * Route: /progress/subscriptions
 *
 * Design:
 * - GET /me/subscriptions → up to 2 subscriptions.
 * - Each subscription card links to curriculum view + progress summary.
 * - Quick action: "Declarar avance" → /progress/subscriptions/{id}/declare
 * - Quick action: "Ver resumen" → /progress/subscriptions/{id}/progress
 */

import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { createApiInstance } from "@/api/client";
import { cn } from "@/lib/utils";

const subscriptionsApi = createApiInstance(SubscriptionsApi);

function SubscriptionListPage() {
  const navigate = useNavigate();

  const {
    data: subscriptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () =>
      subscriptionsApi.listMySubscriptions().then((r) => r.data),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <header className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Mis suscripciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programas académicos que estás planificando (máx. 2).
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/progress/subscribe")}
          disabled={(subscriptions?.length ?? 0) >= 2}
          className={cn(
            "px-4 py-2 text-sm font-medium rounded border transition-colors",
            "bg-primary text-primary-foreground border-primary hover:opacity-90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          + Suscribirse
        </button>
      </header>

      {isLoading && (
        <div className="flex items-center justify-center py-12" role="status">
          <span className="sr-only">Cargando suscripciones...</span>
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
          No se pudieron cargar las suscripciones. Intentá nuevamente.
        </p>
      )}

      {subscriptions && !isLoading && subscriptions.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Todavía no tenés suscripciones activas.
          </p>
          <button
            type="button"
            onClick={() => navigate("/progress/subscribe")}
            className={cn(
              "mt-4 px-4 py-2 text-sm font-medium rounded border transition-colors",
              "border-primary text-primary hover:bg-primary/10"
            )}
          >
            Suscribirse a un programa
          </button>
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <ul className="flex flex-col gap-4">
          {subscriptions.map((sub) => (
            <li
              key={sub.id}
              className={cn(
                "p-5 border rounded bg-card border-border",
                "flex flex-col gap-3"
              )}
            >
              <div className="flex flex-col gap-1">
                <h2 className="text-base font-semibold text-foreground">
                  {sub.programName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sub.planName}{sub.referenceJourney ? ` · ${sub.referenceJourney.name}` : ""}
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/progress/subscriptions/${sub.id}/declare`)
                  }
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                    "border-primary text-primary hover:bg-primary/10"
                  )}
                >
                  Declarar avance
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/progress/subscriptions/${sub.id}/progress`)
                  }
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                    "border-border hover:bg-muted/40"
                  )}
                >
                  Ver resumen
                </button>
                {sub.referenceJourney && (
                  <Link
                    to={`/curriculum/plans/${sub.planId}/malla?journeyCode=${encodeURIComponent(sub.referenceJourney.code)}`}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                      "border-border hover:bg-muted/40"
                    )}
                  >
                    Ver malla
                  </Link>
                )}
                <Link
                  to={`/progress/subscriptions/${sub.id}/attempts`}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                    "border-border hover:bg-muted/40"
                  )}
                >
                  Ver historial
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { SubscriptionListPage };
