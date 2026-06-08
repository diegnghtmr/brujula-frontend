/**
 * ValidationNoticeList — FE-006, DET-003
 *
 * blocking in role="alert" distinct from warnings advisory region.
 * Both render when both present.
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationNoticeList } from "@/features/simulation/components/validation-notice-list";
import type { SimulationValidation } from "@/api/generated/models/simulation-validation";

const EMPTY_VALIDATION: SimulationValidation = {
  blocking: [],
  warnings: [],
};

const BLOCKING_ONLY: SimulationValidation = {
  blocking: [
    {
      code: "SIMULATION_SCHEDULE_CLASH",
      message: "Choque de horario detectado entre Matemáticas y Física.",
      metadata: { day: "WEDNESDAY", startsAt: "08:00", endsAt: "10:00", conflictingCourseName: "Física I" },
    },
  ],
  warnings: [],
};

const WARNINGS_ONLY: SimulationValidation = {
  blocking: [],
  warnings: [
    {
      code: "SIMULATION_SOFT_PREREQ_WARNING",
      message: "Se recomienda haber cursado Cálculo I.",
    },
  ],
};

const BOTH: SimulationValidation = {
  blocking: [
    { code: "SIMULATION_PREREQUISITE_NOT_MET", message: "Falta Algoritmos para poder agregar Estructuras." },
  ],
  warnings: [
    { code: "SIMULATION_SOFT_PREREQ_WARNING", message: "Se recomienda haber cursado Cálculo I." },
  ],
};

describe("ValidationNoticeList", () => {
  it("renders nothing when both empty", () => {
    const { container } = render(<ValidationNoticeList validation={EMPTY_VALIDATION} />);
    // No alert or advisory region when nothing to show
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(container.querySelector("[role='note']")).toBeNull();
  });

  it("blocking notices are in role='alert' region", () => {
    render(<ValidationNoticeList validation={BLOCKING_ONLY} />);
    const alertRegion = screen.getByRole("alert");
    expect(alertRegion).toBeInTheDocument();
    expect(alertRegion).toHaveTextContent(/Choque de horario/i);
  });

  it("blocking region is distinct from warnings — no warnings in alert", () => {
    render(<ValidationNoticeList validation={BOTH} />);
    const alertRegion = screen.getByRole("alert");
    expect(alertRegion).toHaveTextContent(/Falta Algoritmos/i);
    // Warning text should NOT be inside the alert
    expect(alertRegion).not.toHaveTextContent(/Cálculo I/i);
  });

  it("warning notices are in advisory region (not role=alert)", () => {
    render(<ValidationNoticeList validation={WARNINGS_ONLY} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    // Advisory region present
    const advisory = screen.getByRole("region", { name: /advertencias|warnings/i });
    expect(advisory).toBeInTheDocument();
    expect(advisory).toHaveTextContent(/Cálculo I/i);
  });

  it("both blocking and warnings render simultaneously when both present", () => {
    render(<ValidationNoticeList validation={BOTH} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Falta Algoritmos/i)).toBeInTheDocument();
    expect(screen.getByText(/Cálculo I/i)).toBeInTheDocument();
  });
});
