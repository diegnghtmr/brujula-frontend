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
                // §2.4: within limit (éxito) → success-subtle
                ? "bg-success-subtle border-transparent"
                // §2.4: exceeds limit (advertencia) → warning-subtle
                : "bg-warning-subtle border-transparent"
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
                      className="text-success"
                    >
                      ✓
                    </span>
                    <span className="text-xs text-success-subtle-foreground font-medium sr-only">
                      Dentro del límite
                    </span>
                  </>
                ) : (
                  <>
                    {/* Warning indicator */}
                    <span
                      role="img"
                      aria-label="Límite superado"
                      className="text-warning"
                    >
                      ⚠
                    </span>
                    <span className="text-xs text-warning-subtle-foreground font-semibold">
                      Límite superado
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="mt-1 text-sm text-foreground">
              {/* §3.1/§9: tabular-nums for numeric credit values */}
              <span className="font-semibold tabular-nums">{selectedCredits}</span>
              {" / "}
              <span className="tabular-nums">{creditLimit}</span>
              {" créditos"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { CreditSummaryPanel };
