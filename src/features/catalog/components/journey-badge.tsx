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
        // FIX 3: bg-primary/10 is ~10% black = invisible. Use muted/border tokens for visible weight.
        "text-xs font-medium bg-muted text-foreground border border-border"
      )}
      aria-label={`Jornada: ${journey.name}`}
    >
      {journey.name}
    </span>
  );
}

export { JourneyBadge };
