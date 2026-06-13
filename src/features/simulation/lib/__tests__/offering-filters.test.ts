/**
 * offering-filters.test.ts — Unit tests for applyOfferingFilters (TDD RED phase)
 *
 * Pure function tests: no React, no MSW, no DOM.
 */

import { describe, it, expect } from "vitest";
import { applyOfferingFilters, offeringFilterSchema } from "../offering-filters";
import type { OfferingWithVerdict } from "../offering-filters";
import type { EligibilityVerdict } from "../eligibility";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeVerdict(overrides: Partial<EligibilityVerdict> = {}): EligibilityVerdict {
  return {
    status: "available",
    reasons: [],
    addable: true,
    recommendedSemester: 1,
    credits: 4,
    type: "REQUIRED",
    ...overrides,
  };
}

function makeItem(
  id: string,
  courseName: string,
  officialCode: string,
  verdictOverrides: Partial<EligibilityVerdict> = {}
): OfferingWithVerdict {
  return {
    offering: {
      id,
      courseId: `${id}-course`,
      courseName,
      programId: "prog-1",
      periodId: "period-1",
      status: "FINAL",
      version: 1,
      officialCode,
    } as OfferingWithVerdict["offering"],
    verdict: makeVerdict(verdictOverrides),
  };
}

const ITEMS: OfferingWithVerdict[] = [
  makeItem("off-1", "Cálculo Diferencial", "MAT101", { recommendedSemester: 1, credits: 4, type: "REQUIRED" }),
  makeItem("off-2", "Álgebra Lineal", "MAT201", { recommendedSemester: 2, credits: 3, type: "REQUIRED" }),
  makeItem("off-3", "Física I", "FIS101", { recommendedSemester: 1, credits: 4, type: "REQUIRED" }),
  makeItem("off-4", "Electiva de Profundización", "ELE401", { recommendedSemester: 4, credits: 2, type: "DEEPENING" }),
];

const EMPTY_FILTER = offeringFilterSchema.parse({});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("offeringFilterSchema", () => {
  it("parses empty object to defaults", () => {
    const filter = offeringFilterSchema.parse({});
    expect(filter.search).toBe("");
    expect(filter.semester).toBeNull();
    expect(filter.minCredits).toBeNull();
    expect(filter.maxCredits).toBeNull();
    expect(filter.type).toBeNull();
  });
});

