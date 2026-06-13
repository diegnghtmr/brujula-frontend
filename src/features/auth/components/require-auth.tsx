/**
 * RequireAuth — route guard component.
 *
 * Gates protected routes on auth state from useCurrentUser (/me via TanStack Query).
 * - Unauthenticated (401 / error) → Navigate to /login.
 * - Loading → render loading skeleton (no flash of protected content).
 * - Authenticated → render children.
 *
 * Auth truth always comes from the /me query, never from a client-side token.
 */

import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface RequireAuthProps {
  children: ReactNode;
  /** Redirect target when unauthenticated. Defaults to /login. */
  redirectTo?: string;
}

function RequireAuth({ children, redirectTo = "/login" }: RequireAuthProps) {
  const { isLoading, isAuthenticated, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div
        className={cn(
          "min-h-screen flex items-center justify-center",
          "bg-background"
        )}
        aria-label="Cargando..."
        role="status"
      >
        <span className="sr-only">Verificando sesión...</span>
        <div
          className={cn(
            "w-8 h-8 border-4 rounded-full motion-safe:animate-spin",
            "border-muted border-t-primary"
          )}
          aria-hidden="true"
        />
      </div>
    );
  }

  if (isError || !isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}

export { RequireAuth };
