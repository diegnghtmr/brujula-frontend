/**
 * CourseCard — unit tests
 *
 * #22 + #25: expandable card with uniform collapsed height and detailed expanded view.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CourseCard } from "@/features/curriculum/components/course-card";
import type { MallaCourse } from "@/api/generated/models/malla-course";

function makeCourse(overrides: Partial<MallaCourse> = {}): MallaCourse {
  return {
    id: "c-1",
    name: "Lógica de Programación",
    type: "REQUIRED",
    credits: 3,
    requirements: [],
    ...overrides,
  };
}

const COURSE_NAMES = new Map([
  ["c-req", "Matemáticas I"],
  ["c-seq", "Física I"],
]);

describe("CourseCard — collapsed state (#22)", () => {
  it("renders course name and credits line", () => {
    render(
      <CourseCard course={makeCourse()} courseNames={new Map()} />
    );

    expect(screen.getByText("Lógica de Programación")).toBeInTheDocument();
    expect(screen.getByText(/3 cr/i)).toBeInTheDocument();
  });

  it("does NOT show confidence badges (ALTA/MEDIA/BAJA) in collapsed state", () => {
    const course = makeCourse({
      requirements: [
        {
          type: "COURSE_PASSED",
          requiredCourseId: "c-req",
          confidence: "HIGH",
          inferred: false,
          simultaneityAllowed: false,
        },
      ],
    });

    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    expect(screen.queryByText("ALTA")).not.toBeInTheDocument();
    expect(screen.queryByText("MEDIA")).not.toBeInTheDocument();
    expect(screen.queryByText("BAJA")).not.toBeInTheDocument();
  });

  it("does NOT show Requisitos section while collapsed", () => {
    const course = makeCourse({
      requirements: [
        {
          type: "COURSE_PASSED",
          requiredCourseId: "c-req",
          confidence: "HIGH",
        },
      ],
    });

    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    expect(screen.queryByText(/requisitos:/i)).not.toBeInTheDocument();
  });

  it("renders an expand toggle button with aria-expanded=false initially", () => {
    render(
      <CourseCard course={makeCourse()} courseNames={new Map()} />
    );

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("CourseCard — expanded state (#25)", () => {
  it("shows Requisitos section after clicking the toggle", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "COURSE_PASSED",
          requiredCourseId: "c-req",
          confidence: "HIGH",
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText(/requisitos:/i)).toBeInTheDocument();
  });

  it("resolves COURSE_PASSED requirement to course name when id is in the map", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "COURSE_PASSED",
          requiredCourseId: "c-req",
          confidence: "HIGH",
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText(/aprobar: matemáticas i/i)).toBeInTheDocument();
  });

  it("uses fallback text when requiredCourseId is NOT in the map", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "COURSE_PASSED",
          requiredCourseId: "c-unknown",
          confidence: "HIGH",
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    await user.click(screen.getByRole("button"));

    expect(
      screen.getByText(/aprobar: una materia requerida/i)
    ).toBeInTheDocument();
  });

  it("shows 'Sin requisitos' when requirements is empty", async () => {
    const user = userEvent.setup();
    render(
      <CourseCard course={makeCourse({ requirements: [] })} courseNames={new Map()} />
    );

    await user.click(screen.getByRole("button"));

    expect(screen.getByText(/sin requisitos/i)).toBeInTheDocument();
  });

  it("resolves SEQUENCE requirement with course name", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "SEQUENCE",
          requiredCourseId: "c-seq",
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText(/cursar en secuencia con: física i/i)).toBeInTheDocument();
  });

  it("renders MINIMUM_CREDITS requirement label", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "MINIMUM_CREDITS",
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={new Map()} />);

    await user.click(screen.getByRole("button"));

    expect(
      screen.getByText(/requiere créditos mínimos aprobados/i)
    ).toBeInTheDocument();
  });

  it("renders CONFIGURABLE requirement label", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "CONFIGURABLE",
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={new Map()} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText(/requisito configurable/i)).toBeInTheDocument();
  });

  it("appends simultaneity note when simultaneityAllowed is true", async () => {
    const course = makeCourse({
      requirements: [
        {
          type: "COURSE_PASSED",
          requiredCourseId: "c-req",
          simultaneityAllowed: true,
        },
      ],
    });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={COURSE_NAMES} />);

    await user.click(screen.getByRole("button"));

    expect(
      screen.getByText(/puede cursarse en simultáneo/i)
    ).toBeInTheDocument();
  });

  it("toggle button has aria-expanded=true when expanded", async () => {
    const user = userEvent.setup();
    render(
      <CourseCard course={makeCourse()} courseNames={new Map()} />
    );

    const btn = screen.getByRole("button");
    await user.click(btn);

    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("shows officialCode when present", async () => {
    const course = makeCourse({ officialCode: "MAT-101" });

    const user = userEvent.setup();
    render(<CourseCard course={course} courseNames={new Map()} />);

    await user.click(screen.getByRole("button"));

    expect(screen.getByText(/código: mat-101/i)).toBeInTheDocument();
  });
});
