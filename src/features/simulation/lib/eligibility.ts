/**
 * eligibility.ts — Pure eligibility derivation from curriculum map.
 *
 * No React, no side effects. Fully unit-testable.
 * React Compiler is ON: no useMemo/useCallback anywhere in this module.
 */

import type { CurriculumCourse } from "@/api/generated/models/curriculum-course";
import type { CourseType } from "@/api/generated/models/course-type";

// ─── Types ────────────────────────────────────────────────────────────────────

const ELIGIBILITY_STATUS = {
  AVAILABLE: "available",
  BLOCKED: "blocked",
  PASSED: "passed",
  UNKNOWN: "unknown",
} as const;

type EligibilityStatus = (typeof ELIGIBILITY_STATUS)[keyof typeof ELIGIBILITY_STATUS];

interface EligibilityVerdict {
  status: EligibilityStatus;
  reasons: string[];
  recommendedSemester?: number;
  credits?: number;
  type?: CourseType;
  /** false ONLY for PASSED (hard-disable); true for blocked/available/unknown */
  addable: boolean;
}

interface CurriculumMapEntry {
  course: CurriculumCourse;
  recommendedSemester: number;
}

// ─── Pure function ─────────────────────────────────────────────────────────────

/**
 * Derives an eligibility verdict for a course from the curriculum map.
 *
 * - no entry → unknown, addable (off-plan or degraded — degrade gracefully)
 * - PASSED   → passed, NOT addable (safe, unambiguous hard-disable)
 * - BLOCKED  → blocked, addable (advisory; backend 409 is authoritative)
 * - AVAILABLE | PENDING | FAILED | CANCELLED → available, addable
 */
function deriveEligibility(courseId: string, map: Map<string, CurriculumMapEntry>): EligibilityVerdict {
  const entry = map.get(courseId);

  if (!entry) {
    return {
      status: ELIGIBILITY_STATUS.UNKNOWN,
      reasons: [],
      addable: true,
    };
  }

  const { course, recommendedSemester } = entry;
  const sharedFields = {
    recommendedSemester,
    credits: course.credits,
    type: course.type,
  };

  switch (course.progressStatus) {
    case "PASSED":
      return {
        status: ELIGIBILITY_STATUS.PASSED,
        reasons: [],
        addable: false,
        ...sharedFields,
      };

    case "BLOCKED":
      return {
        status: ELIGIBILITY_STATUS.BLOCKED,
        reasons: course.unmetRequirements ?? [],
        addable: true,
        ...sharedFields,
      };

    // AVAILABLE | PENDING | FAILED | CANCELLED → treat as available
    default:
      return {
        status: ELIGIBILITY_STATUS.AVAILABLE,
        reasons: [],
        addable: true,
        ...sharedFields,
      };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export { ELIGIBILITY_STATUS, deriveEligibility };
export type { EligibilityStatus, EligibilityVerdict, CurriculumMapEntry };
