/**
 * SimulationStatusBadge — WCAG 2.2 AA
 *
 * INV-005: every status conveyed by color + icon + text label (never color alone).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SimulationStatusBadge } from "@/features/simulation/components/simulation-status-badge";

describe("SimulationStatusBadge", () => {
  it("CURRENT renders green badge with check icon and label", () => {
    render(<SimulationStatusBadge status="CURRENT" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Vigente");
    expect(badge).toHaveTextContent("✓");
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("Vigente"));
  });

  it("OUTDATED renders yellow badge with warning icon and label", () => {
    render(<SimulationStatusBadge status="OUTDATED" />);
    const badge = screen.getByRole("status");
    expect(badge).toHaveTextContent("Desactualizada");
    expect(badge).toHaveTextContent("⚠");
    expect(badge).toHaveAttribute("aria-label", expect.stringContaining("Desactualizada"));
  });

  it("WCAG: badge always has both text icon and text label (never color alone)", () => {
    const { rerender } = render(<SimulationStatusBadge status="CURRENT" />);
    let badge = screen.getByRole("status");
    // Icon present (aria-hidden span)
    const icons = badge.querySelectorAll("[aria-hidden='true']");
    expect(icons.length).toBeGreaterThan(0);
    // Text label present
    expect(badge.textContent).toBeTruthy();

    rerender(<SimulationStatusBadge status="OUTDATED" />);
    badge = screen.getByRole("status");
    const icons2 = badge.querySelectorAll("[aria-hidden='true']");
    expect(icons2.length).toBeGreaterThan(0);
    expect(badge.textContent).toBeTruthy();
  });
});
