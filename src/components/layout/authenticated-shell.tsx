/**
 * AuthenticatedShell — layout wrapper for authenticated routes.
 * Includes the mandatory DisclaimerBanner (DESIGN §6.13 / Spec) and a
 * minimal header with the logout action.
 *
 * All authenticated pages are wrapped in this shell.
 * Styling resolves against DESIGN tokens only. Light + dark support.
 */

import { type ReactNode } from "react";
import { DisclaimerBanner } from "@/features/auth/components/disclaimer-banner";
import { LogoutButton } from "@/features/auth/components/logout-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface AuthenticatedShellProps {
  children: ReactNode;
}

function AuthenticatedShell({ children }: AuthenticatedShellProps) {
  return (
    <div className={cn("min-h-screen flex flex-col", "bg-background")}>
      {/* Mandatory disclaimer banner — always visible per session (DESIGN §6.13) */}
      <DisclaimerBanner />

      {/* App header */}
      <header
        className={cn(
          "sticky top-0 z-10 flex items-center justify-between",
          "px-4 py-3 border-b border-border",
          "bg-background/95 backdrop-blur-sm"
        )}
      >
        <span className="text-base font-semibold text-foreground font-display">
          Brújula
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LogoutButton />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}

export { AuthenticatedShell };
