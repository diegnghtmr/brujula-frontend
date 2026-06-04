import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

/**
 * Smoke test for the theme toggle component.
 * TH-002: at least one Vitest smoke test must pass.
 */
describe("ThemeToggle", () => {
  // Mock localStorage — jsdom may have a restricted implementation depending on the runner
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete store[key];
      }),
      clear: vi.fn(() => {
        store = {};
      }),
      get length() {
        return Object.keys(store).length;
      },
      key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
    };
  })();

  beforeEach(() => {
    vi.stubGlobal("localStorage", localStorageMock);
    localStorageMock.clear();
    // Reset html class
    document.documentElement.classList.remove("dark", "light");
  });

  it("renders a toggle button with an accessible label", () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("aria-label");
  });

  it("toggles theme from light to dark on click", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    // Initial state: light mode
    expect(document.documentElement.classList.contains("light")).toBe(true);

    await user.click(screen.getByRole("button"));

    // After toggle: dark mode
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("persists theme preference in localStorage", async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button"));

    expect(localStorageMock.setItem).toHaveBeenCalledWith("brujula-theme", "dark");
  });
});
