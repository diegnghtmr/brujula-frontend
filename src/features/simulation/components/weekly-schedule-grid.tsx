/**
 * WeeklyScheduleGrid
 *
 * True time-grid calendar layout:
 * - Leftmost "Hora" column with hour labels derived from entry range.
 * - Day columns (Lun…Dom) across the top.
 * - Each entry placed at its start hour, spanning duration (rowSpan).
 * - Sticky header row + sticky hour column for scrollable grids.
 *
 * WCAG 2.2 AA: inClash=true → color + icon + ARIA label (never color alone).
 * Screen-reader: each session cell aria-label includes day + time + course + clash status.
 */

import type { WeeklyScheduleEntry } from "@/api/generated/models/weekly-schedule-entry";
import { cn } from "@/lib/utils";

const DAYS = [
  { key: "MONDAY", label: "Lun" },
  { key: "TUESDAY", label: "Mar" },
  { key: "WEDNESDAY", label: "Mié" },
  { key: "THURSDAY", label: "Jue" },
  { key: "FRIDAY", label: "Vie" },
  { key: "SATURDAY", label: "Sáb" },
  { key: "SUNDAY", label: "Dom" },
] as const;

// Categorical, theme-aware palette for per-course coloring (UX: each materia
// gets a stable, distinct color so a course's multiple sessions are easy to
// track at a glance). Red/rose are intentionally omitted — reserved for the
// schedule-clash state. `cell` styles the timetable block (readable text in
// both light and dark themes); `dot` is the solid legend swatch.
const COURSE_PALETTE = [
  { cell: "bg-blue-500/15 text-blue-900 dark:text-blue-100 border-blue-500/40", dot: "bg-blue-500" },
  { cell: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 border-emerald-500/40", dot: "bg-emerald-500" },
  { cell: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/40", dot: "bg-amber-500" },
  { cell: "bg-violet-500/15 text-violet-900 dark:text-violet-100 border-violet-500/40", dot: "bg-violet-500" },
  { cell: "bg-cyan-500/15 text-cyan-900 dark:text-cyan-100 border-cyan-500/40", dot: "bg-cyan-500" },
  { cell: "bg-fuchsia-500/15 text-fuchsia-900 dark:text-fuchsia-100 border-fuchsia-500/40", dot: "bg-fuchsia-500" },
  { cell: "bg-orange-500/15 text-orange-900 dark:text-orange-100 border-orange-500/40", dot: "bg-orange-500" },
  { cell: "bg-teal-500/15 text-teal-900 dark:text-teal-100 border-teal-500/40", dot: "bg-teal-500" },
  { cell: "bg-indigo-500/15 text-indigo-900 dark:text-indigo-100 border-indigo-500/40", dot: "bg-indigo-500" },
  { cell: "bg-lime-500/15 text-lime-900 dark:text-lime-100 border-lime-500/40", dot: "bg-lime-500" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

const DEFAULT_START_HOUR = 6;
const DEFAULT_END_HOUR = 22;

interface WeeklyScheduleGridProps {
  entries: WeeklyScheduleEntry[];
}

function buildAriaLabel(entry: WeeklyScheduleEntry, dayLabel: string): string {
  const clash = entry.inClash ? " — Choque de horario" : "";
  return `${dayLabel} ${entry.startsAt}–${entry.endsAt}: ${entry.courseName}${clash}`;
}

function parseHour(time: string): number {
  return Number.parseInt(time.split(":")[0]!, 10);
}

function deriveHourRange(entries: WeeklyScheduleEntry[]): { startHour: number; endHour: number } {
  if (entries.length === 0) {
    return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
  }
  let startHour = DEFAULT_END_HOUR;
  let endHour = DEFAULT_START_HOUR;
  for (const entry of entries) {
    const s = parseHour(entry.startsAt);
    const e = parseHour(entry.endsAt);
    if (s < startHour) startHour = s;
    if (e > endHour) endHour = e;
  }
  // Pad ±1 hour so context rows appear above/below the schedule
  startHour = Math.max(0, startHour - 1);
  endHour = Math.min(24, endHour + 1);
  return { startHour, endHour };
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function WeeklyScheduleGrid({ entries }: WeeklyScheduleGridProps) {
  const { startHour, endHour } = deriveHourRange(entries);

  // Build hour rows array
  const hours: number[] = [];
  for (let h = startHour; h < endHour; h++) {
    hours.push(h);
  }

  // Group entries by day
  const byDay = new Map<DayKey, WeeklyScheduleEntry[]>();
  for (const day of DAYS) {
    byDay.set(day.key, []);
  }
  for (const entry of entries) {
    const dayKey = entry.day as DayKey;
    const existing = byDay.get(dayKey);
    if (existing) {
      existing.push(entry);
    }
  }

  // Build a set of cells that are "occupied" by a rowSpan entry starting above
  // Key: `${dayKey}-${hour}` → the rowSpan entry that occupies it
  const occupied = new Map<string, WeeklyScheduleEntry>();

  for (const day of DAYS) {
    const dayEntries = byDay.get(day.key) ?? [];
    for (const entry of dayEntries) {
      const startH = parseHour(entry.startsAt);
      const endH = parseHour(entry.endsAt);
      // Mark all hours AFTER the start as occupied (the start hour cell itself renders the entry)
      for (let h = startH + 1; h < endH; h++) {
        occupied.set(`${day.key}-${h}`, entry);
      }
    }
  }

  // Assign a stable color to each course by first appearance (day, then start
  // time) — deterministic within this view and distinct up to the palette size.
  // Keyed by courseName since WeeklyScheduleEntry carries no courseId.
  const courseColorIndex = new Map<string, number>();
  for (const day of DAYS) {
    const dayEntries = [...(byDay.get(day.key) ?? [])].sort(
      (a, b) => parseHour(a.startsAt) - parseHour(b.startsAt)
    );
    for (const entry of dayEntries) {
      if (!courseColorIndex.has(entry.courseName)) {
        courseColorIndex.set(entry.courseName, courseColorIndex.size);
      }
    }
  }
  const paletteFor = (courseName: string) =>
    COURSE_PALETTE[(courseColorIndex.get(courseName) ?? 0) % COURSE_PALETTE.length]!;

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-[32rem] overflow-auto">
      <table
        className="border-collapse text-xs"
        role="table"
        aria-label="Horario semanal"
        style={{ minWidth: "max-content" }}
      >
        <thead>
          <tr>
            {/* Top-left corner: sticky on both axes (z-30 > header z-20 > hour col z-10) */}
            <th
              scope="col"
              className={cn(
                "border border-border p-2 text-center font-semibold text-foreground",
                "bg-muted sticky top-0 left-0 z-30 min-w-[56px]"
              )}
            >
              Hora
            </th>
            {DAYS.map((day) => (
              <th
                key={day.key}
                scope="col"
                className={cn(
                  "border border-border p-2 text-center font-semibold text-foreground",
                  "bg-muted sticky top-0 z-20 min-w-[80px]"
                )}
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              {/* Hour label cell — sticky left; role="rowheader" so it does not pollute "cell" queries */}
              <th
                scope="row"
                className={cn(
                  "border border-border p-1 text-center text-[10px] text-muted-foreground whitespace-nowrap font-normal",
                  "bg-background sticky left-0 z-10 min-w-[56px]"
                )}
              >
                {formatHour(hour)}
              </th>

              {DAYS.map((day) => {
                const cellKey = `${day.key}-${hour}`;

                // Skip cells that are occupied by a rowSpan from a previous row
                if (occupied.has(cellKey)) {
                  return null;
                }

                // Find an entry starting at this hour for this day
                const dayEntries = byDay.get(day.key) ?? [];
                const entry = dayEntries.find((e) => parseHour(e.startsAt) === hour);

                if (entry) {
                  const startH = parseHour(entry.startsAt);
                  const endH = parseHour(entry.endsAt);
                  const rowSpan = Math.max(1, endH - startH);
                  const palette = paletteFor(entry.courseName);

                  return (
                    <td
                      key={day.key}
                      rowSpan={rowSpan}
                      className={cn(
                        "border p-1 align-top",
                        palette.cell,
                        // Clash keeps the course color but adds a strong red ring;
                        // the ⚠ icon + text below make it non-color-only (WCAG 2.2).
                        entry.inClash && "ring-2 ring-inset ring-destructive"
                      )}
                      aria-label={buildAriaLabel(entry, day.label)}
                    >
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-0.5">
                          {/* WCAG: clash icon in addition to color — never color alone */}
                          {entry.inClash && (
                            <span aria-hidden="true" className="text-destructive font-bold">⚠</span>
                          )}
                          <span className="font-medium truncate">{entry.courseName}</span>
                        </div>
                        <div className="text-[10px] opacity-70">
                          {entry.startsAt}–{entry.endsAt}
                        </div>
                        {/* WCAG: clash text label — required in addition to color + icon */}
                        {entry.inClash && (
                          <div className="text-[10px] font-semibold">
                            Choque de horario
                          </div>
                        )}
                      </div>
                    </td>
                  );
                }

                // Empty cell for this hour+day slot
                return (
                  <td
                    key={day.key}
                    className="border border-border p-1 min-h-[28px]"
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {/* Legend: color → materia, as tinted chips that mirror the calendar blocks */}
      {courseColorIndex.size > 0 && (
        <ul
          className="flex flex-wrap gap-2"
          aria-label="Referencia de colores por materia"
        >
          {[...courseColorIndex.keys()].map((name) => {
            const palette = paletteFor(name);
            return (
              <li key={name}>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-xs font-medium",
                    palette.cell
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("h-2 w-2 shrink-0 rounded-full", palette.dot)}
                  />
                  {name}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export { WeeklyScheduleGrid };
