/**
 * S2-F-3: ForgotPasswordPage — password recovery initiation (/forgot-password).
 *
 * Architecture (obs #1574, Option A / DT-011):
 * POST /auth/password-recovery → Keycloak sends execute-actions-email [UPDATE_PASSWORD].
 * Keycloak handles the actual reset form. No /reset-password page in this SPA.
 *
 * Design contract:
 * - Always shows uniform "Si existe una cuenta, te enviamos instrucciones" (no user enumeration).
 * - RHF + Zod: email validation.
 * - CSRF: handled by axios CSRF interceptor.
 * - WCAG 2.2 AA.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { AuthApi } from "@/api/generated/api/auth-api";
import { createApiInstance } from "@/api/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const authApi = createApiInstance(AuthApi);

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El correo es obligatorio." })
    .email({ message: "Ingresá un correo electrónico válido." }),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: ForgotPasswordFormValues) =>
      authApi.requestPasswordRecovery({
        requestPasswordRecoveryRequest: { email: data.email },
      }),
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: () => {
      // Resilience: show same message even if backend errors
      setSubmitted(true);
    },
  });

  function onSubmit(data: ForgotPasswordFormValues) {
    mutation.mutate(data);
  }

  if (submitted) {
    return (
      <main
        className={cn(
          "min-h-screen flex flex-col items-center justify-center",
          "bg-background px-6"
        )}
      >
        <div
          className={cn(
            "w-full max-w-sm flex flex-col gap-4 p-6",
            "border border-border bg-card"
          )}
        >
          <h1 className="text-xl font-semibold text-foreground font-display">
            Revisá tu correo
          </h1>
          <p className="text-sm text-muted-foreground">
            Si el correo está registrado, te enviamos las instrucciones para
            restablecer tu contraseña.
          </p>
          <a href="/login" className="text-sm text-primary underline">
            Volver al inicio de sesión
          </a>
        </div>
      </main>
    );
  }

  return (
    <main
      className={cn(
        "min-h-screen flex flex-col items-center justify-center",
        "bg-background px-6"
      )}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground font-display mb-1">
            Recuperar contraseña
          </h1>
          <p className="text-sm text-muted-foreground">
            Ingresá tu correo institucional y te enviaremos instrucciones.
          </p>
        </header>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Correo institucional
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="nombre@uniquindio.edu.co"
              aria-describedby={errors.email ? "email-error" : undefined}
              aria-invalid={!!errors.email}
              className={cn(
                "h-11 w-full rounded-none border bg-input px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                errors.email && "border-destructive"
              )}
              {...register("email")}
            />
            {errors.email && (
              <span
                id="email-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.email.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            className="w-full min-h-[44px]"
            size="lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Enviando..." : "Enviar instrucciones"}
          </Button>
        </form>

        <footer className="text-center">
          <a href="/login" className="text-sm text-primary underline">
            Volver al inicio de sesión
          </a>
        </footer>
      </div>
    </main>
  );
}

export { ForgotPasswordPage };
