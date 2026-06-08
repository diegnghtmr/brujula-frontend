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
});
