/**
 * SemesterColumn — atomic component for one semester bucket in the malla grid.
 * Renders the semester label and the list of courses in that semester.
 */

import type { PlanMallaSemesterBucketsInner } from "@/api/generated/models/plan-malla-semester-buckets-inner";
import { CourseCard } from "./course-card";
import { cn } from "@/lib/utils";

interface SemesterColumnProps {
  bucket: PlanMallaSemesterBucketsInner;
}

function SemesterColumn({ bucket }: SemesterColumnProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 min-w-[140px] flex-shrink-0",
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
          {bucket.courses.length} {bucket.courses.length === 1 ? "materia" : "materias"}
        </p>
      </header>

      {/* Courses */}
      <div className="flex flex-col gap-2">
        {bucket.courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </div>
  );
}

export { SemesterColumn };
