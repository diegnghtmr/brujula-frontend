import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

/**
 * Smoke test for the theme toggle component.
 * TH-002: at least one Vitest smoke test must pass.
 *
 * WU-1 Fix C: atomic theme switch — no staggered repaint.
 * TH-003: switching theme adds `theme-no-transitions` to <html>, then removes it after rAF.
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
    // Reset html classes
    document.documentElement.classList.remove("dark", "light", "theme-no-transitions");
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  // -------------------------------------------------------------------------
  // WU-1 Fix C — atomic theme switch (no staggered repaint)
  //
  // Strategy: spy on requestAnimationFrame to capture the callbacks instead of
  // executing them. This lets us assert the class is present synchronously
  // right after the theme change, then manually invoke the rAF callbacks to
  // verify the class is removed afterwards.
  // -------------------------------------------------------------------------

  it("TH-003: adds 'theme-no-transitions' to <html> synchronously on theme change, then removes it after rAF", async () => {
    // Collect rAF callbacks without executing them immediately
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length; // fake handle
      });

    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    // Drain the rAF calls from the initial mount (the initial useEffect also
    // calls applyThemeAtomically, which schedules rAF).
    rafCallbacks.length = 0;

    // Click the toggle — triggers setTheme → applyThemeAtomically
    await user.click(screen.getByRole("button"));

    // Synchronously after the click: .dark is applied and theme-no-transitions
    // has been added (both happen before the rAF callback fires).
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("theme-no-transitions")).toBe(true);

    // Now manually flush ALL queued rAF callbacks (double-rAF pattern means
    // the outer rAF queues the inner one, so we flush twice).
    act(() => {
      const firstBatch = [...rafCallbacks];
      rafCallbacks.length = 0;
      for (const cb of firstBatch) cb(0);

      const secondBatch = [...rafCallbacks];
      rafCallbacks.length = 0;
      for (const cb of secondBatch) cb(0);
    });

    // After rAF flushes: theme-no-transitions must be gone
    expect(document.documentElement.classList.contains("theme-no-transitions")).toBe(false);
    // .dark must still be present
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    rafSpy.mockRestore();
  });

  it("TH-003b: theme-no-transitions is absent after real rAF resolves naturally", async () => {
    // Use real timers — let the browser (jsdom) actually run the rAF callbacks.
    // jsdom runs rAF on the next macrotask; we advance via real async time.
    const user = userEvent.setup();

    render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button"));

    // .dark is applied immediately
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // Wait for rAF + an extra tick so the double-rAF resolves.
    // jsdom processes rAF callbacks when the event loop has a chance to run.
    await act(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    });

    expect(document.documentElement.classList.contains("theme-no-transitions")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // C-2 guard test: unmount cleanup removes theme-no-transitions
  // -------------------------------------------------------------------------

  it("C-2: unmounting ThemeProvider removes theme-no-transitions from <html>", async () => {
    // Hold rAF callbacks so theme-no-transitions is still present at unmount time
    const rafCallbacks: FrameRequestCallback[] = [];
    const rafSpy = vi
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((cb) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });

    const cancelSpy = vi
      .spyOn(window, "cancelAnimationFrame")
      .mockImplementation(() => { /* captured */ });

    const { unmount } = render(
      <ThemeProvider defaultTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    // theme-no-transitions may be present now (rAF not yet flushed)
    // Unmount — cleanup must remove the class
    act(() => {
      unmount();
    });

    expect(
      document.documentElement.classList.contains("theme-no-transitions")
    ).toBe(false);

    rafSpy.mockRestore();
    cancelSpy.mockRestore();
  });
});
