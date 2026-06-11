/**
 * ProgramListPage — catalog browse for academic programs (CAT-001).
 * Route: /catalog/programs
 *
 * Design contract:
 * - Lists active academic programs (GET /programs?status=ACTIVE&page=N).
 * - Pagination controls when totalPages > 1.
 * - Presentational ProgramCard handles individual program display.
 * - Container-presentational split: this container manages query state.
 */

import { useSearchParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { CatalogApi } from "@/api/generated/api/catalog-api";
import { createApiInstance } from "@/api/client";
import type { Program } from "@/api/generated/models/program";
import { BackLink } from "@/components/layout/back-link";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramCard } from "./program-card";
import { cn } from "@/lib/utils";

/** Parse the ?page= query param into a 0-based page index. Falls back to 0 for missing, NaN, or negative values. */
function parsePageParam(searchParams: URLSearchParams): number {
  const raw = searchParams.get("page");
  if (raw === null) return 0;
  const parsed = parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return parsed;
}

const catalogApi = createApiInstance(CatalogApi);

// ProgramPage has allOf PageMeta + content[]  — generator collapses to PageMeta
// We cast to the full shape at usage
interface ProgramPageFull {
  content: Program[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const PROGRAMS_QUERY_KEY = (page: number) =>
  ["programs", "list", page] as const;

function ProgramListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parsePageParam(searchParams);

  const { data, isLoading } = useQuery({
    queryKey: PROGRAMS_QUERY_KEY(page),
    queryFn: () =>
      catalogApi
        .listPrograms({ status: "ACTIVE" as const, page, size: 20 })
        .then((r) => r.data as unknown as ProgramPageFull),
  });

  const programs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <BackLink to="/dashboard" />
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-foreground font-display">
          Catálogo de programas académicos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Consultá los programas académicos disponibles en la Universidad del
          Quindío.
        </p>
      </header>

      {isLoading ? (
        <div role="status" aria-live="polite" className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <span className="sr-only">Cargando programas…</span>
          <Skeleton className="h-32 w-full rounded-none" />
          <Skeleton className="h-32 w-full rounded-none" />
          <Skeleton className="h-32 w-full rounded-none" />
          <Skeleton className="h-32 w-full rounded-none" />
        </div>
      ) : programs.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No hay programas disponibles en este momento.
        </p>
      ) : (
        <>
          <section
            aria-label="Lista de programas"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
          >
            {programs.map((program) => (
              <ProgramCard key={program.id} program={program} />
            ))}
          </section>

          {totalPages > 1 && (
            <nav
              aria-label="Paginación de programas"
              className="flex items-center justify-center gap-3 mt-4"
            >
              <button
                onClick={() =>
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    const newPage = Math.max(0, page - 1);
                    if (newPage === 0) {
                      next.delete("page");
                    } else {
                      next.set("page", String(newPage));
                    }
                    return next;
                  })
                }
                disabled={page === 0}
                aria-label="Página anterior"
                className={cn(
                  "px-3 py-1 text-sm border border-border rounded",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "hover:bg-muted/40 transition-colors"
                )}
              >
                Anterior
              </button>

              <span className="text-sm text-muted-foreground" aria-current="page">
                Página {page + 1} de {totalPages}
              </span>

              <button
                onClick={() =>
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    next.set("page", String(Math.min(totalPages - 1, page + 1)));
                    return next;
                  })
                }
                disabled={page >= totalPages - 1}
                aria-label="Página siguiente"
                className={cn(
                  "px-3 py-1 text-sm border border-border rounded",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "hover:bg-muted/40 transition-colors"
                )}
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export { ProgramListPage };
