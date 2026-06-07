/**
 * ProgramCard — presentational component for a single academic program.
 * Displays program name, faculty, and status with accessible color+icon+label.
 */

import type { KeyboardEvent } from "react";
import type { Program } from "@/api/generated/models/program";
import { cn } from "@/lib/utils";

const PROGRAM_STATUS_CONFIG = {
  ACTIVE: {
    label: "Activo",
    icon: "●",
    className: "text-green-600 dark:text-green-400",
  },
  INACTIVE: {
    label: "Inactivo",
    icon: "○",
    className: "text-muted-foreground",
  },
  ARCHIVED: {
    label: "Archivado",
    icon: "◌",
    className: "text-muted-foreground",
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

function ProgramCard({ program, onSelect }: ProgramCardProps) {
  const statusConf = getStatusConfig(program.status as string);

  function handleKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(program.id);
    }
  }

  return (
    <article
      className={cn(
        "flex flex-col gap-2 p-4 border border-border bg-card",
        "hover:bg-muted/40 transition-colors",
        onSelect && "cursor-pointer"
      )}
      onClick={() => onSelect?.(program.id)}
      onKeyDown={onSelect ? handleKeyDown : undefined}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={`Programa: ${program.name}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-foreground leading-snug">
          {program.name}
        </h3>
        {/* Status: color + icon + label (WCAG 2.2 AA) */}
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium shrink-0",
            statusConf.className
          )}
          aria-label={`Estado: ${statusConf.label}`}
        >
          <span aria-hidden="true">{statusConf.icon}</span>
          {statusConf.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{program.faculty}</p>
    </article>
  );
}

export { ProgramCard };
