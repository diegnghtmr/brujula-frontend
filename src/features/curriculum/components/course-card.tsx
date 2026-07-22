/**
 * CourseCard — expandable course card for the malla grid.
 *
 * #22: collapsed state has uniform minimum height (min-h on name, no line-clamp so
 *      long names wrap fully; no requirement badges so cards align on a floor).
 * #25: expanded state shows full detail — code, credits, type, resolved requirements.
 */

import { useState } from "react";
import type { MallaCourse } from "@/api/generated/models/malla-course";
import type { MallaRequirement } from "@/api/generated/models/malla-requirement";
import { cn } from "@/lib/utils";

const COURSE_TYPE_LABELS: Record<string, string> = {
  REQUIRED: "Núcleo común",
  PERSONAL_ELECTIVE: "Electiva personal",
  DEEPENING: "Profundización",
  DEGREE_WORK: "Trabajo de grado",
  INSTITUTIONAL: "Institucional",
  OPTIONAL: "Optativa",
};

interface CourseCardProps {
  course: MallaCourse;
  courseNames: Map<string, string>;
}

function resolveRequirementLabel(
  req: MallaRequirement,
  courseNames: Map<string, string>
): string {
  const resolveName = (id: string | null | undefined): string =>
    (id && courseNames.get(id)) || "una materia requerida";

  switch (req.type) {
    case "COURSE_PASSED":
      return `Aprobar: ${resolveName(req.requiredCourseId)}`;
    case "SEQUENCE":
      return `Cursar en secuencia con: ${resolveName(req.requiredCourseId)}`;
    case "MINIMUM_CREDITS":
      return "Requiere créditos mínimos aprobados";
    case "CONFIGURABLE":
      // PROP-001: requiredCredits is the configurable pool threshold — the number of
      // distinct approvals required within the pool (e.g. 4 profundización electives).
      return req.requiredCredits != null
        ? `Requisito configurable: ${req.requiredCredits} aprobaciones del grupo`
        : "Requisito configurable";
    default:
      return "Requisito desconocido";
  }
}

function CourseCard({ course, courseNames }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = COURSE_TYPE_LABELS[course.type as string] ?? course.type;

  return (
    <article
      className={cn(
        "flex flex-col border border-border bg-card rounded-none",
        "text-xs w-full"
      )}
      aria-label={`Materia: ${course.name}`}
    >
      {/* Collapsed header — always visible, toggles expansion */}
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="flex flex-col gap-1.5 p-2.5 text-left w-full"
      >
        {/* Course name — min-height floor for uniform alignment; no line-clamp so long names show in full */}
        <p className="font-medium text-foreground leading-snug text-xs min-h-[2.5rem]">
          {course.name}
        </p>

        <div className="flex items-center justify-between gap-1.5 text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {/* Credits */}
            <span className="shrink-0 tabular-nums">
              {course.credits} cr
            </span>
            <span aria-hidden="true">·</span>
            {/* Type */}
            <span className="truncate text-[10px] uppercase tracking-wide">
              {typeLabel}
            </span>
          </div>
          {/* Expand affordance */}
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0 text-[10px] text-muted-foreground transition-transform",
              expanded && "rotate-180"
            )}
          >
            ▼
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-2.5 pb-2.5 flex flex-col gap-1 border-t border-border pt-2">
          {/* Official code */}
          {course.officialCode && (
            <p className="text-[10px] text-muted-foreground">
              {`Código: ${course.officialCode}`}
            </p>
          )}

          {/* Credits */}
          <p className="text-[10px] text-muted-foreground">
            {`Créditos: ${course.credits}`}
          </p>

          {/* Type */}
          <p className="text-[10px] text-muted-foreground">
            {`Tipo: ${typeLabel}`}
          </p>

          {/* Requirements */}
          <div className="mt-0.5">
            <p className="text-[10px] font-medium text-foreground mb-1">
              Requisitos:
            </p>
            {course.requirements.length === 0 ? (
              <p className="text-[10px] text-muted-foreground italic">
                Sin requisitos
              </p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {course.requirements.map((req, idx) => {
                  const label = resolveRequirementLabel(req, courseNames);
                  const simultaneous = req.simultaneityAllowed === true;
                  const confidence = req.confidence;

                  return (
                    <li
                      key={idx}
                      className="text-[10px] text-muted-foreground leading-snug"
                    >
                      {label}
                      {simultaneous && (
                        <span className="ml-1 italic">
                          (puede cursarse en simultáneo)
                        </span>
                      )}
                      {confidence && (
                        <span className="ml-1 text-[9px] opacity-60">
                          [{confidence === "HIGH" ? "ALTA" : confidence === "MEDIUM" ? "MEDIA" : "BAJA"}]
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

export { CourseCard };
