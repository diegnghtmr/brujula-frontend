/**
 * UtilityBar — RTL tests (WU-A, Task P0-4 + FIX-2).
 *
 * Spec scenarios:
 * - UtilityBar renders in the document
 * - It does NOT render a nav with label "Navegación principal"
 * - Its nav has a distinct aria-label
 * - It shows authenticated-context links (NOT "Iniciar sesión")
 * - It applies semantic token classes (bg-secondary, rounded-none)
 * - It never collapses (no hidden class)
 *
 * FIX-2 — Dead-link fixes:
 * - "Encontrar sede" → real external href + rel="noopener noreferrer"
 * - "Ayuda" → real external href + rel="noopener noreferrer"
 * - "Mi cuenta" is NOT rendered
 * - No anchor may have href="#"
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { UtilityBar } from "@/components/layout/utility-bar";

function createWrapper() {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: ["/dashboard"] }, children);
}

describe("UtilityBar (WU-A / P0-4)", () => {
  it("renders in the document", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    // The utility bar renders as a <div> or <section>; test its content is present
    expect(screen.getByRole("navigation", { name: /utilidades/i })).toBeInTheDocument();
  });

  it("does NOT render a navigation with label 'Navegación principal'", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const navs = screen.queryAllByRole("navigation", {
      name: /navegación principal/i,
    });
    expect(navs).toHaveLength(0);
  });

  it("nav aria-label does not match 'Navegación principal'", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const nav = screen.getByRole("navigation");
    expect(nav.getAttribute("aria-label")).not.toMatch(/navegación principal/i);
  });

  it("does NOT show 'Iniciar sesión' link (authenticated context)", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    expect(
      screen.queryByRole("link", { name: /iniciar sesión/i })
    ).not.toBeInTheDocument();
  });

  it("renders 'Encontrar sede' link", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("link", { name: /encontrar sede/i })
    ).toBeInTheDocument();
  });

  it("renders 'Ayuda' link", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("link", { name: /ayuda/i })
    ).toBeInTheDocument();
  });

  it("applies bg-secondary class (semantic token)", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    // The root wrapper element should have bg-secondary
    const nav = screen.getByRole("navigation");
    // Look at the parent — the utility bar container
    const container = nav.closest("[class*='bg-secondary']") ?? nav;
    expect(container.className).toMatch(/bg-secondary/);
  });

  it("applies rounded-none class (design system convention)", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const nav = screen.getByRole("navigation");
    const container = nav.closest("[class*='rounded-none']") ?? nav;
    expect(container.className).toMatch(/rounded-none/);
  });

  it("does not have a 'hidden' class (never collapses)", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const nav = screen.getByRole("navigation");
    expect(nav.className).not.toMatch(/\bhidden\b/);
    const container = nav.parentElement;
    if (container) {
      expect(container.className).not.toMatch(/\bhidden\b/);
    }
  });
});

// ---------------------------------------------------------------------------
// FIX-2 — Dead-link fixes
// ---------------------------------------------------------------------------

describe("UtilityBar — FIX-2 (dead-link fixes)", () => {
  it("'Encontrar sede' link has a real external href (not '#')", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /encontrar sede/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).not.toBe("#");
    expect(href.startsWith("http")).toBe(true);
  });

  it("'Encontrar sede' has target='_blank' and rel='noopener noreferrer'", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /encontrar sede/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("'Ayuda' link has a real external href (not '#' and not mailto:)", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /ayuda/i });
    const href = link.getAttribute("href") ?? "";
    expect(href).not.toBe("#");
    expect(href.startsWith("http")).toBe(true);
  });

  it("'Ayuda' has target='_blank' and rel='noopener noreferrer'", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /ayuda/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("'Mi cuenta' is NOT rendered", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    expect(screen.queryByRole("link", { name: /mi cuenta/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/mi cuenta/i)).not.toBeInTheDocument();
  });

  it("no anchor has href='#'", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("exactly two links are rendered (Encontrar sede + Ayuda)", () => {
    render(<UtilityBar />, { wrapper: createWrapper() });
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
  });
});
