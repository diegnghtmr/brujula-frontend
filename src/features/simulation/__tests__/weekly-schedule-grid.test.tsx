/**
 * WeeklyScheduleGrid — WCAG 2.2 AA + DET-001
 *
 * INV-005: inClash=true → color + icon + ARIA label (never color alone).
 * Assertions: screen-reader announces day+time+course+clash; non-clash do not.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WeeklyScheduleGrid } from "@/features/simulation/components/weekly-schedule-grid";
import type { WeeklyScheduleEntry } from "@/api/generated/models/weekly-schedule-entry";

const NON_CLASH_ENTRY: WeeklyScheduleEntry = {
  day: "WEDNESDAY",
  startsAt: "08:00",
  endsAt: "10:00",
  courseName: "Matemáticas Generales",
  programId: "prog-1",
  selectionId: "sel-1",
  inClash: false,
};

const CLASH_ENTRY: WeeklyScheduleEntry = {
  day: "WEDNESDAY",
  startsAt: "08:00",
  endsAt: "10:00",
  courseName: "Programación I",
  programId: "prog-1",
  selectionId: "sel-2",
  inClash: true,
};

describe("WeeklyScheduleGrid", () => {
  it("renders non-clash sessions without clash indicator", () => {
    render(<WeeklyScheduleGrid entries={[NON_CLASH_ENTRY]} />);
    // Course name appears
    expect(screen.getByText("Matemáticas Generales")).toBeInTheDocument();
    // No clash text/icon present
    expect(screen.queryByText(/choque|clash/i)).not.toBeInTheDocument();
  });

  it("WCAG: clash sessions have ARIA label including clash/choque text", () => {
    render(<WeeklyScheduleGrid entries={[CLASH_ENTRY]} />);
    // ARIA label must include clash indicator text — not color alone
    const clashCell = screen.getByRole("cell", { name: /choque|clash/i });
    expect(clashCell).toBeInTheDocument();
  });

  it("WCAG: clash sessions have icon (aria-hidden) — not color alone", () => {
    render(<WeeklyScheduleGrid entries={[CLASH_ENTRY]} />);
    const clashCell = screen.getByRole("cell", { name: /choque|clash/i });
    // aria-hidden icon must be present inside cell
    const icon = clashCell.querySelector("[aria-hidden='true']");
    expect(icon).not.toBeNull();
  });

  it("screen-reader label includes day, time, course name for non-clash", () => {
    render(<WeeklyScheduleGrid entries={[NON_CLASH_ENTRY]} />);
    // Cell accessible name must include day + time + course
    const cell = screen.getByRole("cell", { name: /miércoles|wednesday|08:00|Matemáticas Generales/i });
    expect(cell).toBeInTheDocument();
  });

  it("screen-reader label for clash includes clash status text", () => {
    render(<WeeklyScheduleGrid entries={[CLASH_ENTRY]} />);
    const cell = screen.getByRole("cell", { name: /choque|clash/i });
    // Must include course name too
    expect(cell).toHaveAccessibleName(expect.stringMatching(/Programación I/));
  });

  it("renders empty grid when no entries provided", () => {
    render(<WeeklyScheduleGrid entries={[]} />);
    // Grid should still render the day headers
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  // ─── Task 4 (#12): Time-grid calendar tests ───────────────────────────────────

  it("hour column renders labels covering the entries' time range", () => {
    const entry: WeeklyScheduleEntry = {
      day: "MONDAY",
      startsAt: "09:00",
      endsAt: "11:00",
      courseName: "Cálculo I",
      programId: "prog-1",
      selectionId: "sel-3",
      inClash: false,
    };
    render(<WeeklyScheduleGrid entries={[entry]} />);
    // Hours 09:00 and 10:00 must appear as row headers
    expect(screen.getByRole("rowheader", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "10:00" })).toBeInTheDocument();
  });

  it("session block appears in the correct day column with course name and time", () => {
    const entry: WeeklyScheduleEntry = {
      day: "TUESDAY",
      startsAt: "10:00",
      endsAt: "12:00",
      courseName: "Álgebra Lineal",
      programId: "prog-1",
      selectionId: "sel-4",
      inClash: false,
    };
    render(<WeeklyScheduleGrid entries={[entry]} />);
    // Course name visible
    expect(screen.getByText("Álgebra Lineal")).toBeInTheDocument();
    // Time visible
    expect(screen.getByText("10:00–12:00")).toBeInTheDocument();
    // Cell is in the "Mar" column (Tuesday) — verify the aria-label
    const cell = screen.getByRole("cell", { name: /Álgebra Lineal/i });
    expect(cell).toHaveAccessibleName(expect.stringMatching(/Mar/));
  });

  it("clashing entry shows ⚠ icon and 'Choque de horario' text", () => {
    render(<WeeklyScheduleGrid entries={[CLASH_ENTRY]} />);
    // Warning icon visible (aria-hidden)
    const icon = document.querySelector("[aria-hidden='true']");
    expect(icon).not.toBeNull();
    expect(icon?.textContent).toBe("⚠");
    // Clash text visible
    expect(screen.getByText("Choque de horario")).toBeInTheDocument();
  });

  it("header row has sticky top class and hour column has sticky left class", () => {
    render(<WeeklyScheduleGrid entries={[NON_CLASH_ENTRY]} />);
    const table = screen.getByRole("table");

    // Day column headers in thead should have sticky top
    const dayHeaders = table.querySelectorAll("thead th");
    for (const th of dayHeaders) {
      expect(th.className).toContain("sticky");
      expect(th.className).toContain("top-0");
    }

    // Row headers (hour labels) in tbody should have sticky left
    const rowHeaders = table.querySelectorAll("tbody th[scope='row']");
    expect(rowHeaders.length).toBeGreaterThan(0);
    for (const th of rowHeaders) {
      expect(th.className).toContain("sticky");
      expect(th.className).toContain("left-0");
    }
  });

  it("empty entries → renders default hour range and does not crash", () => {
    render(<WeeklyScheduleGrid entries={[]} />);
    // Table renders with hour headers covering default range (e.g. 06:00)
    expect(screen.getByRole("table")).toBeInTheDocument();
    // Default range starts at 06:00
    expect(screen.getByRole("rowheader", { name: "06:00" })).toBeInTheDocument();
    // Day column headers present
    expect(screen.getByRole("columnheader", { name: "Lun" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Dom" })).toBeInTheDocument();
  });

  // ─── #15: ±1 hour padding for deriveHourRange ─────────────────────────────────

  it("#15: single entry 07:00–09:00 renders '06:00' label (padded below) and '09:00' label (padded above)", () => {
    const entry: WeeklyScheduleEntry = {
      day: "MONDAY",
      startsAt: "07:00",
      endsAt: "09:00",
      courseName: "Intro a la Programación",
      programId: "prog-1",
      selectionId: "sel-pad",
      inClash: false,
    };
    render(<WeeklyScheduleGrid entries={[entry]} />);

    // 06:00 row must appear (padded startHour = 7 - 1 = 6)
    expect(screen.getByRole("rowheader", { name: "06:00" })).toBeInTheDocument();

    // 09:00 row must appear (endHour = 9 + 1 = 10, loop h < 10, so 09:00 row exists)
    expect(screen.getByRole("rowheader", { name: "09:00" })).toBeInTheDocument();
  });

  it("#15: hour column covers [startHour-1] through [endHour] for a tight range entry", () => {
    const entry: WeeklyScheduleEntry = {
      day: "TUESDAY",
      startsAt: "10:00",
      endsAt: "12:00",
      courseName: "Álgebra",
      programId: "prog-1",
      selectionId: "sel-pad2",
      inClash: false,
    };
    render(<WeeklyScheduleGrid entries={[entry]} />);

    // Padded start: 10 - 1 = 9 → 09:00 row exists
    expect(screen.getByRole("rowheader", { name: "09:00" })).toBeInTheDocument();
    // Padded end: 12 + 1 = 13 → loop h < 13 → 12:00 row exists
    expect(screen.getByRole("rowheader", { name: "12:00" })).toBeInTheDocument();
    // Without padding, 09:00 would be absent (pre-change tight behavior check)
    // 08:00 must NOT exist (one row above the padded start)
    expect(screen.queryByRole("rowheader", { name: "08:00" })).not.toBeInTheDocument();
  });
});
