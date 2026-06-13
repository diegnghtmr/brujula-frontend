/**
 * AllowedDomainsAdminPage — admin screen for allowed email domain management.
 * Route: /admin/allowed-domains (ADMIN-gated via RequireRole).
 *
 * Design contract:
 * - Lists allowed email domains (GET /admin/allowed-email-domains).
 * - Adds a domain (POST with X-XSRF-TOKEN via axios interceptor).
 * - Deletes a domain (DELETE) with confirmation dialog.
 * - RequireRole("ADMIN") guard — non-ADMIN redirected to /403-forbidden.
 * - TanStack Query for data; invalidate after mutations.
 * - WCAG 2.2 AA: table labels, focus management, accessible dialog.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdministrationApi } from "@/api/generated/api/administration-api";
import { createApiInstance } from "@/api/client";
import { RequireRole } from "@/features/auth/components/require-role";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AllowedEmailDomain } from "@/api/generated/models/allowed-email-domain";

const adminApi = createApiInstance(AdministrationApi);

const DOMAINS_QUERY_KEY = ["allowedEmailDomains"] as const;

const addDomainSchema = z.object({
  domain: z
    .string()
    .min(1, { message: "El dominio es obligatorio." })
    .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/, {
      message: "Ingresá un dominio válido (ej: universidad.edu.co).",
    }),
});

type AddDomainFormValues = z.infer<typeof addDomainSchema>;

function AllowedDomainsAdminPage() {
  return (
    <RequireRole requiredRole="ADMIN">
      <AllowedDomainsContent />
    </RequireRole>
  );
}

function AllowedDomainsContent() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<AllowedEmailDomain | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: domains = [], isLoading } = useQuery({
    queryKey: DOMAINS_QUERY_KEY,
    queryFn: () => adminApi.listAllowedEmailDomains().then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: (domain: string) =>
      adminApi.addAllowedEmailDomain({
        xXSRFTOKEN: "",
        addAllowedEmailDomainRequest: { domain },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEY });
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (domainId: string) =>
      adminApi.removeAllowedEmailDomain({
        xXSRFTOKEN: "",
        domainId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOMAINS_QUERY_KEY });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddDomainFormValues>({
    resolver: zodResolver(addDomainSchema),
    defaultValues: { domain: "" },
  });

  function onAddSubmit(data: AddDomainFormValues) {
    addMutation.mutate(data.domain);
  }

  function handleDeleteClick(domain: AllowedEmailDomain) {
    setDeleteTarget(domain);
    setConfirmOpen(true);
  }

  function handleConfirmDelete() {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <BackLink to="/dashboard" />
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Dominios de correo habilitados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra los dominios institucionales aceptados para el registro de
          estudiantes.
        </p>
      </header>

      {/* Add domain form */}
      <form
        onSubmit={handleSubmit(onAddSubmit)}
        noValidate
        className={cn(
          "flex flex-col gap-2 p-4 border border-border bg-card mb-6"
        )}
        aria-label="Agregar dominio"
      >
        <h2 className="text-sm font-semibold text-foreground mb-2">
          Agregar dominio
        </h2>
        <div className="flex gap-2">
          <div className="flex-1 flex flex-col gap-1">
            <input
              id="domain"
              type="text"
              placeholder="Ingresá un dominio..."
              aria-label="Nuevo dominio"
              aria-describedby={errors.domain ? "domain-error" : undefined}
              aria-invalid={!!errors.domain}
              className={cn(
                "h-10 w-full rounded-none border bg-input px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                errors.domain && "border-destructive"
              )}
              {...register("domain")}
            />
            {errors.domain && (
              <span
                id="domain-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.domain.message}
              </span>
            )}
          </div>
          <Button
            type="submit"
            disabled={addMutation.isPending}
            className="min-h-[44px] shrink-0"
          >
            {addMutation.isPending ? "Agregando..." : "Agregar dominio"}
          </Button>
        </div>
      </form>

      {/* Domains list */}
      <section aria-label="Lista de dominios habilitados">
        {isLoading ? (
          <div role="status" aria-live="polite" className="flex flex-col gap-0">
            <span className="sr-only">Cargando dominios…</span>
            {/* Table header skeleton */}
            <Skeleton className="h-9 w-full rounded-none" />
            {/* Table row skeletons */}
            <Skeleton className="h-11 w-full rounded-none mt-px" />
            <Skeleton className="h-11 w-full rounded-none mt-px" />
            <Skeleton className="h-11 w-full rounded-none mt-px" />
          </div>
        ) : domains.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay dominios habilitados todavía.
          </p>
        ) : (
          <table className="w-full text-sm" aria-label="Dominios habilitados">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="text-left py-2 px-3 font-medium text-muted-foreground"
                >
                  Dominio
                </th>
                <th scope="col" className="py-2 px-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr
                  key={domain.id}
                  className="border-b border-border hover:bg-muted/40 transition-colors"
                >
                  <td className="py-2 px-3 text-foreground font-mono text-sm">
                    {domain.domain}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(domain)}
                      aria-label={`Eliminar dominio ${domain.domain}`}
                      className="min-h-[44px]"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Eliminar dominio"
        description={
          deleteTarget
            ? `¿Confirmás la eliminación de "${deleteTarget.domain}"? Los nuevos registros con ese dominio serán rechazados.`
            : undefined
        }
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDelete}
        destructive
      />
    </div>
  );
}

export { AllowedDomainsAdminPage };
