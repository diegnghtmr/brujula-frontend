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
    textIcon: "○",
    // §6.3: pendiente → muted (neutral, no cursada)
    className: "bg-muted text-muted-foreground border-transparent",
  },
  PASSED: {
    label: "Aprobada",
    textIcon: "✓",
    // §6.3: aprobada → success-subtle
    className: "bg-success-subtle text-success-subtle-foreground border-transparent",
  },
  FAILED: {
    label: "Reprobada",
    textIcon: "✕",
    // §6.3: reprobada → destructive-subtle
    className: "bg-destructive-subtle text-destructive-subtle-foreground border-transparent",
  },
  CANCELLED: {
    label: "Cancelada",
    textIcon: "—",
    // §6.3: cancelada → warning-subtle
    className: "bg-warning-subtle text-warning-subtle-foreground border-transparent",
  },
  AVAILABLE: {
    label: "Disponible",
    textIcon: "🔓",
    // §6.3: habilitada → outline (border-success, bg-background)
    className: "border-success bg-background text-success-subtle-foreground",
  },
  BLOCKED: {
    label: "Bloqueada",
    textIcon: "🔒",
    // §6.3: bloqueada → muted
    className: "bg-muted text-muted-foreground border-transparent",
  },
  // Additional statuses that may come from the API
  IN_PROGRESS: {
    label: "En curso",
    textIcon: "◷",
    // §6.3: en-curso → info-subtle
    className: "bg-info-subtle text-info-subtle-foreground border-transparent",
  },
  PLANNED: {
    label: "Pendiente",
    textIcon: "○",
    // §6.3: pendiente → muted
    className: "bg-muted text-muted-foreground border-transparent",
  },
  NOT_TAKEN: {
    label: "Pendiente",
    textIcon: "○",
    // §6.3: pendiente → muted
    className: "bg-muted text-muted-foreground border-transparent",
  },
} as const;

interface CourseStatusBadgeProps {
  status: CourseProgressStatus;
  /**
   * Unmet prerequisites.
   * - AVAILABLE: shown as "[Recomendado]" advisory chip (soft/recommended prereqs).
   * - BLOCKED: shown as "Falta:" blocking reason chip (required missing prereqs).
   */
  unmetRequirements?: string[];
}

function CourseStatusBadge({ status, unmetRequirements }: CourseStatusBadgeProps) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.PENDING;
  const showAdvisory =
    status === "AVAILABLE" && unmetRequirements && unmetRequirements.length > 0;
  const showBlockingReason =
    status === "BLOCKED" && unmetRequirements && unmetRequirements.length > 0;

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
            // §2.4: advisory/soft warning → warning-subtle
            "bg-warning-subtle text-warning-subtle-foreground border-transparent"
          )}
          title={`Prerrequisito(s) recomendado(s): ${unmetRequirements?.join(", ")}`}
        >
          <span aria-hidden="true">▲</span>
          [Recomendado]
        </span>
      )}

      {/* Blocking reason chip for REQUIRED missing prerequisites on BLOCKED courses.
          Semantically and visually distinct from the advisory chip:
          - Different color (red) vs advisory (yellow)
          - Different copy ("Falta:") vs advisory ("[Recomendado]")
          - Lists each unmet prerequisite as a visible, screen-reader-accessible item
          - WCAG 2.2 AA: reason conveyed by color + icon + text (never color alone) */}
      {showBlockingReason && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs border",
            // §2.4: blocking/required missing → destructive-subtle
            "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
          )}
          aria-label={`Prerrequisito(s) faltante(s): ${unmetRequirements?.join(", ")}`}
          title={`Prerrequisito(s) faltante(s): ${unmetRequirements?.join(", ")}`}
        >
          <span aria-hidden="true">⛔</span>
          <span>
            {"Falta: "}
            {unmetRequirements?.join(", ")}
          </span>
        </span>
      )}
    </span>
  );
}

export { CourseStatusBadge };
