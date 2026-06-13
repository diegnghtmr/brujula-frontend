/**
 * RegistrationPage — student self-registration screen (/register).
 *
 * Design contract:
 * - NO password field. Keycloak sends UPDATE_PASSWORD via email.
 * - RHF + Zod validation: email (institutional), fullName (required), consent checkboxes.
 * - On 202: success notice ("revisá tu correo...").
 * - On 4xx: ProblemDetail.detail displayed as error message.
 * - CSRF: handled automatically by the shared axios CSRF interceptor.
 * - WCAG 2.2 AA: labels tied to inputs, focus-visible, aria-live errors.
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
import type { AxiosError } from "@/api/client";
import { getApiErrorMessage } from "@/lib/api-error";

const authApi = createApiInstance(AuthApi);

const registrationSchema = z.object({
  email: z
    .string()
    .min(1, { message: "El correo es obligatorio." })
    .email({ message: "Ingresá un correo electrónico válido." }),
  fullName: z
    .string()
    .min(1, { message: "El nombre completo es obligatorio." })
    .max(160, { message: "El nombre no puede superar 160 caracteres." }),
  acceptedTerms: z.literal(true, {
    message: "Debés aceptar los términos de uso.",
  }),
  acceptedDataProcessing: z.literal(true, {
    message: "Debés aceptar el tratamiento de datos personales.",
  }),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

interface ProblemDetail {
  detail?: string;
  code?: string;
  title?: string;
}

function RegistrationPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      fullName: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RegistrationFormValues) => {
      const idempotencyKey = crypto.randomUUID();
      return authApi.registerStudent({
        idempotencyKey,
        studentRegistrationRequest: {
          email: data.email,
          fullName: data.fullName,
          acceptedTerms: data.acceptedTerms,
          acceptedDataProcessing: data.acceptedDataProcessing,
        },
      });
    },
    onSuccess: (response) => {
      const msg =
        response.data?.message ??
        "Registro completado. Revisá tu correo para verificar tu cuenta y definir tu contraseña.";
      setSuccessMessage(msg);
      setErrorMessage(null);
    },
    onError: (error: AxiosError<ProblemDetail>) => {
      setErrorMessage(
        getApiErrorMessage(error, "Ocurrió un error al registrarse. Intentá de nuevo.")
      );
      setSuccessMessage(null);
    },
  });

  function onSubmit(data: RegistrationFormValues) {
    setErrorMessage(null);
    mutation.mutate(data);
  }

  if (successMessage) {
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
            Registro exitoso
          </h1>
          <p className="text-sm text-muted-foreground">{successMessage}</p>
          <p className="text-sm text-muted-foreground">
            Revisá tu correo para verificar tu cuenta y definir tu contraseña.
          </p>
          <a href="/login" className="text-sm text-primary underline">
            Ir al inicio de sesión
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
            Crear cuenta
          </h1>
          <p className="text-sm text-muted-foreground">
            Registrate con tu correo institucional.
          </p>
        </header>

        {/* Server-level error */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className={cn(
              "rounded-none border border-destructive",
              "bg-destructive/10 px-4 py-3",
              "text-sm text-destructive"
            )}
          >
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-4"
        >
          {/* Email field */}
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

          {/* Full name field */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="fullName"
              className="text-sm font-medium text-foreground"
            >
              Nombre completo
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre completo"
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              aria-invalid={!!errors.fullName}
              className={cn(
                "h-11 w-full rounded-none border bg-input px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                errors.fullName && "border-destructive"
              )}
              {...register("fullName")}
            />
            {errors.fullName && (
              <span
                id="fullName-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.fullName.message}
              </span>
            )}
          </div>

          {/* Terms of use consent */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <input
                id="acceptedTerms"
                type="checkbox"
                aria-describedby={
                  errors.acceptedTerms ? "acceptedTerms-error" : undefined
                }
                aria-invalid={!!errors.acceptedTerms}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                {...register("acceptedTerms")}
              />
              <label
                htmlFor="acceptedTerms"
                className="text-sm text-foreground leading-snug cursor-pointer"
              >
                Acepto los{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  términos de uso
                </a>
                .
              </label>
            </div>
            {errors.acceptedTerms && (
              <span
                id="acceptedTerms-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.acceptedTerms.message}
              </span>
            )}
          </div>

          {/* Data processing consent */}
          <div className="flex flex-col gap-1">
            <div className="flex items-start gap-2">
              <input
                id="acceptedDataProcessing"
                type="checkbox"
                aria-describedby={
                  errors.acceptedDataProcessing
                    ? "acceptedDataProcessing-error"
                    : undefined
                }
                aria-invalid={!!errors.acceptedDataProcessing}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary focus-visible:ring-2 focus-visible:ring-ring"
                {...register("acceptedDataProcessing")}
              />
              <label
                htmlFor="acceptedDataProcessing"
                className="text-sm text-foreground leading-snug cursor-pointer"
              >
                Acepto el{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline"
                >
                  tratamiento de datos personales
                </a>
                .
              </label>
            </div>
            {errors.acceptedDataProcessing && (
              <span
                id="acceptedDataProcessing-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.acceptedDataProcessing.message}
              </span>
            )}
          </div>

          <Button
            type="submit"
            className="w-full min-h-[44px]"
            size="lg"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? "Registrando..." : "Registrar cuenta"}
          </Button>
        </form>

        <footer className="text-center">
          <p className="text-sm text-muted-foreground">
            ¿Ya tenés cuenta?{" "}
            <a href="/login" className="text-primary underline">
              Iniciá sesión
            </a>
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ¿Olvidaste tu contraseña?{" "}
            <a href="/forgot-password" className="text-primary underline">
              Recuperar contraseña
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

export { RegistrationPage };
