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
 * - Quick action: "Dar de baja" → DELETE /me/subscriptions/{id} (WU-1 Fix B)
 *   Requires inline confirmation step before deleting (mirrors AttemptListPage pattern).
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router";
import { SubscriptionsApi } from "@/api/generated/api/subscriptions-api";
import { createApiInstance } from "@/api/client";
import type { Subscription } from "@/api/generated/models/subscription";
import { useDeleteSubscription } from "@/features/progress/hooks/use-delete-subscription";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";

const subscriptionsApi = createApiInstance(SubscriptionsApi);

// ---------------------------------------------------------------------------
// Subscription card — with inline delete confirmation (mirrors AttemptRow)
// ---------------------------------------------------------------------------

interface SubscriptionCardProps {
  sub: Subscription;
}

function SubscriptionCard({ sub }: SubscriptionCardProps) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useDeleteSubscription();

  function handleDelete() {
    setDeleteError(null);
    deleteMutation.mutate(
      { subscriptionId: sub.id },
      {
        onSuccess: () => {
          setConfirmDelete(false);
        },
        onError: (error: unknown) => {
          setDeleteError(
            getApiErrorMessage(error, "No se pudo dar de baja la suscripción. Intentá nuevamente.")
          );
          setConfirmDelete(false);
        },
      }
    );
  }

  return (
    <li
      className={cn(
        // §6.4/§5.1: content tile → rounded-none
        "p-5 border rounded-none bg-card border-border",
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

      {/* Error alert from failed delete */}
      {deleteError && (
        <div
          role="alert"
          className={cn(
            "p-2 text-xs border rounded",
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          {deleteError}
        </div>
      )}

      {/* Action buttons row */}
      {!confirmDelete && (
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              navigate(`/progress/subscriptions/${sub.id}/declare`)
            }
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-primary text-primary hover:bg-accent"
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

          {/* Destructive action — outline style, not heavy fill (§6.1/§2.3) */}
          <button
            type="button"
            aria-label={`Dar de baja suscripción a ${sub.programName}`}
            disabled={deleteMutation.isPending}
            onClick={() => {
              setDeleteError(null);
              setConfirmDelete(true);
            }}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded border transition-colors",
              "border-destructive text-destructive hover:bg-destructive-subtle",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            Dar de baja
          </button>
        </div>
      )}

      {/* Inline delete confirmation — mirrors AttemptListPage pattern */}
      {confirmDelete && (
        <div
          className={cn(
            "flex items-center gap-3 p-2 border rounded",
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          <span className="text-xs flex-1">
            ¿Confirmás que querés dar de baja esta suscripción? Se perderá el acceso a la planificación de este programa.
          </span>
          <button
            type="button"
            aria-label="Confirmar dar de baja"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
              "bg-destructive text-destructive-foreground border-transparent hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {deleteMutation.isPending ? "Procesando..." : "Confirmar"}
          </button>
          <button
            type="button"
            aria-label="Cancelar dar de baja"
            onClick={() => setConfirmDelete(false)}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40"
            )}
          >
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// SubscriptionListPage
// ---------------------------------------------------------------------------

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

  // Compute maxedOut: disabled only when 2 distinct programs AND each has 2 jornadas
  const distinctPrograms = new Map<string, Set<string>>();
  for (const sub of subscriptions ?? []) {
    if (!distinctPrograms.has(sub.programId)) {
      distinctPrograms.set(sub.programId, new Set());
    }
    const journeyCode = sub.referenceJourney?.code;
    if (journeyCode) {
      distinctPrograms.get(sub.programId)!.add(journeyCode);
    }
  }
  const maxedOut =
    distinctPrograms.size >= 2 &&
    Array.from(distinctPrograms.values()).every((jornadas) => jornadas.size >= 2);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackLink to="/dashboard" />
      <header className="flex items-start justify-between gap-4 mb-4 mt-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-display">
            Mis suscripciones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Programas académicos que estás planificando (máx. 2 carreras, 2 jornadas por carrera).
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/progress/subscribe")}
          disabled={maxedOut}
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
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
          <span className="sr-only">Cargando suscripciones…</span>
          <Skeleton className="h-28 w-full rounded-none" />
          <Skeleton className="h-28 w-full rounded-none" />
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
              "border-primary text-primary hover:bg-accent"
            )}
          >
            Suscribirse a un programa
          </button>
        </div>
      )}

      {subscriptions && subscriptions.length > 0 && (
        <ul className="flex flex-col gap-4">
          {subscriptions.map((sub) => (
            <SubscriptionCard key={sub.id} sub={sub} />
          ))}
        </ul>
      )}
    </div>
  );
}

export { SubscriptionListPage };
