/**
 * OutdatedBanner — FE-007, STALE-002
 *
 * Shows when simulation.status = OUTDATED.
 * "Revisar" button → POST /me/simulations/:id/review
 * 200 → onReviewSuccess called (parent clears banner)
 * 409 → blockers displayed in role="alert"
 */

import { useState } from "react";
import type { SimulationStatus } from "@/api/generated/models/simulation-status";
import { useReviewSimulation } from "@/features/simulation/hooks/use-review-simulation";
import { cn } from "@/lib/utils";
import { getApiErrorMessage } from "@/lib/api-error";

interface OutdatedBannerProps {
  simulationId: string;
  status: SimulationStatus;
  onReviewSuccess: () => void;
}

function OutdatedBanner({ simulationId, status, onReviewSuccess }: OutdatedBannerProps) {
  const [blockersError, setBlockersError] = useState<string | null>(null);

  const reviewMutation = useReviewSimulation();

  if (status !== "OUTDATED") {
    return null;
  }

  function handleReview() {
    setBlockersError(null);
    reviewMutation.mutate(simulationId, {
      onSuccess: () => {
        onReviewSuccess();
      },
      onError: (error: Error) => {
        setBlockersError(
          getApiErrorMessage(error, "Error al revisar la simulación. Intentá nuevamente.")
        );
      },
    });
  }

  return (
    <div
      className={cn(
        "p-4 rounded border",
        // §2.4/§6.8: desactualizada → warning-subtle (notice banner)
        "bg-warning-subtle text-warning-subtle-foreground border-transparent"
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* WCAG: icon + text label (not color alone) */}
          <span aria-hidden="true" className="text-warning text-lg">⚠</span>
          <div>
            <p className="font-semibold text-sm">Simulación desactualizada</p>
            <p className="text-xs mt-0.5">
              Los datos de oferta han cambiado. Revisá la simulación para actualizar el estado.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReview}
          disabled={reviewMutation.isPending}
          aria-label="Revisar simulación"
          className={cn(
            "shrink-0 px-3 py-1.5 text-xs font-medium rounded border transition-colors",
            // §6.1: secondary action in context of warning banner
            "bg-warning text-warning-foreground border-transparent hover:opacity-90",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {reviewMutation.isPending ? "Revisando..." : "Revisar"}
        </button>
      </div>

      {blockersError && (
        <div
          role="alert"
          className={cn(
            "mt-3 p-2 rounded border text-xs",
            // §2.4: blocking error → destructive-subtle
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
        >
          <span aria-hidden="true" className="font-bold mr-1">✕</span>
          {blockersError}
        </div>
      )}
    </div>
  );
}

export { OutdatedBanner };
