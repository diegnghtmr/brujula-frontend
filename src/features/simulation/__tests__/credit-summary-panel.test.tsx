/**
 * CreditSummaryPanel — DET-002, FE-005, INV-005
 *
 * withinLimit=false → warning icon + label (WCAG: not color alone)
 * withinLimit=true  → success indicator
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreditSummaryPanel } from "@/features/simulation/components/credit-summary-panel";
import type { ProgramCreditSummary } from "@/api/generated/models/program-credit-summary";

const WITHIN_LIMIT: ProgramCreditSummary = {
  programId: "prog-1",
  programName: "Ingeniería de Sistemas",
  selectedCredits: 15,
  creditLimit: 23,
  withinLimit: true,
};

const EXCEEDS_LIMIT: ProgramCreditSummary = {
  programId: "prog-2",
  programName: "Licenciatura en Lenguas",
  selectedCredits: 25,
  creditLimit: 23,
  withinLimit: false,
};

describe("CreditSummaryPanel", () => {
  it("withinLimit=true renders program name and credit counts", () => {
    render(<CreditSummaryPanel summaries={[WITHIN_LIMIT]} />);
    expect(screen.getByText("Ingeniería de Sistemas")).toBeInTheDocument();
    // The credit count text node "15" + " / " + "23" + " créditos" may be in separate spans
    // Check that both numbers appear somewhere in the document
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText(/créditos/i)).toBeInTheDocument();
  });

  it("withinLimit=true shows success indicator (no warning)", () => {
    render(<CreditSummaryPanel summaries={[WITHIN_LIMIT]} />);
    // Warning should NOT be visible for within-limit
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Success indicator present
    const successIcon = screen.getByRole("img", { name: /dentro del límite|within/i });
    expect(successIcon).toBeInTheDocument();
  });

  it("withinLimit=false shows warning icon and label (WCAG: not color alone)", () => {
    render(<CreditSummaryPanel summaries={[EXCEEDS_LIMIT]} />);
    expect(screen.getByText("Licenciatura en Lenguas")).toBeInTheDocument();
    // Warning icon/text must be present — WCAG AA
    const warningEl = screen.getByRole("img", { name: /límite superado|exceeded|warning/i });
    expect(warningEl).toBeInTheDocument();
    // Warning label text also present
    expect(screen.getByText(/límite superado|excede el límite/i)).toBeInTheDocument();
  });

  it("renders all program summaries when multiple provided", () => {
    render(<CreditSummaryPanel summaries={[WITHIN_LIMIT, EXCEEDS_LIMIT]} />);
    expect(screen.getByText("Ingeniería de Sistemas")).toBeInTheDocument();
    expect(screen.getByText("Licenciatura en Lenguas")).toBeInTheDocument();
  });
});
