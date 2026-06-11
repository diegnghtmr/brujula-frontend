/**
 * BackLink — unit tests for the reusable back navigation affordance.
 *
 * Spec scenarios:
 * 1. Renders default label "Volver" when no label prop is provided.
 * 2. Renders a custom label when one is provided.
 * 3. When `to` is provided, renders an anchor <Link> pointing to the given path.
 * 4. When `to` is omitted, renders a <button> that calls navigate(-1) on click.
 * 5. The ArrowLeft icon is aria-hidden (decorative).
 * 6. The element has an accessible aria-label.
 * 7. The component is NOT a <nav> landmark (must not add a navigation landmark).
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BackLink } from "@/components/layout/back-link";

// Mock useNavigate — must be hoisted before any import that uses the module
const mockNavigate = vi.fn();

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(MemoryRouter, { initialEntries: ["/some-page"] }, children)
    );
}

describe("BackLink", () => {
  it("renders default label 'Volver' when no label prop is provided", () => {
    render(<BackLink />, { wrapper: createWrapper() });
    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("renders a custom label when provided", () => {
    render(<BackLink label="Regresar al inicio" />, { wrapper: createWrapper() });
    expect(screen.getByText("Regresar al inicio")).toBeInTheDocument();
  });

  it("renders an anchor link pointing to the given `to` path", () => {
    render(<BackLink to="/catalog/programs" />, { wrapper: createWrapper() });
    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/catalog/programs");
  });

  it("renders a button (not a link) when `to` is omitted", () => {
    render(<BackLink />, { wrapper: createWrapper() });
    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("calls navigate(-1) when the button is clicked (no `to`) and history idx > 0", async () => {
    // W-2: simulate an SPA history entry so navigate(-1) is safe to call
    vi.stubGlobal("window", {
      ...window,
      history: {
        ...window.history,
        state: { idx: 1 },
      },
    });

    const user = userEvent.setup();
    render(<BackLink />, { wrapper: createWrapper() });
    await user.click(screen.getByRole("button"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);

    vi.unstubAllGlobals();
  });

  it("the ArrowLeft icon is aria-hidden (decorative)", () => {
    render(<BackLink />, { wrapper: createWrapper() });
    // The SVG rendered by lucide-react should carry aria-hidden="true"
    const icon = document.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });

  it("has an accessible aria-label containing the label text", () => {
    render(<BackLink />, { wrapper: createWrapper() });
    // Either the button or link should have an aria-label
    const el = screen.getByRole("button");
    expect(el).toHaveAttribute("aria-label");
  });

  it("has an accessible aria-label containing the custom label text", () => {
    render(<BackLink label="Mis simulaciones" />, { wrapper: createWrapper() });
    const el = screen.getByRole("button");
    expect(el.getAttribute("aria-label")).toContain("Mis simulaciones");
  });

  it("does NOT render a <nav> landmark — BackLink must not add a navigation region", () => {
    render(<BackLink to="/dashboard" />, { wrapper: createWrapper() });
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("the link variant does NOT render a <nav> landmark either", () => {
    render(<BackLink to="/catalog/programs" />, { wrapper: createWrapper() });
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // W-2 guard tests: navigate(-1) vs dashboard fallback
  // -------------------------------------------------------------------------

  it("W-2.a: calls navigate(-1) when window.history.state.idx > 0", async () => {
    // Simulate React Router having set idx > 0 on history state
    vi.stubGlobal("window", {
      ...window,
      history: {
        ...window.history,
        state: { idx: 2 },
      },
    });

    const user = userEvent.setup();
    render(<BackLink />, { wrapper: createWrapper() });
    await user.click(screen.getByRole("button"));

    expect(mockNavigate).toHaveBeenCalledWith(-1);

    vi.unstubAllGlobals();
  });

  it("W-2.b: falls back to navigate('/dashboard', {replace:true}) when idx is 0", async () => {
    vi.stubGlobal("window", {
      ...window,
      history: {
        ...window.history,
        state: { idx: 0 },
      },
    });

    const user = userEvent.setup();
    render(<BackLink />, { wrapper: createWrapper() });
    await user.click(screen.getByRole("button"));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });

    vi.unstubAllGlobals();
  });

  it("W-2.c: falls back to navigate('/dashboard', {replace:true}) when history state is undefined", async () => {
    vi.stubGlobal("window", {
      ...window,
      history: {
        ...window.history,
        state: null,
      },
    });

    const user = userEvent.setup();
    render(<BackLink />, { wrapper: createWrapper() });
    await user.click(screen.getByRole("button"));

    expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });

    vi.unstubAllGlobals();
  });
});
