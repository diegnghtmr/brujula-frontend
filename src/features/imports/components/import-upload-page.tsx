/**
 * ImportUploadPage — file upload for STAFF users (WU7, QAL-E2E-002-S4).
 * Route: /imports/upload
 *
 * Architecture:
 * - TanStack Query useMutation for the upload (mirrors simulation-create-form.tsx)
 * - React Hook Form + Zod schema for validation
 * - CSRF handled by apiClient axios interceptor — no manual cookie extraction
 * - createApiInstance at module scope (same convention as other features)
 *
 * STAFF-only: backend enforces 403 for non-STAFF roles.
 */

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CatalogApi } from "@/api/generated/api/catalog-api";
import { ImportsApi } from "@/api/generated/api/imports-api";
import { ImportKind } from "@/api/generated/models/import-kind";
import { createApiInstance } from "@/api/client";
import type { AxiosError } from "@/api/client";
import { cn } from "@/lib/utils";

const catalogApi = createApiInstance(CatalogApi);
const importsApi = createApiInstance(ImportsApi);

// ── Zod schema ───────────────────────────────────────────────────────────────

const importUploadSchema = z.object({
  kind: z.enum(
    [ImportKind.Offerings, ImportKind.Courses, ImportKind.Requirements],
    { error: "Seleccioná un tipo de importación." }
  ),
  programId: z.string().min(1, { message: "Seleccioná un programa académico." }),
  file: z
    .instanceof(File, { message: "Seleccioná un archivo CSV." })
    .refine((f) => f.size > 0, { message: "El archivo no puede estar vacío." })
    .refine((f) => f.name.endsWith(".csv"), { message: "El archivo debe ser un CSV." }),
});

type ImportUploadFormData = z.infer<typeof importUploadSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

