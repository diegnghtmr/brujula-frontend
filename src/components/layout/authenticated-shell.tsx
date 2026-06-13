/**
 * AuthenticatedShell — layout wrapper for authenticated routes.
 * Includes the mandatory DisclaimerBanner (DESIGN §6.13 / Spec) and a
 * minimal header with the logout action.
 *
 * All authenticated pages are wrapped in this shell.
 * Styling resolves against DESIGN tokens only. Light + dark support.
 *
 * A11Y (QAL-A11Y-002-S2): skip-to-content link is the first focusable element.
 * Visually hidden until focused so it does not intrude on the visual design.
 * Activating it moves focus to #main-content (the <main> landmark).
 */

import { type ReactNode } from "react";
import { DisclaimerBanner } from "@/features/auth/components/disclaimer-banner";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AppNav } from "@/components/layout/app-nav";
import { cn } from "@/lib/utils";

interface AuthenticatedShellProps {
  children: ReactNode;
}

function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  return (
    <div className={cn("min-h-screen flex flex-col", "bg-background")}>
      {/* Skip-to-content — visually hidden until focused (WCAG 2.4.1 / QAL-A11Y-002-S2) */}
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only",
          "focus:absolute focus:z-50 focus:top-2 focus:left-2",
          "focus:px-4 focus:py-2 focus:rounded",
          "focus:bg-background focus:text-foreground focus:border focus:border-border",
          "focus:text-sm focus:font-medium focus:outline-none focus:ring-2 focus:ring-ring"
        )}
      >
        Ir al contenido principal
      </a>

      {/* Mandatory disclaimer banner — always visible per session (DESIGN §6.13) */}
      <DisclaimerBanner />

      {/* App header */}
      <header
        className={cn(
          "sticky top-0 z-40 flex items-center justify-between",
          "px-4 py-3 border-b border-border",
          "bg-background/95 backdrop-blur-sm"
        )}
      >
        <span className="text-base font-semibold text-foreground font-display">
          Brújula
        </span>
        <AppNav />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Page content — #main-content target for skip link */}
      <main id="main-content" className="flex-1">{children}</main>
    </div>
  );
}

export { AuthenticatedShell };
