/**
 * AppNav — primary navigation landmark for authenticated pages.
 *
 * Presentational component: no data fetch.
 * Renders four NavLinks inside a <nav aria-label="Navegación principal"> landmark.
 * Active state: react-router NavLink sets aria-current="page" automatically.
 * A11Y: visible focus ring via focus-visible:ring-2; color + border-weight active signal.
 * Tailwind semantic tokens only (no var(), no hex).
 */

import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Inicio", to: "/dashboard" },
  { label: "Mis suscripciones", to: "/progress/subscriptions" },
  { label: "Mis simulaciones", to: "/simulations" },
  { label: "Catálogo", to: "/catalog/programs" },
] as const;

function AppNav() {
  return (
    <nav aria-label="Navegación principal">
      <ul className="flex items-center gap-1 overflow-x-auto">
        {NAV_LINKS.map(({ label, to }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  // Nav links use border-b underline, no pill geometry
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  isActive
                    ? "text-foreground border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )
              }
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export { AppNav };
