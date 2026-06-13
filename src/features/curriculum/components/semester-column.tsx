/**
 * SemesterColumn — atomic component for one semester bucket in the malla grid.
 * Renders the semester label and the list of courses in that semester.
 *
 * #23: shows total credits alongside materia count in the header.
 */

import type { PlanMallaSemesterBucketsInner } from "@/api/generated/models/plan-malla-semester-buckets-inner";
import { CourseCard } from "./course-card";
import { cn } from "@/lib/utils";

interface SemesterColumnProps {
  bucket: PlanMallaSemesterBucketsInner;
  courseNames: Map<string, string>;
}

function SemesterColumn({ bucket, courseNames }: SemesterColumnProps) {
  const materiaCount = bucket.courses.length;
  const totalCredits = bucket.courses.reduce((sum, c) => sum + c.credits, 0);

  const materiaLabel = materiaCount === 1 ? "materia" : "materias";
  const creditLabel = totalCredits === 1 ? "crédito" : "créditos";

  return (
    <div
      className={cn(
        "flex flex-col gap-2 w-[200px] flex-shrink-0",
        "border-r border-border pr-3 last:border-r-0 last:pr-0"
      )}
      role="region"
      aria-label={`Semestre ${bucket.recommendedSemester}`}
    >
      {/* Semester header */}
      <header className="sticky top-0 bg-background pb-1 border-b border-border">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Semestre {bucket.recommendedSemester}
        </h3>
        <p className="text-[10px] text-muted-foreground">
          {materiaCount} {materiaLabel} · {totalCredits} {creditLabel}
        </p>
      </header>

      {/* Courses */}
      <div className="flex flex-col gap-2">
        {bucket.courses.map((course) => (
          <CourseCard key={course.id} course={course} courseNames={courseNames} />
        ))}
      </div>
    </div>
  );
}

export { SemesterColumn };
