/**
 * S2-F-5: StaffAdminPage — admin screen for staff account management.
 * Route: /admin/staff (ADMIN-gated via RequireRole).
 *
 * Design contract:
 * - Lists staff accounts (GET /admin/staff).
 * - Creates staff (POST with fresh Idempotency-Key per submit + X-XSRF-TOKEN via interceptor).
 * - Deactivates staff (PATCH) with confirmation dialog.
 * - Academic state indicators: status shown with color + icon + label (not color alone).
 * - RequireRole("ADMIN") guard.
 * - WCAG 2.2 AA.
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
import { cn } from "@/lib/utils";
import type { Staff } from "@/api/generated/models/staff";

const adminApi = createApiInstance(AdministrationApi);

const STAFF_QUERY_KEY = ["staff"] as const;

const createStaffSchema = z.object({
  fullName: z
    .string()
    .min(1, { message: "El nombre del staff es obligatorio." })
    .max(160),
  email: z
    .string()
    .min(1, { message: "El correo del staff es obligatorio." })
    .email({ message: "Ingresá un correo electrónico válido." }),
});

type CreateStaffFormValues = z.infer<typeof createStaffSchema>;

const STATUS_CONFIG = {
  ACTIVE: {
    label: "Activo",
    icon: "●",
    // §8 / FIX 2: icon carries the semantic color; label uses text-foreground (≥4.5:1)
    iconClassName: "text-success",
    labelClassName: "text-foreground",
  },
  INACTIVE: {
    label: "Inactivo",
    icon: "○",
    iconClassName: "text-muted-foreground",
    labelClassName: "text-muted-foreground",
  },
} as const;

type AccountStatusKey = keyof typeof STATUS_CONFIG;

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status as AccountStatusKey] ?? STATUS_CONFIG["INACTIVE"];
}

function StaffAdminPage() {
  return (
    <RequireRole requiredRole="ADMIN">
      <StaffAdminContent />
    </RequireRole>
  );
}

function StaffAdminContent() {
  const queryClient = useQueryClient();
  const [deactivateTarget, setDeactivateTarget] = useState<Staff | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: staffPage, isLoading } = useQuery({
    queryKey: STAFF_QUERY_KEY,
    queryFn: () => adminApi.listStaff({}).then((r) => r.data),
  });

  const staffList = staffPage?.content ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffFormValues) => {
      const idempotencyKey = crypto.randomUUID();
      return adminApi.createStaff({
        idempotencyKey,
        xXSRFTOKEN: "",
        staffCreateRequest: {
          fullName: data.fullName,
          email: data.email,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
      reset();
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (staff: Staff) =>
      adminApi.updateStaff({
        xXSRFTOKEN: "",
        staffId: staff.id,
        staffUpdateRequest: {
          status: "INACTIVE" as const,
          version: staff.version,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAFF_QUERY_KEY });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStaffFormValues>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { fullName: "", email: "" },
  });

  function onCreateSubmit(data: CreateStaffFormValues) {
    createMutation.mutate(data);
  }

  function handleDeactivateClick(staff: Staff) {
    setDeactivateTarget(staff);
    setConfirmOpen(true);
  }

  function handleConfirmDeactivate() {
    if (deactivateTarget) {
      deactivateMutation.mutate(deactivateTarget);
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <BackLink to="/dashboard" />
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Gestión de staff
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Administra las cuentas del personal docente y administrativo.
        </p>
      </header>

      {/* Create staff form */}
      <form
        onSubmit={handleSubmit(onCreateSubmit)}
        noValidate
        className={cn(
          "flex flex-col gap-3 p-4 border border-border bg-card mb-6"
        )}
        aria-label="Crear staff"
      >
        <h2 className="text-sm font-semibold text-foreground mb-2">
          Crear cuenta de staff
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="staffFullName"
              className="text-sm font-medium text-foreground"
            >
              Nombre del staff
            </label>
            <input
              id="staffFullName"
              type="text"
              placeholder="Nombre completo"
              aria-describedby={errors.fullName ? "staffFullName-error" : undefined}
              aria-invalid={!!errors.fullName}
              className={cn(
                "h-10 w-full rounded-none border bg-input px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                errors.fullName && "border-destructive"
              )}
              {...register("fullName")}
            />
            {errors.fullName && (
              <span
                id="staffFullName-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.fullName.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="staffEmail"
              className="text-sm font-medium text-foreground"
            >
              Correo del staff
            </label>
            <input
              id="staffEmail"
              type="email"
              placeholder="staff@uniquindio.edu.co"
              aria-describedby={errors.email ? "staffEmail-error" : undefined}
              aria-invalid={!!errors.email}
              className={cn(
                "h-10 w-full rounded-none border bg-input px-3 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                errors.email && "border-destructive"
              )}
              {...register("email")}
            />
            {errors.email && (
              <span
                id="staffEmail-error"
                role="alert"
                className="text-xs text-destructive"
              >
                {errors.email.message}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={createMutation.isPending}
            className="min-h-[44px]"
          >
            {createMutation.isPending ? "Creando..." : "Crear staff"}
          </Button>
        </div>
      </form>

      {/* Staff list */}
      <section aria-label="Lista de staff">
        {isLoading ? (
          <div className="flex items-center justify-center py-8" role="status">
            <span className="sr-only">Cargando staff...</span>
            <div
              className={cn(
                "w-6 h-6 border-4 rounded-full motion-safe:animate-spin",
                "border-muted border-t-primary"
              )}
              aria-hidden="true"
            />
          </div>
        ) : staffList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            No hay staff registrado todavía.
          </p>
        ) : (
          <table className="w-full text-sm" aria-label="Cuentas de staff">
            <thead>
              <tr className="border-b border-border">
                <th
                  scope="col"
                  className="text-left py-2 px-3 font-medium text-muted-foreground"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="text-left py-2 px-3 font-medium text-muted-foreground"
                >
                  Correo
                </th>
                <th
                  scope="col"
                  className="text-left py-2 px-3 font-medium text-muted-foreground"
                >
                  Estado
                </th>
                <th scope="col" className="py-2 px-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => {
                const statusConf = getStatusConfig(staff.status as string);
                const isActive = (staff.status as string) === "ACTIVE";

                return (
                  <tr
                    key={staff.id}
                    className="border-b border-border hover:bg-muted/40 transition-colors"
                  >
                    <td className="py-2 px-3 text-foreground font-medium">
                      {staff.fullName}
                    </td>
                    <td className="py-2 px-3 text-muted-foreground font-mono text-xs">
                      {staff.email}
                    </td>
                    <td className="py-2 px-3">
                      {/* Status: color on icon only; label uses text-foreground for WCAG AA contrast */}
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        aria-label={`Estado: ${statusConf.label}`}
                      >
                        <span aria-hidden="true" className={statusConf.iconClassName}>{statusConf.icon}</span>
                        <span className={statusConf.labelClassName}>{statusConf.label}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      {isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeactivateClick(staff)}
                          aria-label={`Desactivar cuenta de ${staff.fullName}`}
                          className="min-h-[44px]"
                        >
                          Desactivar
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Desactivar cuenta de staff"
        description={
          deactivateTarget
            ? `¿Confirmás la desactivación de la cuenta de "${deactivateTarget.fullName}"? Esta acción puede revertirse.`
            : undefined
        }
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        onConfirm={handleConfirmDeactivate}
        destructive
      />
    </div>
  );
}

export { StaffAdminPage };
