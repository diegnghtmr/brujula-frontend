/**
 * offering-filters.ts — Pure filter composition for offering+verdict items.
 *
 * No React, no side effects. Fully unit-testable.
 * Zod schema is the single source of truth for shape + defaults.
 * React Compiler is ON: pure functions at module scope (stable identity).
 */

import { z } from "zod";
import type { Offering } from "@/api/generated/models/offering";
import type { EligibilityVerdict } from "./eligibility";

// ─── Schema & types ───────────────────────────────────────────────────────────

const offeringFilterSchema = z.object({
  /** Matches courseName + officialCode, case/diacritic-insensitive */
  search: z.string().default(""),
  /** recommendedSemester equality; null = no filter */
  semester: z.number().int().nullable().default(null),
  /** credits >= minCredits; null = no filter */
  minCredits: z.number().int().nonnegative().nullable().default(null),
  /** credits <= maxCredits; null = no filter */
  maxCredits: z.number().int().nonnegative().nullable().default(null),
  /** CourseType equality; null = all types */
  type: z.string().nullable().default(null),
  /** programId equality; null = all programs */
  program: z.string().nullable().default(null),
  /**
   * jornada (journeyCode) — state only, NOT applied in applyOfferingFilters.
   * Jornada narrows the fetch at the query level (journeysByProgram in OfferingBrowser),
   * not client-side, because offerings are already fetched per journey.
   */
  jornada: z.string().nullable().default(null),
});

type OfferingFilter = z.infer<typeof offeringFilterSchema>;

interface OfferingWithVerdict {
  offering: Offering & { officialCode?: string | null };
  verdict: EligibilityVerdict;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strips diacritics and lowercases for locale-insensitive comparison. */
function normalizeString(value: string): string {
  return value
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

// ─── Pure filter function ─────────────────────────────────────────────────────

/**
 * Applies all active filters as AND predicates.
 * Unknown-verdict items (no semester/credits/type in verdict) pass only when
 * the corresponding filter is null — documents graceful degrade for off-plan.
 *
 * NOTE: `jornada` is intentionally NOT applied here — it narrows the fetch.
 */
function applyOfferingFilters(
  items: OfferingWithVerdict[],
  filter: OfferingFilter
): OfferingWithVerdict[] {
  const { search, semester, minCredits, maxCredits, type, program } = filter;

  const normalizedSearch = normalizeString(search);

  return items.filter((item) => {
    const { offering, verdict } = item;

    // Search predicate: match courseName or officialCode
    if (normalizedSearch.length > 0) {
      const nameMatch = normalizeString(offering.courseName).includes(normalizedSearch);
      const codeMatch = offering.officialCode
        ? normalizeString(offering.officialCode).includes(normalizedSearch)
        : false;
      if (!nameMatch && !codeMatch) return false;
    }

    // Semester predicate
    if (semester !== null) {
      if (verdict.recommendedSemester === undefined || verdict.recommendedSemester === null) {
        return false;
      }
      if (verdict.recommendedSemester !== semester) return false;
    }

    // Credits range predicate
    if (minCredits !== null || maxCredits !== null) {
      if (verdict.credits === undefined || verdict.credits === null) {
        // unknown — only pass when both credit filters are null (handled above)
        return false;
      }
      if (minCredits !== null && verdict.credits < minCredits) return false;
      if (maxCredits !== null && verdict.credits > maxCredits) return false;
    }

    // Type predicate
    if (type !== null) {
      if (verdict.type === undefined || verdict.type === null) return false;
      if (verdict.type !== type) return false;
    }

    // Program predicate
    if (program !== null) {
      if (offering.programId !== program) return false;
    }

    return true;
  });
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { offeringFilterSchema, applyOfferingFilters };
export type { OfferingFilter, OfferingWithVerdict };
