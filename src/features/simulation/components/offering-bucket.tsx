/**
 * OfferingBucket — presentational section component for one eligibility bucket.
 *
 * Accessibility: <section aria-labelledby> + <ul> pattern.
 * Tone drives surface/border tokens (established in globals.css @theme inline).
 * WCAG 2.2 AA: color + icon + text label (never color alone).
 * React Compiler is ON: no useMemo/useCallback.
 *
 * groupBySemester: when true, groups offerings by recommendedSemester (ascending)
 * with a labeled <h4> subheading per group; items with no semester go last under "Otras".
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { EligibilityVerdict } from "../lib/eligibility";

// ─── Types ────────────────────────────────────────────────────────────────────

type BucketTone = "available" | "blocked" | "passed";

interface OfferingBucketProps<T extends { verdict: EligibilityVerdict }> {
  titleId: string;
  title: string;
  tone: BucketTone;
  offerings: T[];
  renderOffering: (item: T) => ReactNode;
  /** When true, groups items by recommendedSemester with subheadings. Default: false. */
  groupBySemester?: boolean;
}

// ─── Tone → Tailwind surface/border token map ─────────────────────────────────
// All tokens are registered in @theme inline in globals.css — safe to use.

const TONE_CLASSES: Record<BucketTone, string> = {
  available: "border-border",
  blocked: "border-warning-subtle bg-warning-subtle/20",
  passed: "border-border bg-muted/10 opacity-80",
} as const;

// ─── Component ────────────────────────────────────────────────────────────────

function OfferingBucket<T extends { verdict: EligibilityVerdict }>({
  titleId,
  title,
  tone,
  offerings,
  renderOffering,
  groupBySemester = false,
}: OfferingBucketProps<T>) {
  if (offerings.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className={cn("rounded-sm border p-0", TONE_CLASSES[tone])}
    >
      <h3
        id={titleId}
        className="text-xs font-semibold text-muted-foreground px-3 pt-2 pb-1 uppercase tracking-wide"
      >
        {title}
        <span className="ml-1 font-normal normal-case">
          ({offerings.length})
        </span>
      </h3>

      {groupBySemester ? (
        <SemesterGroups titleId={titleId} offerings={offerings} renderOffering={renderOffering} />
      ) : (
        <ul className="flex flex-col gap-1 pb-1">
          {offerings.map((item) => renderOffering(item))}
        </ul>
      )}
    </section>
  );
}

// ─── SemesterGroups — groups offerings by recommendedSemester ─────────────────

function SemesterGroups<T extends { verdict: EligibilityVerdict }>({
  titleId,
  offerings,
  renderOffering,
}: {
  titleId: string;
  offerings: T[];
  renderOffering: (item: T) => ReactNode;
}) {
  // Build ordered groups: numbered semesters ascending, then "Otras" for undefined
  const groupMap = new Map<number | null, T[]>();

  for (const item of offerings) {
    const sem = item.verdict.recommendedSemester ?? null;
    const existing = groupMap.get(sem) ?? [];
    existing.push(item);
    groupMap.set(sem, existing);
  }

  // Sort keys: numbers ascending, null last
  const sortedKeys = [...groupMap.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  return (
    <div className="flex flex-col pb-1">
      {sortedKeys.map((sem) => {
        const group = groupMap.get(sem)!;
        const headingId = sem !== null ? `${titleId}-sem-${sem}` : `${titleId}-sem-otras`;
        const headingText = sem !== null ? `Semestre ${sem}` : "Otras";

        return (
          <div key={sem ?? "otras"} role="group" aria-labelledby={headingId}>
            <h4
              id={headingId}
              className="text-xs font-medium text-muted-foreground px-3 pt-2 pb-0.5 italic"
            >
              {headingText}
            </h4>
            <ul className="flex flex-col gap-1">
              {group.map((item) => renderOffering(item))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { OfferingBucket };
export type { BucketTone, OfferingBucketProps };
