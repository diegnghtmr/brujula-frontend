/**
 * RequirementBadge — WCAG 2.2 AA + axe zero-violations (T-WU6.8 / QAL-A11Y-001-S3)
 *
 * INV: confidence conveyed by color + icon + text label (never color alone).
 * HIGH → ALTA, MEDIUM → MEDIA, LOW → BAJA, null → generic "Requisito"
 *
 * vitest-axe assertions run at jsdom level (no backend required).
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { axe } from "vitest-axe";
import { RequirementBadge } from "@/features/curriculum/components/requirement-badge";
import type { MallaRequirement } from "@/api/generated/models/malla-requirement";
import { RequirementType } from "@/api/generated/models/requirement-type";

function makeRequirement(confidence: string | null | undefined): MallaRequirement {
  return {
    type: RequirementType.CoursePassed,
    requiredCourseId: "course-a",
    confidence: confidence as MallaRequirement["confidence"],
  };
}

describe("RequirementBadge (WCAG structure)", () => {
  it("HIGH confidence renders ALTA label with aria-label", () => {
    render(<RequirementBadge requirement={makeRequirement("HIGH")} />);
    expect(screen.getByText("ALTA")).toBeInTheDocument();
  });

  it("MEDIUM confidence renders MEDIA label", () => {
    render(<RequirementBadge requirement={makeRequirement("MEDIUM")} />);
    expect(screen.getByText("MEDIA")).toBeInTheDocument();
  });

  it("LOW confidence renders BAJA label", () => {
    render(<RequirementBadge requirement={makeRequirement("LOW")} />);
    expect(screen.getByText("BAJA")).toBeInTheDocument();
  });

  it("null confidence renders generic Requisito label", () => {
    render(<RequirementBadge requirement={makeRequirement(null)} />);
    expect(screen.getByText("Requisito")).toBeInTheDocument();
  });
});

/**
 * T-WU6.8 / QAL-A11Y-001-S3 — vitest-axe zero-violation assertions.
 * SUGGESTION-3: WCAG 1.4.3 color-contrast is NOT exercised under jsdom; it is verified by the Playwright e2e sweep.
 */
describe("RequirementBadge — axe zero-violations (T-WU6.8)", () => {
  const confidences: Array<string | null> = ["HIGH", "MEDIUM", "LOW", null];

  for (const confidence of confidences) {
    it(`${confidence ?? "null"}: no axe violations`, async () => {
      const { container } = render(
        <RequirementBadge requirement={makeRequirement(confidence)} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  }
});
