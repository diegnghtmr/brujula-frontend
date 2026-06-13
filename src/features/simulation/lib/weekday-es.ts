/**
 * weekday-es.ts — Maps Weekday enum values to 3-letter Spanish abbreviations.
 *
 * Pure, side-effect free. React Compiler ON: module-scope constant.
 */

// ─── Mapping ─────────────────────────────────────────────────────────────────

const WEEKDAY_ES_MAP: Record<string, string> = {
  MONDAY: "LUN",
  TUESDAY: "MAR",
  WEDNESDAY: "MIÉ",
  THURSDAY: "JUE",
  FRIDAY: "VIE",
  SATURDAY: "SÁB",
  SUNDAY: "DOM",
} as const;

// ─── Function ─────────────────────────────────────────────────────────────────

/**
 * Converts a Weekday enum string to a 3-letter Spanish abbreviation (uppercase).
 * Unknown, empty, undefined, or null values return "".
 */
function weekdayEs(day: string | undefined | null): string {
  if (!day) return "";
  return WEEKDAY_ES_MAP[day] ?? "";
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { weekdayEs };
