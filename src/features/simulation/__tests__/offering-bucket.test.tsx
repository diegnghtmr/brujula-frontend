/**
 * OfferingBucket tests — Task 7 coverage.
 *
 * Tests:
 * - groupBySemester=false: flat rendering (existing behavior).
 * - groupBySemester=true: semester subheadings rendered, offerings under correct group.
 * - Offerings without semester go under "Otras" when groupBySemester=true.
 * - Empty → returns null (no render).
 * - Count in h3 title always reflects total offerings.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OfferingBucket } from "@/features/simulation/components/offering-bucket";
import type { OfferingWithVerdict } from "@/features/simulation/lib/offering-filters";

function makeItem(id: string, courseName: string, semester?: number): OfferingWithVerdict {
  return {
    offering: {
      id,
      courseId: `${id}-course`,
      courseName,
      programId: "prog-1",
      periodId: "period-1",
      status: "FINAL",
      version: 1,
    } as OfferingWithVerdict["offering"],
    verdict: {
      status: "available",
      reasons: [],
      addable: true,
      recommendedSemester: semester,
    },
  };
}

function renderItem(item: OfferingWithVerdict) {
  return <li key={item.offering.id}>{item.offering.courseName}</li>;
}

describe("OfferingBucket", () => {
  it("returns null when offerings is empty", () => {
    const { container } = render(
      <OfferingBucket
        titleId="t1"
        title="Disponibles"
        tone="available"
        offerings={[]}
        renderOffering={renderItem}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders flat list by default (groupBySemester=false)", () => {
    const items = [makeItem("a", "Cálculo I", 1), makeItem("b", "Física I", 2)];
    render(
      <OfferingBucket
        titleId="t2"
        title="Disponibles"
        tone="available"
        offerings={items}
        renderOffering={renderItem}
      />
    );
    // Both items visible
    expect(screen.getByText("Cálculo I")).toBeInTheDocument();
    expect(screen.getByText("Física I")).toBeInTheDocument();
    // No semester subheadings
    expect(screen.queryByText("Semestre 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Semestre 2")).not.toBeInTheDocument();
  });

  it("shows count in the bucket title", () => {
    const items = [makeItem("a", "Cálculo I", 1), makeItem("b", "Física I", 2)];
    render(
      <OfferingBucket
        titleId="t3"
        title="Disponibles"
        tone="available"
        offerings={items}
        renderOffering={renderItem}
      />
    );
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  // ─── Task 7: groupBySemester ──────────────────────────────────────────────────

  it("groupBySemester=true renders 'Semestre N' subheadings", () => {
    const items = [makeItem("a", "Cálculo I", 1), makeItem("b", "Física I", 2)];
    render(
      <OfferingBucket
        titleId="t4"
        title="Disponibles"
        tone="available"
        offerings={items}
        renderOffering={renderItem}
        groupBySemester
      />
    );
    expect(screen.getByText("Semestre 1")).toBeInTheDocument();
    expect(screen.getByText("Semestre 2")).toBeInTheDocument();
  });

  it("groupBySemester=true places offerings under the correct semester group", () => {
    const items = [
      makeItem("a", "Cálculo I", 1),
      makeItem("b", "Álgebra", 1),
      makeItem("c", "Física I", 2),
    ];
    render(
      <OfferingBucket
        titleId="t5"
        title="Disponibles"
        tone="available"
        offerings={items}
        renderOffering={renderItem}
        groupBySemester
      />
    );
    const sem1Heading = screen.getByText("Semestre 1");
    const sem2Heading = screen.getByText("Semestre 2");
    const calcItem = screen.getByText("Cálculo I");
    const algebraItem = screen.getByText("Álgebra");
    const fisicaItem = screen.getByText("Física I");

    // Semestre 1 heading comes before Semestre 2 heading
    expect(sem1Heading.compareDocumentPosition(sem2Heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // Items in sem 1 appear before sem 2 heading
    expect(calcItem.compareDocumentPosition(sem2Heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(algebraItem.compareDocumentPosition(sem2Heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    // Física I appears after Semestre 2 heading
    expect(sem2Heading.compareDocumentPosition(fisicaItem)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("groupBySemester=true groups items with no semester under 'Otras'", () => {
    const items = [
      makeItem("a", "Cálculo I", 1),
      makeItem("b", "Curso Sin Semestre"),
    ];
    render(
      <OfferingBucket
        titleId="t6"
        title="Disponibles"
        tone="available"
        offerings={items}
        renderOffering={renderItem}
        groupBySemester
      />
    );
    expect(screen.getByText("Semestre 1")).toBeInTheDocument();
    expect(screen.getByText("Otras")).toBeInTheDocument();
    // "Otras" heading appears after "Semestre 1" heading (null group goes last)
    const sem1 = screen.getByText("Semestre 1");
    const otras = screen.getByText("Otras");
    expect(sem1.compareDocumentPosition(otras)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("groupBySemester=true with only unknown-semester items: only 'Otras' group shown", () => {
    const items = [makeItem("a", "Curso A"), makeItem("b", "Curso B")];
    render(
      <OfferingBucket
        titleId="t7"
        title="Disponibles"
        tone="available"
        offerings={items}
        renderOffering={renderItem}
        groupBySemester
      />
    );
    expect(screen.getByText("Otras")).toBeInTheDocument();
    expect(screen.queryByText(/Semestre \d+/)).not.toBeInTheDocument();
  });

  it("passed bucket stays flat even when groupBySemester is not passed", () => {
    const items = [makeItem("a", "Cálculo I", 1), makeItem("b", "Física I", 2)];
    render(
      <OfferingBucket
        titleId="t8"
        title="Ya cursadas"
        tone="passed"
        offerings={items}
        renderOffering={renderItem}
        // groupBySemester NOT passed → defaults to false
      />
    );
    expect(screen.queryByText("Semestre 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Semestre 2")).not.toBeInTheDocument();
    expect(screen.getByText("Cálculo I")).toBeInTheDocument();
    expect(screen.getByText("Física I")).toBeInTheDocument();
  });
});