describe("applyOfferingFilters", () => {
  it("no filter → returns all items unchanged", () => {
    const result = applyOfferingFilters(ITEMS, EMPTY_FILTER);
    expect(result).toHaveLength(4);
  });

  it("search by course name (case-insensitive, partial match)", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, search: "calculo" });
    expect(result).toHaveLength(1);
    expect(result.at(0)?.offering.courseName).toBe("Cálculo Diferencial");
  });

  it("search by official code (case-insensitive, partial match)", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, search: "mat" });
    expect(result).toHaveLength(2);
    const names = result.map((r) => r.offering.courseName);
    expect(names).toContain("Cálculo Diferencial");
    expect(names).toContain("Álgebra Lineal");
  });

  it("search is diacritic-insensitive (álgebra → algebra)", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, search: "algebra" });
    expect(result).toHaveLength(1);
    expect(result.at(0)?.offering.courseName).toBe("Álgebra Lineal");
  });

  it("semester filter returns only offerings for that semester", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, semester: 2 });
    expect(result).toHaveLength(1);
    expect(result.at(0)?.offering.courseName).toBe("Álgebra Lineal");
  });

  it("credits filter (minCredits + maxCredits) returns matching range", () => {
    // Only offerings with credits >= 3 and <= 3
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, minCredits: 3, maxCredits: 3 });
    expect(result).toHaveLength(1);
    expect(result.at(0)?.offering.courseName).toBe("Álgebra Lineal");
  });

  it("type filter returns only offerings of that type", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, type: "DEEPENING" });
    expect(result).toHaveLength(1);
    expect(result.at(0)?.offering.courseName).toBe("Electiva de Profundización");
  });

  it("AND composition: search + type filters both active", () => {
    // search="fisica" and type="REQUIRED" — both must apply
    const items: OfferingWithVerdict[] = [
      ...ITEMS,
      makeItem("off-5", "Física II", "FIS201", { type: "DEEPENING", recommendedSemester: 2 }),
    ];
    const result = applyOfferingFilters(items, { ...EMPTY_FILTER, search: "física", type: "REQUIRED" });
    expect(result).toHaveLength(1);
    expect(result.at(0)?.offering.courseName).toBe("Física I");
  });

  it("AND composition: semester + credits filters both active", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, semester: 1, maxCredits: 4 });
    // semester 1: Cálculo (4cr) + Física (4cr); maxCredits=4 passes both
    expect(result).toHaveLength(2);
  });

  it("filter producing zero results returns empty array", () => {
    const result = applyOfferingFilters(ITEMS, { ...EMPTY_FILTER, search: "xyzzy-no-match" });
    expect(result).toHaveLength(0);
  });

  it("unknown-verdict item passes when data-filters are null (cannot filter unknown)", () => {
    const unknownItem = makeItem("off-u", "Curso Externo", "EXT999", {
      status: "unknown",
      recommendedSemester: undefined,
      credits: undefined,
      type: undefined,
    } as Partial<EligibilityVerdict>);
    const result = applyOfferingFilters([unknownItem], EMPTY_FILTER);
    // All null filters → passes
    expect(result).toHaveLength(1);
  });

  it("unknown-verdict item is excluded when a data filter is set that it cannot satisfy", () => {
    const unknownItem = makeItem("off-u", "Curso Externo", "EXT999", {
      status: "unknown",
      recommendedSemester: undefined,
      credits: undefined,
      type: undefined,
    } as Partial<EligibilityVerdict>);
    // semester filter set — unknown item has no semester, should be excluded
    const result = applyOfferingFilters([unknownItem], { ...EMPTY_FILTER, semester: 1 });
    expect(result).toHaveLength(0);
  });

  // ─── Task 4: program filter ──────────────────────────────────────────────────

  it("program filter keeps only items matching the given programId", () => {
    const items: OfferingWithVerdict[] = [
      makeItem("off-1", "Cálculo I", "MAT101", { recommendedSemester: 1 }),
      {
        offering: {
          id: "off-prog2",
          courseId: "course-prog2",
          courseName: "Álgebra Lineal",
          programId: "prog-2",
          periodId: "period-1",
          status: "FINAL",
          version: 1,
          officialCode: "MAT201",
        },
        verdict: makeVerdict({ recommendedSemester: 1 }),
      },
    ];

    const result = applyOfferingFilters(items, { ...EMPTY_FILTER, program: "prog-1" });
    expect(result).toHaveLength(1);
    expect(result[0]?.offering.courseName).toBe("Cálculo I");
  });

  it("program filter null → all items pass", () => {
    const items: OfferingWithVerdict[] = [
      makeItem("off-1", "Cálculo I", "MAT101"),
      {
        offering: {
          id: "off-prog2",
          courseId: "course-prog2",
          courseName: "Álgebra Lineal",
          programId: "prog-2",
          periodId: "period-1",
          status: "FINAL",
          version: 1,
          officialCode: "MAT201",
        },
        verdict: makeVerdict(),
      },
    ];

    const result = applyOfferingFilters(items, { ...EMPTY_FILTER, program: null });
    expect(result).toHaveLength(2);
  });

  // ─── Task 6: AND composition 3+ filters ──────────────────────────────────────

  it("AND composition: search + semester + type all active", () => {
    const items: OfferingWithVerdict[] = [
      makeItem("off-1", "Cálculo Diferencial", "MAT101", { recommendedSemester: 1, type: "REQUIRED" }),
      makeItem("off-2", "Cálculo Integral", "MAT102", { recommendedSemester: 1, type: "DEEPENING" }),
      makeItem("off-3", "Álgebra Lineal", "MAT201", { recommendedSemester: 2, type: "REQUIRED" }),
      makeItem("off-4", "Cálculo Vectorial", "MAT301", { recommendedSemester: 1, type: "REQUIRED" }),
    ];

    // search="calculo" + semester=1 + type="REQUIRED" → matches off-1 and off-4
    const result = applyOfferingFilters(items, {
      ...EMPTY_FILTER,
      search: "calculo",
      semester: 1,
      type: "REQUIRED",
    });
    expect(result).toHaveLength(2);
    const names = result.map((r) => r.offering.courseName);
    expect(names).toContain("Cálculo Diferencial");
    expect(names).toContain("Cálculo Vectorial");
    expect(names).not.toContain("Cálculo Integral"); // wrong type
    expect(names).not.toContain("Álgebra Lineal"); // wrong semester
  });

  it("AND composition: search + semester + type + program — 4 filters", () => {
    const prog2Item: OfferingWithVerdict = {
      offering: {
        id: "off-p2",
        courseId: "course-p2",
        courseName: "Cálculo Numérico",
        programId: "prog-2",
        periodId: "period-1",
        status: "FINAL",
        version: 1,
        officialCode: "MAT401",
      },
      verdict: makeVerdict({ recommendedSemester: 1, type: "REQUIRED" }),
    };
    const items: OfferingWithVerdict[] = [
      makeItem("off-1", "Cálculo Diferencial", "MAT101", { recommendedSemester: 1, type: "REQUIRED" }),
      prog2Item,
    ];

    // All 4 filters: search="calculo", semester=1, type="REQUIRED", program="prog-1"
    const result = applyOfferingFilters(items, {
      ...EMPTY_FILTER,
      search: "calculo",
      semester: 1,
      type: "REQUIRED",
      program: "prog-1",
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.offering.courseName).toBe("Cálculo Diferencial");
  });

  it("offeringFilterSchema includes program and jornada fields with null defaults", () => {
    const filter = offeringFilterSchema.parse({});
    expect((filter as { program?: null }).program).toBeNull();
    expect((filter as { jornada?: null }).jornada).toBeNull();
  });
});
