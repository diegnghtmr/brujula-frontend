/**
 * CreditSummaryPanel — DET-002, FE-005, INV-005
 *
 * One card per ProgramCreditSummary.
 * WCAG 2.2 AA: withinLimit=false → warning COLOR + ICON + LABEL (never color alone).
 * withinLimit=true → success COLOR + ICON + LABEL.
 */

import type { ProgramCreditSummary } from "@/api/generated/models/program-credit-summary";
import { cn } from "@/lib/utils";

interface CreditSummaryPanelProps {
  summaries: ProgramCreditSummary[];
}

function CreditSummaryPanel({ summaries }: CreditSummaryPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      {summaries.map((summary) => {
        const { programId, programName, selectedCredits, creditLimit, withinLimit } = summary;

        return (
          <div
            key={programId}
            className={cn(
              "p-3 rounded border",
              withinLimit
                ? "bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-700"
                : "bg-orange-50 border-orange-300 dark:bg-orange-900/20 dark:border-orange-600"
            )}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{programName}</span>
              <div className="flex items-center gap-1.5">
                {/* WCAG: status indicator = color + icon + label (never color alone) */}
                {withinLimit ? (
                  <>
                    {/* Success indicator */}
                    <span
                      role="img"
                      aria-label="Dentro del límite"
                      className="text-green-600 dark:text-green-400"
                    >
                      ✓
                    </span>
                    <span className="text-xs text-green-700 dark:text-green-300 font-medium sr-only">
                      Dentro del límite
                    </span>
                  </>
                ) : (
                  <>
                    {/* Warning indicator */}
                    <span
                      role="img"
                      aria-label="Límite superado"
                      className="text-orange-600 dark:text-orange-400"
                    >
                      ⚠
                    </span>
                    <span className="text-xs text-orange-700 dark:text-orange-300 font-semibold">
                      Límite superado
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm text-foreground">
              <span className="font-semibold">{selectedCredits}</span>
              {" / "}
              <span>{creditLimit}</span>
              {" créditos"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { CreditSummaryPanel };
