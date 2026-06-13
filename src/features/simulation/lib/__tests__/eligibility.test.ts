/**
 * eligibility.test.ts — Unit tests for deriveEligibility (TDD RED phase)
 *
 * Pure function tests: no React, no MSW, no DOM.
 */

import { describe, it, expect } from "vitest";
import { deriveEligibility } from "../eligibility";
import type { CurriculumMapEntry } from "../eligibility";

// Helper to build a minimal CurriculumMapEntry
function makeEntry(overrides: Partial<CurriculumMapEntry["course"]> = {}): CurriculumMapEntry {
  return {
    course: {
      courseId: "course-1",
      name: "Cálculo I",
      credits: 4,
      type: "REQUIRED",
      progressStatus: "AVAILABLE",
      unmetRequirements: [],
      ...overrides,
    },
    recommendedSemester: 1,
  };
}

describe("deriveEligibility", () => {
  it("PASSED course → status passed, addable false, empty reasons", () => {
    const map = new Map<string, CurriculumMapEntry>([
      ["course-1", makeEntry({ progressStatus: "PASSED" })],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.status).toBe("passed");
    expect(verdict.addable).toBe(false);
    expect(verdict.reasons).toEqual([]);
  });

  it("BLOCKED course → status blocked, addable true, reasons from unmetRequirements", () => {
    const map = new Map<string, CurriculumMapEntry>([
      [
        "course-1",
        makeEntry({
          progressStatus: "BLOCKED",
          unmetRequirements: ["Cálculo I", "[Recomendado] Física II"],
        }),
      ],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.status).toBe("blocked");
    expect(verdict.addable).toBe(true);
    expect(verdict.reasons).toEqual(["Cálculo I", "[Recomendado] Física II"]);
  });

  it("AVAILABLE course → status available, addable true, no reasons", () => {
    const map = new Map<string, CurriculumMapEntry>([
      ["course-1", makeEntry({ progressStatus: "AVAILABLE" })],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.status).toBe("available");
    expect(verdict.addable).toBe(true);
    expect(verdict.reasons).toEqual([]);
  });

  it("PENDING course → status available, addable true (degrade to available)", () => {
    const map = new Map<string, CurriculumMapEntry>([
      ["course-1", makeEntry({ progressStatus: "PENDING" })],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.status).toBe("available");
    expect(verdict.addable).toBe(true);
  });

  it("no map entry (off-plan / degraded) → status unknown, addable true", () => {
    const map = new Map<string, CurriculumMapEntry>();

    const verdict = deriveEligibility("course-not-in-map", map);

    expect(verdict.status).toBe("unknown");
    expect(verdict.addable).toBe(true);
    expect(verdict.reasons).toEqual([]);
  });

  it("FAILED course → status available, addable true (still attempt-able)", () => {
    const map = new Map<string, CurriculumMapEntry>([
      ["course-1", makeEntry({ progressStatus: "FAILED" })],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.status).toBe("available");
    expect(verdict.addable).toBe(true);
  });

  it("CANCELLED course → status available, addable true", () => {
    const map = new Map<string, CurriculumMapEntry>([
      ["course-1", makeEntry({ progressStatus: "CANCELLED" })],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.status).toBe("available");
    expect(verdict.addable).toBe(true);
  });

  it("verdict carries recommendedSemester and credits from map entry", () => {
    const map = new Map<string, CurriculumMapEntry>([
      [
        "course-1",
        {
          course: {
            courseId: "course-1",
            name: "Cálculo I",
            credits: 4,
            type: "REQUIRED",
            progressStatus: "AVAILABLE",
          },
          recommendedSemester: 3,
        },
      ],
    ]);

    const verdict = deriveEligibility("course-1", map);

    expect(verdict.recommendedSemester).toBe(3);
    expect(verdict.credits).toBe(4);
    expect(verdict.type).toBe("REQUIRED");
  });
});
