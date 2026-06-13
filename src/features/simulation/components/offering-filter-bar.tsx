/**
 * OfferingFilterBar — presentational filter controls for OfferingBrowser.
 *
 * Filters: search (name/code), semester (dynamic from curriculum data), credits
 * (min/max), course type (4 selectable types only), program (hidden when single),
 * jornada (hidden when single). Clear button resets all to defaults.
 *
 * Accessibility: aria-live="polite" result count region, labelled inputs.
 * React Compiler is ON: no useMemo/useCallback.
 */

import { cn } from "@/lib/utils";
import { offeringFilterSchema } from "../lib/offering-filters";
import type { OfferingFilter } from "../lib/offering-filters";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OfferingFilterBarProps {
  filter: OfferingFilter;
  onChange: (partial: Partial<OfferingFilter>) => void;
  onClear: () => void;
  totalCount: number;
  visibleCount: number;
  /** Sorted available semester numbers derived from curriculum data. */
  availableSemesters: number[];
  /** Program options for the program select. Hidden when length <= 1. */
  programs: { id: string; name: string }[];
  /** Distinct journey codes for the jornada select. Hidden when length <= 1. */
  journeys: string[];
}

// ─── CourseType labels — full map for reference ───────────────────────────────

const COURSE_TYPE_LABELS: Record<string, string> = {
  REQUIRED: "Núcleo común",
  PERSONAL_ELECTIVE: "Electiva personal",
  DEEPENING: "Profundización",
  DEGREE_WORK: "Trabajo de grado",
  INSTITUTIONAL: "Institucional",
  OPTIONAL: "Optativa",
} as const;

/**
 * Ordered list of selectable type options.
 * INSTITUTIONAL and OPTIONAL are intentionally excluded from the filter UI.
 */
const SELECTABLE_TYPES: readonly string[] = [
  "REQUIRED",
  "PERSONAL_ELECTIVE",
  "DEEPENING",
  "DEGREE_WORK",
] as const;

// ─── Jornada label map ────────────────────────────────────────────────────────

const JORNADA_LABELS: Record<string, string> = {
  DIURNA: "Diurna",
  NOCTURNA: "Nocturna",
} as const;

// ─── Default filter (Zod source of truth) ─────────────────────────────────────

const DEFAULT_FILTER = offeringFilterSchema.parse({});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isFilterActive(filter: OfferingFilter): boolean {
  return (
    filter.search !== DEFAULT_FILTER.search ||
    filter.semester !== DEFAULT_FILTER.semester ||
    filter.minCredits !== DEFAULT_FILTER.minCredits ||
    filter.maxCredits !== DEFAULT_FILTER.maxCredits ||
    filter.type !== DEFAULT_FILTER.type ||
    filter.program !== null ||
    filter.jornada !== null
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

function OfferingFilterBar({
  filter,
  onChange,
  onClear,
  totalCount,
  visibleCount,
  availableSemesters,
  programs,
  journeys,
}: OfferingFilterBarProps) {
  const filterActive = isFilterActive(filter);

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: search + result count */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <label htmlFor="offering-search" className="sr-only">
            Buscar por nombre o código
          </label>
          <input
            id="offering-search"
            type="search"
            value={filter.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="Buscar por nombre o código…"
            className={cn(
              "w-full h-8 px-3 text-sm rounded border border-input bg-background",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            )}
          />
        </div>

        {/* Live result count */}
        <p
          aria-live="polite"
          aria-atomic="true"
          className="text-xs text-muted-foreground whitespace-nowrap shrink-0"
        >
          {visibleCount} de {totalCount}
        </p>
      </div>

      {/* Row 2: selects group — equal-width grid cells */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 items-end">
        {/* Semester selector — options from curriculum data */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="offering-semester" className="text-xs text-muted-foreground">
            Semestre
          </label>
          <select
            id="offering-semester"
            value={filter.semester ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ semester: val === "" ? null : Number.parseInt(val, 10) });
            }}
            className={cn(
              "h-8 w-full px-2 text-sm rounded border border-input bg-background",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            )}
            aria-label="Semestre"
          >
            <option value="">Semestre: todos</option>
            {availableSemesters.map((s) => (
              <option key={s} value={s}>
                Semestre {s}
              </option>
            ))}
          </select>
        </div>

        {/* Credits min/max pair */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="offering-min-credits" className="text-xs text-muted-foreground">
            Créditos
          </label>
          <div className="flex gap-1">
            <input
              id="offering-min-credits"
              type="number"
              inputMode="numeric"
              min={0}
              value={filter.minCredits ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ minCredits: val === "" ? null : Number.parseInt(val, 10) });
              }}
              placeholder="mín"
              className={cn(
                "h-8 w-full flex-1 px-2 text-sm rounded border border-input bg-background text-center",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              )}
              aria-label="Créditos mínimos"
            />
            <input
              id="offering-max-credits"
              type="number"
              inputMode="numeric"
              min={0}
              value={filter.maxCredits ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ maxCredits: val === "" ? null : Number.parseInt(val, 10) });
              }}
              placeholder="máx"
              className={cn(
                "h-8 w-full flex-1 px-2 text-sm rounded border border-input bg-background text-center",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              )}
              aria-label="Créditos máximos"
            />
          </div>
        </div>

        {/* Course type selector — 4 selectable types only (INSTITUTIONAL + OPTIONAL excluded) */}
        <div className="flex flex-col gap-0.5">
          <label htmlFor="offering-type" className="text-xs text-muted-foreground">
            Tipo
          </label>
          <select
            id="offering-type"
            value={filter.type ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              onChange({ type: val === "" ? null : val });
            }}
            className={cn(
              "h-8 w-full px-2 text-sm rounded border border-input bg-background",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
            )}
            aria-label="Tipo de materia"
          >
            <option value="">Tipo: todos</option>
            {SELECTABLE_TYPES.map((value) => (
              <option key={value} value={value}>
                {COURSE_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {/* Program selector — only when scope has multiple programs */}
        {programs.length > 1 && (
          <div className="flex flex-col gap-0.5">
            <label htmlFor="offering-program" className="text-xs text-muted-foreground">
              Carrera
            </label>
            <select
              id="offering-program"
              value={filter.program ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ program: val === "" ? null : val });
              }}
              className={cn(
                "h-8 w-full px-2 text-sm rounded border border-input bg-background",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
              )}
              aria-label="Carrera"
            >
              <option value="">Carrera: todas</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Jornada selector — only when scope has multiple journeys */}
        {journeys.length > 1 && (
          <div className="flex flex-col gap-0.5">
            <label htmlFor="offering-jornada" className="text-xs text-muted-foreground">
              Jornada
            </label>
            <select
              id="offering-jornada"
              value={filter.jornada ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                onChange({ jornada: val === "" ? null : val });
              }}
              className={cn(
                "h-8 w-full px-2 text-sm rounded border border-input bg-background",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0"
              )}
              aria-label="Jornada"
            >
              <option value="">Jornada: todas</option>
              {journeys.map((j) => (
                <option key={j} value={j}>
                  {JORNADA_LABELS[j] ?? j}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Limpiar filtros — visible only when any filter differs from defaults */}
        {filterActive && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "h-8 px-3 text-xs font-medium rounded border transition-colors",
              "border-input bg-background text-muted-foreground",
              "hover:bg-muted/20 hover:text-foreground"
            )}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { OfferingFilterBar, SELECTABLE_TYPES, COURSE_TYPE_LABELS };
export type { OfferingFilterBarProps };
