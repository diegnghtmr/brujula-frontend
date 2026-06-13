/**
 * PrivacyPage — renders heading and back link.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { createElement, type ReactNode } from "react";
import { PrivacyPage } from "@/features/registration/components/privacy-page";

function createWrapper() {
  return ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, {}, children);
}

describe("PrivacyPage", () => {
  it("renders the 'Tratamiento de datos personales' heading", () => {
    render(<PrivacyPage />, { wrapper: createWrapper() });
    expect(
      screen.getByRole("heading", { name: /tratamiento de datos personales/i })
    ).toBeInTheDocument();
  });

  it("renders a link back to /register", () => {
    render(<PrivacyPage />, { wrapper: createWrapper() });
    const backLink = screen.getByRole("link", { name: /volver/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/register");
  });
});
