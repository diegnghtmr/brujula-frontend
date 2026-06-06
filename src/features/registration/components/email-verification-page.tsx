/**
 * S2-F-2: EmailVerificationPage — verification landing screen (/verify-email).
 *
 * Architecture (obs #1574, G-KC-VERIFY-FLOW resolved):
 * Keycloak handles verification natively on its own page. This screen is what
 * the user lands on AFTER Keycloak verifies the email (redirected back to SPA).
 * It shows instructions and allows resending the verification email.
 *
 * There is NO token-confirm form here — Keycloak already handled verification.
 * This page also serves as the landing point before verification where users
 * can request a resend.
 *
 * Design contract:
 * - Reads ?email= query param to pre-populate resend email.
 * - Resend calls /auth/email-verifications/resend → always shows same notice.
 * - WCAG 2.2 AA: accessible heading, button labels, aria-live feedback.
 */

import { useState } from "react";
import { useSearchParams } from "react-router";
import { useMutation } from "@tanstack/react-query";
import { AuthApi } from "@/api/generated/api/auth-api";
import { createApiInstance } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const authApi = createApiInstance(AuthApi);

function EmailVerificationPage() {
  const [searchParams] = useSearchParams();
  const emailFromQuery = searchParams.get("email") ?? "";
  const [resendDone, setResendDone] = useState(false);

  const resendMutation = useMutation({
    mutationFn: () => {
      const idempotencyKey = crypto.randomUUID();
      return authApi.resendEmailVerification({
        idempotencyKey,
        resendEmailVerificationRequest: {
          email: emailFromQuery,
        },
      });
    },
    onSuccess: () => {
      setResendDone(true);
    },
    onError: () => {
      // Always show the same uniform message (no user enumeration)
      setResendDone(true);
    },
  });

  return (
    <main
      className={cn(
        "min-h-screen flex flex-col items-center justify-center",
        "bg-background px-6"
      )}
    >
      <div
        className={cn(
          "w-full max-w-sm flex flex-col gap-6 p-6",
          "border border-border bg-card"
        )}
      >
        <header>
          <h1 className="text-xl font-semibold text-foreground font-display mb-2">
            Verificación de correo electrónico
          </h1>
          <p className="text-sm text-muted-foreground">
            Revisá tu bandeja de entrada y hacé clic en el enlace que te
            enviamos para activar tu cuenta.
          </p>
        </header>

        {/* Resend confirmation notice */}
        {resendDone ? (
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "rounded-none border border-border",
              "bg-muted/40 px-4 py-3",
              "text-sm text-muted-foreground"
            )}
          >
            Si el correo está registrado, recibirás un nuevo enlace de
            verificación en breve.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              ¿No recibiste el correo?
            </p>
            <Button
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
              variant="outline"
              size="lg"
              className="w-full min-h-[44px]"
            >
              {resendMutation.isPending
                ? "Reenviando..."
                : "Reenviar correo de verificación"}
            </Button>
          </div>
        )}

        <footer className="text-center">
          <a href="/login" className="text-sm text-primary underline">
            Volver al inicio de sesión
          </a>
        </footer>
      </div>
    </main>
  );
}

export { EmailVerificationPage };
