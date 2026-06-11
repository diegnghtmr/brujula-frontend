/**
 * WeeklyScheduleGrid — DET-001, FE-004, INV-005
 *
 * 7-day grid showing all simulation sessions.
 * WCAG 2.2 AA: inClash=true → color + icon + ARIA label (never color alone).
 * Screen-reader: each cell aria-label includes day + time + course + clash status.
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

type DayKey = (typeof DAYS)[number]["key"];

interface WeeklyScheduleGridProps {
  entries: WeeklyScheduleEntry[];
}

function buildAriaLabel(entry: WeeklyScheduleEntry, dayLabel: string): string {
  const clash = entry.inClash ? " — Choque de horario" : "";
  return `${dayLabel} ${entry.startsAt}–${entry.endsAt}: ${entry.courseName}${clash}`;
}

function WeeklyScheduleGrid({ entries }: WeeklyScheduleGridProps) {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs" role="table" aria-label="Horario semanal">
        <thead>
          <tr>
            {DAYS.map((day) => (
              <th
                key={day.key}
                scope="col"
                className="border border-border p-2 text-center font-semibold text-foreground bg-muted/30 min-w-[80px]"
              >
                {day.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {DAYS.map((day) => {
              const dayEntries = byDay.get(day.key) ?? [];
              return (
                <td
                  key={day.key}
                  className="border border-border p-1 align-top min-h-[60px] w-[80px]"
                  aria-label={
                    dayEntries.length > 0
                      ? dayEntries.map((e) => buildAriaLabel(e, day.label)).join("; ")
                      : `${day.label}: sin clases`
                  }
                >
                  <div className="flex flex-col gap-1">
                    {dayEntries.map((entry, idx) => (
                      <div
                        key={entry.selectionId ?? `${day.key}-${idx}`}
                        className={cn(
                          "p-1 rounded text-xs font-medium border",
                          entry.inClash
                            // §2.4/§6.7: conflict/choque → destructive-subtle
                            ? "bg-destructive-subtle text-destructive-subtle-foreground border-transparent"
                            // §2.4/§6.7: normal session → info-subtle (en curso)
                            : "bg-info-subtle text-info-subtle-foreground border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-0.5">
                          {/* WCAG: clash icon in addition to color — never color alone */}
                          {entry.inClash && (
                            <span aria-hidden="true" className="text-destructive font-bold">⚠</span>
                          )}
                          <span className="truncate">{entry.courseName}</span>
                        </div>
                        <div className="text-[10px] opacity-70">
                          {entry.startsAt}–{entry.endsAt}
                        </div>
                        {/* WCAG: clash text label — required in addition to color + icon */}
                        {entry.inClash && (
                          <div className="text-[10px] text-destructive font-semibold">
                            Choque de horario
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export { WeeklyScheduleGrid };
