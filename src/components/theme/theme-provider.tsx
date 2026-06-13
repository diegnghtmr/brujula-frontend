import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeProviderContext = createContext<ThemeProviderState | undefined>(undefined);

const STORAGE_KEY = "brujula-theme";

interface ThemeProviderProps {
  children?: React.ReactNode;
  defaultTheme?: Theme;
}

/**
 * ThemeProvider — light/dark via .dark class on <html>.
 * Persists user preference in localStorage,
 * initializes from prefers-color-scheme when no stored preference exists.
 *
 * Theme switch is atomic — no staggered repaint.
 * useEffect cleanup cancels pending rAFs and removes theme-no-transitions
 * on unmount or rapid re-run, preventing stale callbacks from running.
 */
function ThemeProvider({ children, defaultTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // 1. Check localStorage first
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") return stored;

    // 2. Fall back to defaultTheme prop or system preference
    if (defaultTheme) return defaultTheme;

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Apply theme class on mount and whenever theme state changes.
  // Technique: atomic theme switch via double-rAF.
  // 1. Add `theme-no-transitions` to <html> — CSS rule disables ALL transitions.
  // 2. Flip the `.dark` / `.light` class on <html>.
  // 3. Remove `theme-no-transitions` after a double-rAF (safest cross-browser approach).
  // Cleanup: cancel pending rAFs and remove the class on unmount or rapid toggle
  // so a stale inner rAF never removes the class added by a newer effect.
  useEffect(() => {
    let cancelled = false;
    let innerHandle = 0;
    const root = window.document.documentElement;

    root.classList.add("theme-no-transitions");
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    const outerHandle = requestAnimationFrame(() => {
      if (cancelled) return;
      innerHandle = requestAnimationFrame(() => {
        if (!cancelled) root.classList.remove("theme-no-transitions");
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(outerHandle);
      if (innerHandle) cancelAnimationFrame(innerHandle);
      root.classList.remove("theme-no-transitions");
    };
  }, [theme]);

  function setTheme(newTheme: Theme) {
    localStorage.setItem(STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  }

  return (
    <ThemeProviderContext value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext>
  );
}

function useTheme(): ThemeProviderState {
  const context = useContext(ThemeProviderContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components -- ThemeProvider and useTheme are a tightly coupled provider/consumer pair; splitting into separate files would require cross-file circular references. Provider files are not subject to fast-refresh HMR boundary issues.
export { ThemeProvider, useTheme };
export type { Theme };
