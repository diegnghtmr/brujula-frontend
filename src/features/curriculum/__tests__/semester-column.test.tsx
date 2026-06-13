/**
 * SemesterColumn — unit tests
 *
 * #23: header shows total credits alongside materia count.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SemesterColumn } from "@/features/curriculum/components/semester-column";
import type { PlanMallaSemesterBucketsInner } from "@/api/generated/models/plan-malla-semester-buckets-inner";

const COURSE_NAMES = new Map<string, string>();

function makeBucket(
  semester: number,
  courses: Array<{ id: string; credits: number }>
): PlanMallaSemesterBucketsInner {
  return {
    recommendedSemester: semester,
    courses: courses.map((c) => ({
      id: c.id,
      name: `Materia ${c.id}`,
      type: "REQUIRED" as const,
      credits: c.credits,
      requirements: [],
    })),
  };
}

describe("SemesterColumn — credit total in header (#23)", () => {
  it("shows correct total credits for 3 courses (3+4+2 = 9)", () => {
    const bucket = makeBucket(1, [
      { id: "c1", credits: 3 },
      { id: "c2", credits: 4 },
      { id: "c3", credits: 2 },
    ]);

    render(<SemesterColumn bucket={bucket} courseNames={COURSE_NAMES} />);

    expect(screen.getByText(/9 créditos/i)).toBeInTheDocument();
  });

  it("shows '3 materias' for a bucket with 3 courses", () => {
    const bucket = makeBucket(1, [
      { id: "c1", credits: 3 },
      { id: "c2", credits: 4 },
      { id: "c3", credits: 2 },
    ]);

    render(<SemesterColumn bucket={bucket} courseNames={COURSE_NAMES} />);

    expect(screen.getByText(/3 materias/i)).toBeInTheDocument();
  });

  it("uses singular 'materia' and 'crédito' for 1 course of 1 credit", () => {
    const bucket = makeBucket(2, [{ id: "c1", credits: 1 }]);

    render(<SemesterColumn bucket={bucket} courseNames={COURSE_NAMES} />);

    expect(screen.getByText(/1 materia/i)).toBeInTheDocument();
    expect(screen.getByText(/1 crédito/i)).toBeInTheDocument();
  });

  it("handles plural credits correctly (e.g. 6 créditos)", () => {
    const bucket = makeBucket(3, [
      { id: "c1", credits: 3 },
      { id: "c2", credits: 3 },
    ]);

    render(<SemesterColumn bucket={bucket} courseNames={COURSE_NAMES} />);

    expect(screen.getByText(/6 créditos/i)).toBeInTheDocument();
  });
});
