/**
 * AppNav — A.3.1 RED tests (Slice A).
 *
 * Spec scenarios:
 * - Nav renders all required links (getByRole navigation landmark)
 * - Active route link carries aria-current="page"
 * - Focus ring class present on nav links
 * - No other nav link has aria-current when one is active
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import { createElement, type ReactNode } from "react";
import { AppNav } from "@/components/layout/app-nav";

function createWrapper(initialPath = "/dashboard") {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
}

describe("AppNav", () => {
  it("renders a navigation landmark with aria-label 'Navegación principal'", () => {
    render(
      <Routes>
        <Route path="/dashboard" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/dashboard") }
    );

    expect(
      screen.getByRole("navigation", { name: /navegación principal/i })
    ).toBeInTheDocument();
  });

  it("renders exactly four nav links with correct Spanish labels", () => {
    render(
      <Routes>
        <Route path="/dashboard" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/dashboard") }
    );

    expect(screen.getByRole("link", { name: /inicio/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mis suscripciones/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /mis simulaciones/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /catálogo/i })).toBeInTheDocument();
  });

  it("Inicio link points to /dashboard", () => {
    render(
      <Routes>
        <Route path="/dashboard" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/dashboard") }
    );

    expect(screen.getByRole("link", { name: /inicio/i })).toHaveAttribute("href", "/dashboard");
  });

  it("Mis suscripciones link points to /progress/subscriptions", () => {
    render(
      <Routes>
        <Route path="/progress/subscriptions" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/progress/subscriptions") }
    );

    expect(screen.getByRole("link", { name: /mis suscripciones/i })).toHaveAttribute(
      "href",
      "/progress/subscriptions"
    );
  });

  it("Mis simulaciones link points to /simulations", () => {
    render(
      <Routes>
        <Route path="/simulations" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/simulations") }
    );

    expect(screen.getByRole("link", { name: /mis simulaciones/i })).toHaveAttribute(
      "href",
      "/simulations"
    );
  });

  it("Catálogo link points to /catalog/programs", () => {
    render(
      <Routes>
        <Route path="/catalog/programs" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/catalog/programs") }
    );

    expect(screen.getByRole("link", { name: /catálogo/i })).toHaveAttribute(
      "href",
      "/catalog/programs"
    );
  });

  it("active route link carries aria-current='page' and no other link does", () => {
    render(
      <Routes>
        <Route path="/dashboard" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/dashboard") }
    );

    const activeLink = screen.getByRole("link", { name: /inicio/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    // No other link should carry aria-current
    const allLinks = screen.getAllByRole("link");
    const otherLinks = allLinks.filter((l) => l !== activeLink);
    for (const link of otherLinks) {
      expect(link).not.toHaveAttribute("aria-current", "page");
    }
  });

  it("active route updates when rendering at /simulations", () => {
    render(
      <Routes>
        <Route path="/simulations" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/simulations") }
    );

    const activeLink = screen.getByRole("link", { name: /mis simulaciones/i });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    const inicioLink = screen.getByRole("link", { name: /inicio/i });
    expect(inicioLink).not.toHaveAttribute("aria-current", "page");
  });

  it("nav link shows visible focus ring (ring-2 class) when keyboard-focused via Tab", async () => {
    const user = userEvent.setup();

    render(
      <Routes>
        <Route path="/dashboard" element={<AppNav />} />
      </Routes>,
      { wrapper: createWrapper("/dashboard") }
    );

    // Tab into the nav — the first link should receive focus
    await user.tab();

    const focusedElement = document.activeElement;
    expect(focusedElement).not.toBeNull();
    expect(focusedElement?.tagName.toLowerCase()).toBe("a");

    // The focused link must carry the ring-2 token so the focus ring is visible.
    // This catches the regression where focus-visible:outline-none stays but
    // focus-visible:ring-2 is removed — that would leave users with no indicator.
    expect(focusedElement?.className).toMatch(/ring-2/);
  });
});
