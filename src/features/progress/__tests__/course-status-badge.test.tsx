/**
 * CourseStatusBadge — WCAG 2.2 AA accessibility
 *
 * Each CourseProgressStatus value must render:
 *   - a visible text label (not color alone)
 *   - color + text only (no icon element)
 *
 * Statuses: PENDING, PASSED, FAILED, CANCELLED, AVAILABLE, BLOCKED
 *
 * vitest-axe assertions confirm zero axe violations at component level
 * (jsdom, no backend required).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { CourseStatusBadge } from "@/features/progress/components/course-status-badge";
import { CourseProgressStatus } from "@/api/generated/models/course-progress-status";

describe("CourseStatusBadge (CROSS-5-RENDER)", () => {
  it("renders PENDING with visible text label", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Pending} />);
    expect(screen.getByText("Pendiente")).toBeInTheDocument();
  });

  it("renders PASSED with visible text label 'Aprobada'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Passed} />);
    expect(screen.getByText("Aprobada")).toBeInTheDocument();
  });

  it("renders FAILED with visible text label 'Reprobada'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Failed} />);
    expect(screen.getByText("Reprobada")).toBeInTheDocument();
  });

  it("renders CANCELLED with visible text label 'Cancelada'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Cancelled} />);
    expect(screen.getByText("Cancelada")).toBeInTheDocument();
  });

  it("renders AVAILABLE with visible text label 'Disponible'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Available} />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("renders BLOCKED with visible text label 'Bloqueada'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Blocked} />);
    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
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

  it("does NOT show blocking reason chip when BLOCKED and unmetRequirements is undefined (omitted)", () => {
    // unmetRequirements prop is intentionally omitted — must not crash and must not render chip
    render(<CourseStatusBadge status={CourseProgressStatus.Blocked} />);
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
 * Guard tests — badge mapping regression.
 * These guard that:
 *   - AVAILABLE (habilitada) renders outline classes and NOT a solid bg-state-habilitada.
 *   - CANCELLED (cancelada) renders bg-warning-subtle and NOT bg-state-cancelada solid.
 * If the class mapping regresses back to solid state-* tokens, these tests fail immediately.
 */
describe("CourseStatusBadge — §6.3 class mapping guards", () => {
  it("AVAILABLE badge has outline classes (border-success, bg-background) and no solid bg-state-habilitada", () => {
    const { container } = render(
      <CourseStatusBadge status={CourseProgressStatus.Available} />
    );
    // The primary status badge span is the first span with aria-label
    const badge = container.querySelector("[aria-label^='Estado:']");
    expect(badge).not.toBeNull();
    const cls = badge!.className;
    expect(cls).toContain("border-success");
    expect(cls).toContain("bg-background");
    expect(cls).not.toContain("bg-state-habilitada");
  });

  it("CANCELLED badge has bg-warning-subtle and no solid bg-state-cancelada", () => {
    const { container } = render(
      <CourseStatusBadge status={CourseProgressStatus.Cancelled} />
    );
    const badge = container.querySelector("[aria-label^='Estado:']");
    expect(badge).not.toBeNull();
    const cls = badge!.className;
    expect(cls).toContain("bg-warning-subtle");
    expect(cls).not.toContain("bg-state-cancelada");
  });
});

/**
 * vitest-axe zero-violation assertions.
 *
 * Runs axe-core at jsdom level for each status variant.
 * Confirms badge structure (aria-label, aria-hidden icon, visible label)
 * produces zero accessibility violations.
 * WCAG 1.4.3 color-contrast is NOT exercised under jsdom; it is verified by the Playwright e2e sweep.
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

/**
 * Glyph-removal guards (Change 3).
 *
 * Icons are removed from status badges. Text labels must remain intact
 * (WCAG: text alone is sufficient since aria-label on the wrapper conveys state).
 */
describe("CourseStatusBadge — text labels present after icon removal", () => {
  it("AVAILABLE badge still renders text label 'Disponible'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Available} />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();
  });

  it("BLOCKED badge still renders text label 'Bloqueada'", () => {
    render(<CourseStatusBadge status={CourseProgressStatus.Blocked} />);
    expect(screen.getByText("Bloqueada")).toBeInTheDocument();
  });

  it("blocking-reason chip still renders 'Falta:' text label and prerequisite names", () => {
    render(
      <CourseStatusBadge
        status={CourseProgressStatus.Blocked}
        unmetRequirements={["Cálculo I"]}
      />
    );
    expect(screen.getByText(/Falta:/)).toBeInTheDocument();
    expect(screen.getByText(/Cálculo I/)).toBeInTheDocument();
  });

  it("primary badge has no aria-hidden icon spans after glyph removal", () => {
    const { container } = render(
      <CourseStatusBadge status={CourseProgressStatus.Available} />
    );
    const badge = container.querySelector("[aria-label^='Estado:']");
    const iconSpans = badge?.querySelectorAll("[aria-hidden='true']") ?? [];
    expect(iconSpans.length).toBe(0);
  });
});
