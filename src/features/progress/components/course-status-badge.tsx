/**
 * CourseStatusBadge — WCAG 2.2 AA component for CourseProgressStatus.
 *
 * Accessibility rule (CROSS-5): every status is conveyed by COLOR + ICON + TEXT LABEL.
 * Color alone is never the sole signal.
 *
 * Status mapping:
 *   PENDING   → grey   / hourglass icon / "Pendiente"
 *   PASSED    → green  / check icon     / "Aprobada"
 *   FAILED    → red    / x icon         / "Reprobada"
 *   CANCELLED → orange / slash icon     / "Cancelada"
 *   AVAILABLE → blue   / unlock icon    / "Disponible"
 *   BLOCKED   → dark-grey / lock icon   / "Bloqueada"
 *
 * Advisory "[Recomendado]" chip shown on AVAILABLE courses with soft unmet prerequisites.
 */

import type { CourseProgressStatus } from "@/api/generated/models/course-progress-status";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  PENDING: {
    label: "Pendiente",
    textIcon: "⏳",
    className:
      "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600",
  },
  PASSED: {
    label: "Aprobada",
    textIcon: "✓",
    className:
      "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
  },
  FAILED: {
    label: "Reprobada",
    textIcon: "✕",
    className:
      "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700",
  },
  CANCELLED: {
    label: "Cancelada",
    textIcon: "∅",
    className:
      "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700",
  },
  AVAILABLE: {
    label: "Disponible",
    textIcon: "🔓",
    className:
      "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  },
  BLOCKED: {
    label: "Bloqueada",
    textIcon: "🔒",
    className:
      "bg-slate-200 text-slate-700 border-slate-400 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600",
  },
} as const;

interface CourseStatusBadgeProps {
  status: CourseProgressStatus;
  /** Advisory unmet prerequisites — shown as [Recomendado] chip on AVAILABLE only. */
  unmetRequirements?: string[];
}

function CourseStatusBadge({ status, unmetRequirements }: CourseStatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const showAdvisory =
    status === "AVAILABLE" && unmetRequirements && unmetRequirements.length > 0;

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {/* Primary status badge: color + icon + label */}
      <span
        className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border",
          config.className
        )}
        aria-label={`Estado: ${config.label}`}
      >
        {/* Icon — text-based for color-blind accessibility */}
        <span aria-hidden="true">{config.textIcon}</span>
        {/* Visible text label — REQUIRED for WCAG AA */}
        {config.label}
      </span>

      {/* Advisory chip for soft/inferred unmet prerequisites on AVAILABLE courses */}
      {showAdvisory && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border",
            "bg-yellow-50 text-yellow-800 border-yellow-300",
            "dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700"
          )}
          title={`Prerrequisito(s) recomendado(s): ${unmetRequirements?.join(", ")}`}
        >
          <span aria-hidden="true">▲</span>
          [Recomendado]
        </span>
      )}
    </span>
  );
}

export { CourseStatusBadge };
