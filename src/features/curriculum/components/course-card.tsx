/**
 * CourseCard — atomic component for a single course in the malla grid.
 * Shows course name, credits, type, and requirement edges with confidence badges.
 */

import type { MallaCourse } from "@/api/generated/models/malla-course";
import { RequirementBadge } from "./requirement-badge";
import { cn } from "@/lib/utils";

const COURSE_TYPE_LABELS: Record<string, string> = {
  REQUIRED: "Obligatoria",
  PERSONAL_ELECTIVE: "Electiva personal",
  DEEPENING: "Profundización",
  DEGREE_WORK: "Trabajo de grado",
  INSTITUTIONAL: "Institucional",
  OPTIONAL: "Optativa",
};

interface CourseCardProps {
  course: MallaCourse;
}

function CourseCard({ course }: CourseCardProps) {
  const typeLabel = COURSE_TYPE_LABELS[course.type as string] ?? course.type;

  return (
    <article
      className={cn(
        // §6.4/§5.1: content cards use rounded-none (flat)
        "flex flex-col gap-1.5 p-2.5 border border-border bg-card rounded-none",
        "text-xs min-w-[120px]"
      )}
      aria-label={`Materia: ${course.name}`}
    >
      <p className="font-medium text-foreground leading-snug line-clamp-2 text-xs">
        {course.name}
      </p>

      <div className="flex items-center gap-1.5 text-muted-foreground">
        {/* Credits — §3.1/§9: tabular-nums for numeric values */}
        <span className="shrink-0 tabular-nums">
          {course.credits} cr
        </span>
        <span aria-hidden="true">·</span>
        {/* Type */}
        <span className="truncate text-[10px] uppercase tracking-wide">
          {typeLabel}
        </span>
      </div>

      {/* Requirement edges */}
      {course.requirements && course.requirements.length > 0 && (
        <div
          className="flex flex-wrap gap-1 mt-0.5"
          aria-label="Requisitos de la materia"
        >
          {course.requirements.map((req, idx) => (
            <RequirementBadge key={idx} requirement={req} />
          ))}
        </div>
      )}
    </article>
  );
}

export { CourseCard };
