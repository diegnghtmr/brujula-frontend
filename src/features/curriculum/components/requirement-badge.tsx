/**
 * RequirementBadge — atomic component for a course requirement edge.
 *
 * Accessibility (WCAG 2.2 AA): confidence is conveyed by color + icon + TEXT LABEL.
 * HIGH → ALTA (green, lock icon, firm indicator)
 * MEDIUM → MEDIA (yellow, info icon, sugerido/advisory)
 * LOW → BAJA (gray, info icon, sugerido/advisory)
 * No confidence → without label
 */

import type { MallaRequirement } from "@/api/generated/models/malla-requirement";
import { cn } from "@/lib/utils";

const CONFIDENCE_CONFIG = {
  HIGH: {
    label: "ALTA",
    icon: "🔒",
    textIcon: "■",
    className: "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
    advisory: false,
  },
  MEDIUM: {
    label: "MEDIA",
    icon: "ℹ",
    textIcon: "▲",
    className: "bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700",
    advisory: true,
  },
  LOW: {
    label: "BAJA",
    icon: "ℹ",
    textIcon: "▽",
    className: "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800/50 dark:text-gray-400 dark:border-gray-600",
    advisory: true,
  },
} as const;

type ConfidenceKey = keyof typeof CONFIDENCE_CONFIG;

interface RequirementBadgeProps {
  requirement: MallaRequirement;
}

function RequirementBadge({ requirement }: RequirementBadgeProps) {
  const confidence = requirement.confidence as ConfidenceKey | null | undefined;
  const config = confidence ? CONFIDENCE_CONFIG[confidence] : null;

  if (!config) {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs border bg-muted/50 text-muted-foreground border-border">
        <span aria-hidden="true" className="mr-1">→</span>
        Requisito
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border",
        config.className
      )}
      aria-label={`Requisito de confianza ${config.label}${config.advisory ? " (sugerido)" : ""}`}
      title={config.advisory ? "Sugerido — no es requisito oficial confirmado" : "Requisito oficial confirmado"}
    >
      {/* Text icon for color-blind accessibility (not emoji-only) */}
      <span aria-hidden="true">{config.textIcon}</span>
      {/* Visible text label — required for WCAG AA (not color alone) */}
      {config.label}
      {/* Advisory indicator for inferred/low-confidence */}
      {config.advisory && (
        <span className="ml-0.5 italic text-[10px]">sugerido</span>
      )}
    </span>
  );
}

export { RequirementBadge };
