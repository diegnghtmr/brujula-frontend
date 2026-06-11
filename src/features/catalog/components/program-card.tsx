/**
 * ProgramCard — presentational component for a single academic program.
 * Displays program name, faculty, and status with accessible color+icon+label.
 *
 * A11Y: when onSelect is provided, renders as a native <button> (not article
 * with role="button") so keyboard/mouse interaction is handled by the browser
 * without extra event management. When onSelect is absent, renders as <article>
 * for semantic structure.
 */

import type { Program } from "@/api/generated/models/program";
import { cn } from "@/lib/utils";

const PROGRAM_STATUS_CONFIG = {
  ACTIVE: {
    label: "Activo",
    icon: "●",
    // §8 / FIX 2: icon carries the semantic color; label uses text-foreground (≥4.5:1)
    iconClassName: "text-success",
    labelClassName: "text-foreground",
  },
  INACTIVE: {
    label: "Inactivo",
    icon: "○",
    iconClassName: "text-muted-foreground",
    labelClassName: "text-muted-foreground",
  },
  ARCHIVED: {
    label: "Archivado",
    icon: "◌",
    iconClassName: "text-muted-foreground",
    labelClassName: "text-muted-foreground",
  },
} as const;

type ProgramStatusKey = keyof typeof PROGRAM_STATUS_CONFIG;

function getStatusConfig(status: string) {
  return (
    PROGRAM_STATUS_CONFIG[status as ProgramStatusKey] ??
    PROGRAM_STATUS_CONFIG["INACTIVE"]
  );
}

interface ProgramCardProps {
  program: Program;
  onSelect?: (programId: string) => void;
}

/** Inner content shared between interactive and presentational variants. */
function ProgramCardContent({ program, statusConf }: { program: Program; statusConf: (typeof PROGRAM_STATUS_CONFIG)[ProgramStatusKey] }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground leading-snug">
          {program.name}
        </h3>
        {/* Status: color on icon only; label uses text-foreground for WCAG AA contrast */}
        <span
          className="inline-flex items-center gap-1 text-xs font-medium shrink-0"
          aria-label={`Estado: ${statusConf.label}`}
        >
          <span aria-hidden="true" className={statusConf.iconClassName}>{statusConf.icon}</span>
          <span className={statusConf.labelClassName}>{statusConf.label}</span>
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{program.faculty}</p>
    </>
  );
}

function ProgramCard({ program, onSelect }: ProgramCardProps) {
  const statusConf = getStatusConfig(program.status as string);

  const sharedClassName = cn(
    "flex flex-col gap-2 p-4 border border-border bg-card",
    "hover:bg-muted/40 transition-colors"
  );

  if (onSelect) {
    // Interactive variant: use native <button> for proper a11y semantics
    return (
      <button
        type="button"
        className={cn(sharedClassName, "w-full text-left cursor-pointer")}
        onClick={() => onSelect(program.id)}
        aria-label={`Programa: ${program.name}`}
      >
        <ProgramCardContent program={program} statusConf={statusConf} />
      </button>
    );
  }

  return (
    <article
      className={sharedClassName}
      aria-label={`Programa: ${program.name}`}
    >
      <ProgramCardContent program={program} statusConf={statusConf} />
    </article>
  );
}

export { ProgramCard };
