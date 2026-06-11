/**
 * WU5-T06: CourseStatusBadge — WCAG 2.2 AA accessibility
 *
 * Spec: CROSS-5-RENDER
 * Each CourseProgressStatus value must render:
 *   - a visible text label (not color alone)
 *   - an icon element (aria-hidden)
 *
 * Statuses: PENDING, PASSED, FAILED, CANCELLED, AVAILABLE, BLOCKED
 *
 * WU6 (T-WU6.8 / QAL-A11Y-001-S3): vitest-axe assertions confirm zero
 * axe violations at component level (jsdom, no backend required).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
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

  it("shows blocking reason chip with unmet prerequisites when status is BLOCKED", () => {
    render(
      <CourseStatusBadge
        status={CourseProgressStatus.Blocked}
        unmetRequirements={["Álgebra Lineal", "Cálculo Diferencial"]}
      />
    );
    // Primary badge still shows
    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
    // [Recomendado] must NOT appear (distinct from advisory chip)
    expect(screen.queryByText("[Recomendado]")).not.toBeInTheDocument();
    // Blocking reason chip must be present — uses "Falta:" prefix label
    expect(screen.getByText(/Falta:/)).toBeInTheDocument();
    // Each unmet requirement name must be visible/accessible
    expect(screen.getByText(/Álgebra Lineal/)).toBeInTheDocument();
    expect(screen.getByText(/Cálculo Diferencial/)).toBeInTheDocument();
  });

  it("does NOT show blocking reason chip when BLOCKED but no unmetRequirements", () => {
    render(
      <CourseStatusBadge
        status={CourseProgressStatus.Blocked}
        unmetRequirements={[]}
      />
    );
    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
    expect(screen.queryByText(/Falta:/)).not.toBeInTheDocument();
  });

  it("does NOT show blocking reason chip on AVAILABLE courses (available with unmetRequirements shows [Recomendado] only)", () => {
    render(
      <CourseStatusBadge
        status={CourseProgressStatus.Available}
        unmetRequirements={["Cálculo I"]}
      />
    );
    expect(screen.getByText("[Recomendado]")).toBeInTheDocument();
    expect(screen.queryByText(/Falta:/)).not.toBeInTheDocument();
  });
});

/**
 * T-WU6.8 / QAL-A11Y-001-S3 — vitest-axe zero-violation assertions.
 *
 * Runs axe-core at jsdom level for each status variant.
 * Confirms badge structure (aria-label, aria-hidden icon, visible label)
 * produces zero accessibility violations.
 * SUGGESTION-3: WCAG 1.4.3 color-contrast is NOT exercised under jsdom; it is verified by the Playwright e2e sweep.
 */
describe("CourseStatusBadge — axe zero-violations (T-WU6.8)", () => {
  const statuses = Object.values(CourseProgressStatus);

  for (const status of statuses) {
    it(`${status}: no axe violations`, async () => {
      const { container } = render(<CourseStatusBadge status={status} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  }

  it("AVAILABLE with advisory chip: no axe violations", async () => {
    const { container } = render(
      <CourseStatusBadge
        status={CourseProgressStatus.Available}
        unmetRequirements={["Cálculo I"]}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("BLOCKED with unmetRequirements (blocking reason chip): no axe violations", async () => {
    const { container } = render(
      <CourseStatusBadge
        status={CourseProgressStatus.Blocked}
        unmetRequirements={["Álgebra Lineal", "Cálculo Diferencial"]}
      />
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
