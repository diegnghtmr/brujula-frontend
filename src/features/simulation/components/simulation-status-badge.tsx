/**
 * SimulationStatusBadge — WCAG 2.2 AA component for SimulationStatus.
 *
 * Accessibility rule (INV-005): every status is conveyed by COLOR + ICON + TEXT LABEL.
 * Color alone is never the sole signal.
 *
 * Status mapping:
 *   CURRENT  → green  / check icon / "Vigente"
 *   OUTDATED → yellow / warning icon / "Desactualizada"
 */

import type { SimulationStatus } from "@/api/generated/models/simulation-status";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  CURRENT: {
    label: "Vigente",
    textIcon: "✓",
    className:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  },
  OUTDATED: {
    label: "Desactualizada",
    textIcon: "⚠",
    className:
      "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
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
      {/* Icon — text-based for color-blind accessibility */}
      <span aria-hidden="true">{config.textIcon}</span>
      {/* Visible text label — REQUIRED for WCAG AA */}
      {config.label}
    </span>
  );
}

export { SimulationStatusBadge };
