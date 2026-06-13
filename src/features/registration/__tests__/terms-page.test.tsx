/**
 * TermsPage — renders heading and back link.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { TermsPage } from "@/features/registration/components/terms-page";

function createWrapper() {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, {}, children);
}

describe("TermsPage", () => {
  it("renders the 'Términos de uso' heading", () => {
    render(<TermsPage />, { wrapper: createWrapper() });
    expect(screen.getByRole("heading", { name: /términos de uso/i })).toBeInTheDocument();
  });

  it("renders a link back to /register", () => {
    render(<TermsPage />, { wrapper: createWrapper() });
    const backLink = screen.getByRole("link", { name: /volver/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/register");
  });
});
