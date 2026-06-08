/**
 * SelectionRow — renders a single SimulationSelection with remove button.
 */

import type { SimulationSelection } from "@/api/generated/models/simulation-selection";
import { cn } from "@/lib/utils";

interface SelectionRowProps {
  simulationId: string;
  selection: SimulationSelection;
  onRemove: (selectionId: string) => void;
  isRemoving?: boolean;
}

function SelectionRow({ selection, onRemove, isRemoving }: SelectionRowProps) {
  const sessionSummary = selection.sessions
    .map((s) => `${s.day?.slice(0, 3)} ${s.startsAt}–${s.endsAt}`)
    .join(", ");

  return (
    <li className="p-3 border rounded bg-card border-border flex items-start justify-between gap-3">
      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <span className="text-sm font-medium text-foreground truncate">
          {selection.courseName}
        </span>
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{selection.credits} cr</span>
          <span>{selection.journeyCode}</span>
          {sessionSummary && <span>{sessionSummary}</span>}
        </div>
        {selection.warnings && selection.warnings.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {selection.warnings.map((w, idx) => (
              <span
                key={idx}
                className="text-xs text-yellow-700 dark:text-yellow-300"
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
          "border-red-300 text-red-600 hover:bg-red-50",
          "dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        Eliminar
      </button>
    </li>
  );
}

export { SelectionRow };
