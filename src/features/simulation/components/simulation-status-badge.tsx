/**
 * SimulationStatusBadge — WCAG 2.2 AA component for SimulationStatus.
 *
 * Accessibility rule (INV-005): every status is conveyed by COLOR + TEXT LABEL.
 * Color alone is never the sole signal. Text label is always present.
 *
 * Status mapping:
 *   CURRENT  → green  / "Vigente"
 *   OUTDATED → yellow / "Desactualizada"
 */

import type { SimulationStatus } from "@/api/generated/models/simulation-status";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  CURRENT: {
    label: "Vigente",
    // §2.4: vigente (éxito/aprobada) → success-subtle per §6.3
    className: "bg-success-subtle text-success-subtle-foreground border-transparent",
  },
  OUTDATED: {
    label: "Desactualizada",
    // §2.4: desactualizada/cancelada → warning-subtle per §6.3
    className: "bg-warning-subtle text-warning-subtle-foreground border-transparent",
  },
} as const;

interface SimulationStatusBadgeProps {
  status: SimulationStatus;
}

function SimulationStatusBadge({ status }: SimulationStatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.CURRENT;

  return (
    <span
      role="status"
      aria-label={`Estado: ${config.label}`}
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border",
        config.className
      )}
    >
      {/* Visible text label — REQUIRED for WCAG AA */}
      {config.label}
    </span>
  );
}

export { SimulationStatusBadge };
