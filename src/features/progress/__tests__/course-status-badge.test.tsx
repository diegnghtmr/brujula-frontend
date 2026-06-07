/**
 * WU5-T06: CourseStatusBadge — WCAG 2.2 AA accessibility
 *
 * Spec: CROSS-5-RENDER
 * Each CourseProgressStatus value must render:
 *   - a visible text label (not color alone)
 *   - an icon element (aria-hidden)
 *
 * Statuses: PENDING, PASSED, FAILED, CANCELLED, AVAILABLE, BLOCKED
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CourseStatusBadge } from "@/features/progress/components/course-status-badge";
import { CourseProgressStatus } from "@/api/generated/models/course-progress-status";

describe("CourseStatusBadge (CROSS-5-RENDER)", () => {
  it("renders PENDING with visible text label and icon", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Pending} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
    // Icon must be present (aria-hidden span)
    const icons = document.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders PASSED with visible text label 'Aprobada' and icon", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Passed} />);
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
    const icons = document.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders FAILED with visible text label 'Reprobada' and icon", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Failed} />);
    expect(screen.getByText("Reprobada")).toBeInTheDocument();
    const icons = document.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders CANCELLED with visible text label 'Cancelada' and icon", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Cancelled} />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
    const icons = document.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders AVAILABLE with visible text label 'Disponible' and icon", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Available} />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    const icons = document.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders BLOCKED with visible text label 'Bloqueada' and icon", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Blocked} />);
    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
    const icons = document.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("shows [Recomendado] advisory chip when unmetRequirements present on AVAILABLE", () => {
    render(
      <CourseStatusBadge
        status={CourseProgressStatus.Available}
        unmetRequirements={["Cálculo I"]}
      />
    );
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("[Recomendado]")).toBeInTheDocument();
  });

  it("does NOT show [Recomendado] when status is BLOCKED (hard block, not advisory)", () => {
    render(
      <CourseStatusBadge
        status={CourseProgressStatus.Blocked}
        unmetRequirements={["Cálculo I"]}
      />
    );
    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
    expect(screen.queryByText("[Recomendado]")).not.toBeInTheDocument();
  });
});
