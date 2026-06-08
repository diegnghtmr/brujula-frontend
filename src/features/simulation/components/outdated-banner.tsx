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
import type { AxiosError } from "@/api/client";
import { useReviewSimulation } from "@/features/simulation/hooks/use-review-simulation";
import { cn } from "@/lib/utils";

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
      onError: (error: AxiosError) => {
        const status = error.response?.status;
        const data = error.response?.data as {
          detail?: string;
          code?: string;
          message?: string;
        } | undefined;

        if (status === 409) {
          setBlockersError(
            data?.detail ??
              "La simulación aún tiene conflictos o bloqueos activos. Revisá las opciones seleccionadas."
          );
        } else {
          setBlockersError("Error al revisar la simulación. Intentá nuevamente.");
        }
      },
    });
  }

  return (
    <div
      className={cn(
        "p-4 rounded border",
        "bg-yellow-50 border-yellow-400 text-yellow-900",
        "dark:bg-yellow-900/20 dark:border-yellow-600 dark:text-yellow-200"
      )}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* WCAG: icon + text label (not color alone) */}
          <span aria-hidden="true" className="text-yellow-600 dark:text-yellow-400 text-lg">⚠</span>
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
            "bg-yellow-600 text-white border-yellow-700 hover:bg-yellow-700",
            "dark:bg-yellow-700 dark:border-yellow-600 dark:hover:bg-yellow-800",
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
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
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
