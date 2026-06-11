/**
 * DashboardPage — authenticated pivot hub (Slice A).
 *
 * Shows:
 * - User profile card (UserProfileCard via /me cache)
 * - Academic status legend (WCAG status semantics)
 * - Per-subscription cards with CTAs: "Declarar avance", "Ver resumen"
 * - Global CTAs: "Crear simulación", "Explorar Catálogo"
 * - Empty-state CTA when no subscriptions exist
 *
 * Reuses the shared ["subscriptions"] query cache (same key as SubscriptionListPage).
 * No new data fetches beyond what is already cached.
 */

import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { createApiInstance } from "@/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { UserProfileCard } from "@/features/auth/components/user-profile-card";
import { cn } from "@/lib/utils";

const subscriptionsApi = createApiInstance(SubscriptionsApi);

function DashboardPage() {
  const {
    data: subscriptions,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => subscriptionsApi.listMySubscriptions().then((r) => r.data),
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-foreground font-display mb-8">
        Inicio
      </h1>

      {/* Top info row: profile + status legend */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* User profile from /me */}
        <UserProfileCard />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Estado del progreso</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge variant="aprobada" showIcon>Aprobada</Badge>
            <Badge variant="en-curso" showIcon>En curso</Badge>
            <Badge variant="cancelada" showIcon>Cancelada</Badge>
            <Badge variant="reprobada" showIcon>Reprobada</Badge>
            <Badge variant="pendiente" showIcon>Pendiente</Badge>
            <Badge variant="habilitada" showIcon>Habilitada</Badge>
            <Badge variant="bloqueada" showIcon>Bloqueada</Badge>
          </CardContent>
        </Card>

        {/* Global quick-access CTAs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link
              to="/simulations/new"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded border text-center transition-colors",
                "bg-primary text-primary-foreground border-primary hover:opacity-90"
              )}
            >
              Crear simulación
            </Link>
            <Link
              to="/catalog/programs"
              className={cn(
                "px-4 py-2 text-sm font-medium rounded border text-center transition-colors",
                "border-primary text-primary hover:bg-accent"
              )}
            >
              Explorar Catálogo
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Subscriptions section */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Mis suscripciones
        </h2>

        {isLoading && (
          <div role="status" aria-live="polite" className="flex flex-col gap-3">
            <span className="sr-only">Cargando suscripciones…</span>
            <Skeleton className="h-24 w-full rounded-none" />
            <Skeleton className="h-24 w-full rounded-none" />
            <Skeleton className="h-24 w-full rounded-none" />
          </div>
        )}

        {isError && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No se pudieron cargar las suscripciones. Intentá nuevamente.
          </p>
        )}

        {!isLoading && !isError && subscriptions && subscriptions.length === 0 && (
          <div className="py-12 text-center border rounded bg-card border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Todavía no tenés suscripciones activas. Suscribite a un programa para empezar.
            </p>
            <Link
              to="/progress/subscribe"
              className={cn(
                "inline-block px-4 py-2 text-sm font-medium rounded border transition-colors",
                "border-primary text-primary hover:bg-accent"
              )}
            >
              Suscribirse
            </Link>
          </div>
        )}

        {!isLoading && subscriptions && subscriptions.length > 0 && (
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
                  <h3 className="text-base font-semibold text-foreground">
                    {sub.programName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {sub.planName} · {sub.referenceJourney.name}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Link
                    to={`/progress/subscriptions/${sub.id}/declare`}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                      "border-primary text-primary hover:bg-accent"
                    )}
                  >
                    Declarar avance
                  </Link>
                  <Link
                    to={`/progress/subscriptions/${sub.id}/progress`}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
                      "border-border text-foreground hover:bg-muted/40"
                    )}
                  >
                    Ver resumen
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export { DashboardPage };
