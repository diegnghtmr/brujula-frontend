import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/features/auth/components/login-page";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";

/**
 * App router — Fase 1 auth backbone.
 *
 * Route structure:
 * /login              → LoginPage (public, initiates OIDC redirect)
 * /dashboard          → RequireAuth → AuthenticatedShell → DashboardPage
 * /                   → redirect to /dashboard
 * *                   → redirect to /dashboard
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes — gated by RequireAuth (/me query) */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <AuthenticatedShell>
                <DashboardPage />
              </AuthenticatedShell>
            </RequireAuth>
          }
        />

        {/* Fallback redirects */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export { AppRouter };
