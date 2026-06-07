/**
 * JourneyBadge — presentational atom for a single journey (jornada).
 * Displays the journey name with accessible styling.
 */

import type { JourneyRef } from "@/api/generated/models/journey-ref";
import { cn } from "@/lib/utils";

interface JourneyBadgeProps {
  journey: JourneyRef;
}

function JourneyBadge({ journey }: JourneyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full",
        "text-xs font-medium bg-primary/10 text-primary border border-primary/20"
      )}
      aria-label={`Jornada: ${journey.name}`}
    >
      {journey.name}
    </span>
  );
}

export { JourneyBadge };