const IMPORT_KINDS = [
  { value: ImportKind.Offerings, label: "Oferta académica" },
  { value: ImportKind.Courses, label: "Currículo — materias" },
  { value: ImportKind.Requirements, label: "Currículo — requisitos" },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

function ImportUploadPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);

  // Load programs — same query pattern as SimulationCreateForm
  const { data: programs, isLoading: programsLoading } = useQuery({
    queryKey: ["programs", "all"],
    queryFn: () =>
      catalogApi
        .listPrograms({ status: "ACTIVE" as const, page: 0, size: 100 })
        .then((r) => {
          // ProgramPage has allOf generator collapse; cast to access content
          const page = r.data as unknown as { content: Array<{ id: string; name: string }> };
          return page.content ?? [];
        }),
  });

  // useMutation — CSRF injected by apiClient interceptor; xXSRFTOKEN="" is the
  // placeholder the generated client expects; the interceptor adds the real header.
  const uploadMutation = useMutation({
    mutationFn: (data: ImportUploadFormData) =>
      importsApi
        .uploadImport({
          idempotencyKey: crypto.randomUUID(),
          xXSRFTOKEN: "",
          kind: data.kind,
          programId: data.programId,
          file: data.file,
        })
        .then((r) => r.data),
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<ImportUploadFormData>({
    resolver: zodResolver(importUploadSchema),
    defaultValues: { kind: undefined, programId: "", file: undefined },
    mode: "onChange",
  });

  function onSubmit(data: ImportUploadFormData) {
    setApiError(null);
    uploadMutation.mutate(data, {
      onSuccess: (batch) => {
        const batchId = (batch as { id?: string }).id;
        if (batchId) {
          navigate(`/imports/${batchId}`);
        }
      },
      onError: (error: Error) => {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status;
        const detail = (axiosError.response?.data as { detail?: string } | undefined)?.detail;
        if (status === 403) {
          setApiError("No tenés permisos de STAFF para realizar esta acción.");
        } else if (status === 422 || status === 400) {
          setApiError(detail ?? "Los datos del formulario no son válidos.");
        } else {
          setApiError("Error al subir el archivo. Verificá que el archivo sea un CSV válido.");
        }
      },
    });
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Importar datos académicos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cargá un archivo CSV con datos de oferta académica o currículo (STAFF).
        </p>
      </header>

      {apiError && (
        <div
          role="alert"
          className={cn(
            "mb-4 p-3 text-sm border rounded",
            "bg-red-50 border-red-300 text-red-800",
            "dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          )}
        >
          <span aria-hidden="true" className="font-bold mr-1">✕</span>
          {apiError}
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
        noValidate
        aria-label="Formulario de importación"
      >
        {/* Import kind */}
        <div className="flex flex-col gap-1">
          <label htmlFor="import-kind" className="text-sm font-medium text-foreground">
            Tipo de importación
          </label>
          <select
            id="import-kind"
            aria-label="Tipo de importación"
            aria-describedby={errors.kind ? "import-kind-error" : undefined}
            className={cn(
              "border rounded px-3 py-2 text-sm bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary",
              errors.kind && "border-red-500"
            )}
            {...register("kind")}
          >
            <option value="">Seleccioná un tipo...</option>
            {IMPORT_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          {errors.kind && (
            <p id="import-kind-error" className="text-xs text-red-600" role="alert">
              {errors.kind.message}
            </p>
          )}
        </div>

        {/* Program */}
        <div className="flex flex-col gap-1">
          <label htmlFor="import-program" className="text-sm font-medium text-foreground">
            Programa académico
          </label>
          {programsLoading ? (
            <div className="text-sm text-muted-foreground" role="status">
              <span className="sr-only">Cargando programas…</span>
              Cargando programas…
            </div>
          ) : (
            <select
              id="import-program"
              aria-label="Programa académico"
              aria-describedby={errors.programId ? "import-program-error" : undefined}
              className={cn(
                "border rounded px-3 py-2 text-sm bg-background text-foreground",
                "focus:outline-none focus:ring-1 focus:ring-primary",
                errors.programId && "border-red-500"
              )}
              {...register("programId")}
            >
              <option value="">Seleccioná un programa...</option>
              {(programs ?? []).map((prog) => (
                <option key={prog.id} value={prog.id}>
                  {prog.name}
                </option>
              ))}
            </select>
          )}
          {errors.programId && (
            <p id="import-program-error" className="text-xs text-red-600" role="alert">
              {errors.programId.message}
            </p>
          )}
        </div>

        {/* File upload — Controller because RHF register does not work well with file inputs */}
        <div className="flex flex-col gap-1">
          <label htmlFor="import-file" className="text-sm font-medium text-foreground">
            Archivo CSV
          </label>
          <Controller
            name="file"
            control={control}
            render={({ field: { onChange, ref } }) => (
              <input
                ref={ref}
                id="import-file"
                type="file"
                accept=".csv"
                aria-label="Archivo CSV"
                aria-describedby={errors.file ? "import-file-error" : undefined}
                onChange={(e) => onChange(e.target.files?.[0] ?? undefined)}
                className={cn(
                  "border rounded px-3 py-2 text-sm bg-background text-foreground",
                  "focus:outline-none focus:ring-1 focus:ring-primary",
                  "file:mr-3 file:py-1 file:px-2 file:rounded file:border-0",
                  "file:text-xs file:font-medium file:bg-primary file:text-primary-foreground",
                  "hover:file:opacity-90",
                  errors.file && "border-red-500"
                )}
              />
            )}
          />
          {errors.file && (
            <p id="import-file-error" className="text-xs text-red-600" role="alert">
              {errors.file.message}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-2">
          <button
            type="submit"
            disabled={!isValid || uploadMutation.isPending}
            aria-label="Subir archivo"
            className={cn(
              "px-4 py-2 text-sm font-medium rounded border transition-colors",
              "bg-primary text-primary-foreground border-primary hover:opacity-90",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {uploadMutation.isPending ? "Subiendo…" : "Subir archivo"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded border transition-colors",
              "border-border hover:bg-muted/40"
            )}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export { ImportUploadPage };
