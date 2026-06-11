/**
 * AuthenticatedShell — Slice A landmark composition tests.
 *
 * Spec scenario: "Shell renders all three landmarks"
 * - GIVEN a student is authenticated
 * - WHEN AuthenticatedShell renders
 * - THEN the document contains role="banner", role="navigation", and role="main" landmarks
 *
 * Also asserts that there is exactly ONE navigation landmark with the label
 * "Navegación principal" — no page may duplicate this landmark.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { createElement, type ReactNode } from "react";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

// localStorage mock — ThemeToggle (inside the shell) reads/writes localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      ThemeProvider,
      { defaultTheme: "light" },
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(MemoryRouter, { initialEntries: ["/dashboard"] }, children)
      )
    );
}

describe("AuthenticatedShell — landmark composition (Slice A)", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorageMock.clear();
    sessionStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("renders a banner landmark (role=banner)", () => {
    render(
      <AuthenticatedShell>
        <p>Child content</p>
      </AuthenticatedShell>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("renders a navigation landmark with label 'Navegación principal' (role=navigation)", () => {
    render(
      <AuthenticatedShell>
        <p>Child content</p>
      </AuthenticatedShell>,
      { wrapper: createWrapper() }
    );

    expect(
      screen.getByRole("navigation", { name: /navegación principal/i })
    ).toBeInTheDocument();
  });

  it("renders a main landmark (role=main)", () => {
    render(
      <AuthenticatedShell>
        <p>Child content</p>
      </AuthenticatedShell>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("all three landmarks coexist in the same document", () => {
    render(
      <AuthenticatedShell>
        <p>Child content</p>
      </AuthenticatedShell>,
      { wrapper: createWrapper() }
    );

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: /navegación principal/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  it("there is exactly ONE navigation landmark labeled 'Navegación principal'", () => {
    render(
      <AuthenticatedShell>
        <p>Child content</p>
      </AuthenticatedShell>,
      { wrapper: createWrapper() }
    );

    const navLandmarks = screen.getAllByRole("navigation", {
      name: /navegación principal/i,
    });
    expect(navLandmarks).toHaveLength(1);
  });

  it("children are rendered inside the main landmark", () => {
    render(
      <AuthenticatedShell>
        <p>Unique child text</p>
      </AuthenticatedShell>,
      { wrapper: createWrapper() }
    );

    const main = screen.getByRole("main");
    expect(main).toHaveTextContent("Unique child text");
  });
});
