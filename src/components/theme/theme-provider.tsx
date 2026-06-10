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
 * DESIGN §8: persist user preference in localStorage,
 * initialize from prefers-color-scheme when no stored preference exists.
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

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
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
