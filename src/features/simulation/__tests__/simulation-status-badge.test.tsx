/**
 * SimulationStatusBadge — WCAG 2.2 AA
 *
 * INV-005: every status conveyed by color + icon + text label (never color alone).
 *
 * WU6 (T-WU6.8 / QAL-A11Y-001-S3): vitest-axe zero-violation assertions.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { SimulationStatusBadge } from "@/features/simulation/components/simulation-status-badge";

describe("SimulationStatusBadge", () => {
  it("CURRENT renders green badge with label", () => {
    render(<SimulationStatusBadge status="CURRENT" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Vigente");
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("Vigente"));
  });

  it("OUTDATED renders yellow badge with label", () => {
    render(<SimulationStatusBadge status="OUTDATED" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Desactualizada");
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("Desactualizada"));
  });

  it("WCAG: badge has text label (text alone conveys state)", () => {
    const { rerender } = render(<SimulationStatusBadge status="CURRENT" />);
    let badge = screen.getByRole("status");
    // Text label present
    expect(badge.textContent).toBeTruthy();
    expect(badge).toHaveTextContent("Vigente");

    rerender(<SimulationStatusBadge status="OUTDATED" />);
    badge = screen.getByRole("status");
    expect(badge.textContent).toBeTruthy();
    expect(badge).toHaveTextContent("Desactualizada");
  });
});

/**
 * T-WU6.8 / QAL-A11Y-001-S3 — vitest-axe zero-violation assertions.
 * SUGGESTION-3: WCAG 1.4.3 color-contrast is NOT exercised under jsdom; it is verified by the Playwright e2e sweep.
 */
describe("SimulationStatusBadge — axe zero-violations (T-WU6.8)", () => {
  it("CURRENT: no axe violations", async () => {
    const { container } = render(<SimulationStatusBadge status="CURRENT" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("OUTDATED: no axe violations", async () => {
    const { container } = render(<SimulationStatusBadge status="OUTDATED" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
