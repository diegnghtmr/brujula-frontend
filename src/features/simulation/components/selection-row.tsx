/**
 * SelectionRow — renders a single SimulationSelection with remove button.
 */

import type { SimulationSelection } from "@/api/generated/models/simulation-selection";
import { cn } from "@/lib/utils";
import { weekdayEs } from "../lib/weekday-es";

interface SelectionRowProps {
  simulationId: string;
  selection: SimulationSelection;
  onRemove: (selectionId: string) => void;
  isRemoving?: boolean;
}

function SelectionRow({ selection, onRemove, isRemoving }: SelectionRowProps) {
  const sessionSummary = selection.sessions
    .map((s) => `${weekdayEs(s.day)} ${s.startsAt}–${s.endsAt}`)
    .join(", ");

  // §6.4/§5.1: content tile → rounded-none
  return (
    <li className="p-3 border rounded-none bg-card border-border flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {selection.courseName}
        </span>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          {/* §3.1/§9: tabular-nums for numeric credits */}
          <span className="tabular-nums">{selection.credits} cr</span>
          <span>{selection.journeyCode}</span>
          {sessionSummary && <span>{sessionSummary}</span>}
        </div>
        {selection.warnings && selection.warnings.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {selection.warnings.map((w, idx) => (
              <span
                key={idx}
                // §2.4: warning notice → warning-subtle-foreground (text on default bg)
                className="text-xs text-warning-subtle-foreground"
              >
                <span aria-hidden="true">▲</span> {w.message}
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onRemove(selection.id)}
        disabled={isRemoving}
        aria-label={`Eliminar ${selection.courseName}`}
        className={cn(
          "shrink-0 px-2 py-1 text-xs font-medium rounded border transition-colors",
          // §6.1/§2.3: destructive outline action button
          "border-destructive text-destructive hover:bg-destructive-subtle",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        Eliminar
      </button>
    </li>
  );
}

export { SelectionRow };
