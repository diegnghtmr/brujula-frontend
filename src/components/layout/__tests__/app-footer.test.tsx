/**
 * AppFooter — RTL tests (WU-A, Task P0-3).
 *
 * Spec scenarios:
 * - Footer renders a contentinfo landmark (role=contentinfo)
 * - Each column nav has a distinct aria-label that does NOT match "Navegación principal"
 * - All four column headings are present
 * - Links are present in each column
 * - Semantic token classes are applied (bg-background, border-t, border-border)
 * - Fine-print utility row is present
 * - No anchor has href="#" (WU-1 Fix A)
 * - Internal app links use React Router (no full page reload)
 * - External links have rel="noopener noreferrer"
 * - "Versión 1.0" is plain text, NOT a link
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { AppFooter } from "@/components/layout/app-footer";

function createWrapper() {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: ["/dashboard"] }, children);
}

describe("AppFooter (WU-A / P0-3)", () => {
  it("renders a contentinfo landmark (role=contentinfo)", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("does NOT render a navigation with label 'Navegación principal'", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const allNavs = screen.queryAllByRole("navigation", {
      name: /navegación principal/i,
    });
    expect(allNavs).toHaveLength(0);
  });

  it("renders exactly four navigation landmarks with distinct aria-labels", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const navs = screen.getAllByRole("navigation");
    expect(navs).toHaveLength(4);

    const labels = navs.map((n) => n.getAttribute("aria-label"));
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(4);
  });

  it("all four column nav aria-labels include 'Pie de página'", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const navs = screen.getAllByRole("navigation");
    for (const nav of navs) {
      expect(nav.getAttribute("aria-label")).toMatch(/pie de página/i);
    }
  });

  it("renders Recursos column heading", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("heading", { name: /recursos/i })
    ).toBeInTheDocument();
  });

  it("renders Ayuda column heading", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("heading", { name: /ayuda/i })
    ).toBeInTheDocument();
  });

  it("renders Institución column heading", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("heading", { name: /institución/i })
    ).toBeInTheDocument();
  });

  it("renders Acerca de column heading", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("heading", { name: /acerca de/i })
    ).toBeInTheDocument();
  });

  it("renders at least one link in each column nav", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const navs = screen.getAllByRole("navigation");
    for (const nav of navs) {
      const links = nav.querySelectorAll("a");
      expect(links.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("renders the fine-print utility row with copyright text", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    // The fine-print row should contain "Universidad del Quindío" or "Brújula"
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toMatch(/universidad del quindío|brújula/i);
  });

  it("footer element has bg-background and border-t classes (semantic tokens)", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toMatch(/bg-background/);
    expect(footer.className).toMatch(/border-t/);
  });

  it("footer element has rounded-none class (design system convention)", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const footer = screen.getByRole("contentinfo");
    expect(footer.className).toMatch(/rounded-none/);
  });

  // -------------------------------------------------------------------------
  // WU-1 Fix A — No dead '#' links
  // -------------------------------------------------------------------------

  it("no anchor element in the footer has href='#'", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const footer = screen.getByRole("contentinfo");
    const anchors = footer.querySelectorAll("a");
    for (const anchor of anchors) {
      expect(anchor.getAttribute("href")).not.toBe("#");
    }
  });

  it("'Catálogo de asignaturas' link points to /catalog/programs", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /catálogo de asignaturas/i });
    expect(link.getAttribute("href")).toBe("/catalog/programs");
  });

  it("'Simulador de matrícula' link points to /simulations", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /simulador de matrícula/i });
    expect(link.getAttribute("href")).toBe("/simulations");
  });

  it("'Malla curricular' link points to /progress/subscriptions", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /malla curricular/i });
    expect(link.getAttribute("href")).toBe("/progress/subscriptions");
  });

  it("'Calculadora de promedio' link points to /progress/subscriptions", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const link = screen.getByRole("link", { name: /calculadora de promedio/i });
    expect(link.getAttribute("href")).toBe("/progress/subscriptions");
  });

  it("external links in Institución column have rel='noopener noreferrer'", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const institucionNav = screen.getByRole("navigation", {
      name: /institución/i,
    });
    const externalAnchors = Array.from(
      institucionNav.querySelectorAll("a[target='_blank']")
    );
    expect(externalAnchors.length).toBeGreaterThan(0);
    for (const anchor of externalAnchors) {
      expect(anchor.getAttribute("rel")).toBe("noopener noreferrer");
    }
  });

  it("support email links use mailto protocol", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const footer = screen.getByRole("contentinfo");
    const mailtoLinks = Array.from(footer.querySelectorAll("a[href^='mailto:']"));
    expect(mailtoLinks.length).toBeGreaterThan(0);
  });

  it("'Versión 1.0' is plain text — NOT a link", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    // Must appear as text content somewhere
    expect(screen.getByText(/versión 1\.0/i)).toBeInTheDocument();
    // Must NOT be wrapped in an <a> tag
    const footer = screen.getByRole("contentinfo");
    const anchors = Array.from(footer.querySelectorAll("a"));
    const versionLink = anchors.find((a) =>
      a.textContent?.match(/versión 1\.0/i)
    );
    expect(versionLink).toBeUndefined();
  });

  it("bottom 'Términos' link has rel='noopener noreferrer'", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const terminos = screen.getByRole("link", { name: /^términos$/i });
    expect(terminos.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("bottom 'Privacidad' link has rel='noopener noreferrer'", () => {
    render(<AppFooter />, { wrapper: createWrapper() });
    const privacidad = screen.getByRole("link", { name: /^privacidad$/i });
    expect(privacidad.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
