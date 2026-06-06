/**
 * App router — Fase 1 + Slice 2 routes.
 *
 * Route structure:
 * Public:
 *   /login              → LoginPage
 *   /register           → RegistrationPage
 *   /verify-email       → EmailVerificationPage
 *   /forgot-password    → ForgotPasswordPage
 *   /403-forbidden      → ForbiddenPage (inline)
 *
 * Protected (RequireAuth + AuthenticatedShell):
 *   /dashboard          → DashboardPage
 *
 * Admin-gated (RequireRole(ADMIN) inside the component):
 *   /admin/staff           → StaffAdminPage
 *   /admin/allowed-domains → AllowedDomainsAdminPage
 *
 * Fallback → /dashboard
 *
 * NOTE: AppRouter renders either BrowserRouter (production) or the provided
 * children within the current router (tests pass a MemoryRouter externally,
 * so AppRoutes is exported separately for testability).
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { DashboardPage } from "@/pages/dashboard";
import { LoginPage } from "@/features/auth/components/login-page";
import { RequireAuth } from "@/features/auth/components/require-auth";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { RegistrationPage } from "@/features/registration/components/registration-page";
import { EmailVerificationPage } from "@/features/registration/components/email-verification-page";
import { ForgotPasswordPage } from "@/features/registration/components/forgot-password-page";
import { StaffAdminPage } from "@/features/administration/components/staff-admin-page";
import { AllowedDomainsAdminPage } from "@/features/administration/components/allowed-domains-admin-page";
import { cn } from "@/lib/utils";

/** Inline 403 page (no separate file needed — simple notice). */
function ForbiddenPage() {
  return (
    <main
      className={cn(
        "min-h-screen flex flex-col items-center justify-center",
        "bg-background px-6"
      )}
    >
      <div className="w-full max-w-sm flex flex-col gap-4 p-6 border border-border bg-card">
        <h1 className="text-xl font-semibold text-foreground font-display">
          Acceso no autorizado
        </h1>
        <p className="text-sm text-muted-foreground">
          No tenés permiso para acceder a esta sección.
        </p>
        <a href="/dashboard" className="text-sm text-primary underline">
          Volver al inicio
        </a>
      </div>
    </main>
  );
}

/**
 * AppRoutes — route declarations only (no router provider).
 * Can be rendered inside any Router (BrowserRouter or MemoryRouter in tests).
 */
function AppRoutes() {
  return (
    <Routes>
      {/* Public routes — no auth required */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/403-forbidden" element={<ForbiddenPage />} />

      {/* Protected routes — gated by RequireAuth */}
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

      {/* Admin routes — RequireRole(ADMIN) is embedded in each page component */}
      <Route path="/admin/staff" element={<StaffAdminPage />} />
      <Route path="/admin/allowed-domains" element={<AllowedDomainsAdminPage />} />

      {/* Fallback redirects */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

/**
 * AppRouter — top-level router with BrowserRouter for production.
 * Tests use AppRoutes directly inside a MemoryRouter.
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export { AppRouter, AppRoutes };
