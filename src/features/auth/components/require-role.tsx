/**
 * RequireRole — role-based route guard.
 *
 * Adds role check from useCurrentUser().data.role on top of auth gating.
 * - Unauthenticated → redirect to /login.
 * - Authenticated but wrong role → redirect to /403-forbidden.
 * - Loading → spinner.
 * - Correct role → render children.
 */

import { type ReactNode } from "react";
import { Navigate } from "react-router";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { cn } from "@/lib/utils";

interface RequireRoleProps {
  children: ReactNode;
  /** Role required to access this route (e.g. "ADMIN"). */
  requiredRole: string;
  /** Redirect when unauthenticated. Defaults to /login. */
  loginRedirect?: string;
  /** Redirect when authenticated but lacking role. Defaults to /403-forbidden. */
  forbiddenRedirect?: string;
}

function RequireRole({
  children,
  requiredRole,
  loginRedirect = "/login",
  forbiddenRedirect = "/403-forbidden",
}: RequireRoleProps) {
  const { isLoading, isAuthenticated, isError, data } = useCurrentUser();

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
        <span className="sr-only">Verificando permisos...</span>
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
    return <Navigate to={loginRedirect} replace />;
  }

  if (data?.role !== requiredRole) {
    return <Navigate to={forbiddenRedirect} replace />;
  }

  return <>{children}</>;
}

export { RequireRole };
