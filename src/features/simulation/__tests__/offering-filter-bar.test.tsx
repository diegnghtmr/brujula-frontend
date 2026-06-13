/**
 * OfferingFilterBar tests — Tasks 2, 3, 4, 5, 6 coverage.
 *
 * Tests:
 * - Task 2: INSTITUTIONAL and OPTIONAL not rendered; 4 selectable types ARE rendered.
 * - Task 3: semester options rendered from availableSemesters prop (dynamic).
 * - Task 4: program select renders only when programs.length > 1; hidden when <= 1.
 * - Task 5: jornada select renders only when journeys.length > 1; hidden when <= 1.
 * - Task 6: "Limpiar filtros" button visible only when a filter differs from defaults;
 *           clicking it calls onClear.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfferingFilterBar } from "@/features/simulation/components/offering-filter-bar";
import { offeringFilterSchema } from "@/features/simulation/lib/offering-filters";
import type { OfferingFilter } from "@/features/simulation/lib/offering-filters";

const DEFAULT_FILTER = offeringFilterSchema.parse({}) as OfferingFilter;

function renderBar(overrides: Partial<Parameters<typeof OfferingFilterBar>[0]> = {}) {
  const props = {
    filter: DEFAULT_FILTER,
    onChange: vi.fn(),
    onClear: vi.fn(),
    totalCount: 10,
    visibleCount: 10,
    availableSemesters: [1, 2, 3],
    programs: [],
    journeys: [],
    ...overrides,
  };
  return { ...render(<OfferingFilterBar {...props} />), props };
}

// ─── Task 2: Type filter options ──────────────────────────────────────────────

describe("OfferingFilterBar — type options (Task 2)", () => {
  it("INSTITUTIONAL option is NOT in the type select", () => {
    renderBar();
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    const options = [...typeSelect.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).not.toContain("Institucional");
  });

  it("OPTIONAL option is NOT in the type select", () => {
    renderBar();
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    const options = [...typeSelect.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).not.toContain("Optativa");
  });

  it("REQUIRED (Núcleo común) option IS in the type select", () => {
    renderBar();
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    const options = [...typeSelect.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toContain("Núcleo común");
  });

  it("PERSONAL_ELECTIVE (Electiva personal) option IS in the type select", () => {
    renderBar();
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    const options = [...typeSelect.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toContain("Electiva personal");
  });

  it("DEEPENING (Profundización) option IS in the type select", () => {
    renderBar();
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    const options = [...typeSelect.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toContain("Profundización");
  });

  it("DEGREE_WORK (Trabajo de grado) option IS in the type select", () => {
    renderBar();
    const typeSelect = screen.getByLabelText(/tipo de materia/i);
    const options = [...typeSelect.querySelectorAll("option")];
    expect(options.map((o) => o.textContent)).toContain("Trabajo de grado");
  });
});

// ─── Task 3: Dynamic semester options ─────────────────────────────────────────

describe("OfferingFilterBar — dynamic semester options (Task 3)", () => {
  it("renders semester options from availableSemesters prop", () => {
    renderBar({ availableSemesters: [1, 2, 3] });
    const semSelect = screen.getByLabelText("Semestre");
    const options = [...semSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Semestre 1");
    expect(options).toContain("Semestre 2");
    expect(options).toContain("Semestre 3");
  });

  it("includes semester 11 and 12 when availableSemesters contains them", () => {
    renderBar({ availableSemesters: [1, 2, 11, 12] });
    const semSelect = screen.getByLabelText("Semestre");
    const options = [...semSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Semestre 11");
    expect(options).toContain("Semestre 12");
  });

  it("does NOT render semester options not in availableSemesters", () => {
    renderBar({ availableSemesters: [3, 5] });
    const semSelect = screen.getByLabelText("Semestre");
    const options = [...semSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).not.toContain("Semestre 1");
    expect(options).not.toContain("Semestre 2");
    expect(options).not.toContain("Semestre 4");
    expect(options).toContain("Semestre 3");
    expect(options).toContain("Semestre 5");
  });

  it("renders 'Semestre: todos' all-option regardless of availableSemesters", () => {
    renderBar({ availableSemesters: [] });
    const semSelect = screen.getByLabelText("Semestre");
    const options = [...semSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Semestre: todos");
  });
});

// ─── Task 4: Program filter ────────────────────────────────────────────────────

describe("OfferingFilterBar — program filter (Task 4)", () => {
  it("does NOT render program select when programs.length <= 1", () => {
    renderBar({ programs: [] });
    expect(screen.queryByLabelText(/carrera/i)).not.toBeInTheDocument();
  });

  it("does NOT render program select with single program", () => {
    renderBar({ programs: [{ id: "p1", name: "Ingeniería" }] });
    expect(screen.queryByLabelText(/carrera/i)).not.toBeInTheDocument();
  });

  it("renders program select when programs.length > 1", () => {
    renderBar({
      programs: [
        { id: "p1", name: "Ingeniería de Sistemas" },
        { id: "p2", name: "Ingeniería Civil" },
      ],
    });
    expect(screen.getByLabelText(/carrera/i)).toBeInTheDocument();
  });

  it("shows 'Carrera: todas' option when programs.length > 1", () => {
    renderBar({
      programs: [
        { id: "p1", name: "Ingeniería de Sistemas" },
        { id: "p2", name: "Ingeniería Civil" },
      ],
    });
    const programSelect = screen.getByLabelText(/carrera/i);
    const options = [...programSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Carrera: todas");
    expect(options).toContain("Ingeniería de Sistemas");
    expect(options).toContain("Ingeniería Civil");
  });

  it("calls onChange with program value when program selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderBar({
      onChange,
      programs: [
        { id: "p1", name: "Ingeniería de Sistemas" },
        { id: "p2", name: "Ingeniería Civil" },
      ],
    });
    await user.selectOptions(screen.getByLabelText(/carrera/i), "p1");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ program: "p1" }));
  });

  it("calls onChange with null when 'Carrera: todas' selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderBar({
      onChange,
      filter: { ...DEFAULT_FILTER, program: "p1" } as OfferingFilter,
      programs: [
        { id: "p1", name: "Ingeniería de Sistemas" },
        { id: "p2", name: "Ingeniería Civil" },
      ],
    });
    await user.selectOptions(screen.getByLabelText(/carrera/i), "");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ program: null }));
  });
});

// ─── Task 5: Jornada filter ────────────────────────────────────────────────────

describe("OfferingFilterBar — jornada filter (Task 5)", () => {
  it("does NOT render jornada select when journeys.length <= 1", () => {
    renderBar({ journeys: [] });
    expect(screen.queryByLabelText(/jornada/i)).not.toBeInTheDocument();
  });

  it("does NOT render jornada select with single journey", () => {
    renderBar({ journeys: ["DIURNA"] });
    expect(screen.queryByLabelText(/jornada/i)).not.toBeInTheDocument();
  });

  it("renders jornada select when journeys.length > 1", () => {
    renderBar({ journeys: ["DIURNA", "NOCTURNA"] });
    expect(screen.getByLabelText(/jornada/i)).toBeInTheDocument();
  });

  it("shows Diurna and Nocturna labeled options", () => {
    renderBar({ journeys: ["DIURNA", "NOCTURNA"] });
    const jornadaSelect = screen.getByLabelText(/jornada/i);
    const options = [...jornadaSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("Jornada: todas");
    expect(options).toContain("Diurna");
    expect(options).toContain("Nocturna");
  });

  it("falls back to raw code for unlabeled jornada values", () => {
    renderBar({ journeys: ["DIURNA", "SABATINA"] });
    const jornadaSelect = screen.getByLabelText(/jornada/i);
    const options = [...jornadaSelect.querySelectorAll("option")].map((o) => o.textContent);
    expect(options).toContain("SABATINA");
  });

  it("calls onChange with jornada value when selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderBar({
      onChange,
      journeys: ["DIURNA", "NOCTURNA"],
    });
    await user.selectOptions(screen.getByLabelText(/jornada/i), "NOCTURNA");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ jornada: "NOCTURNA" }));
  });
});

// ─── Task 9 (#2): Credits filter controls ─────────────────────────────────────

describe("OfferingFilterBar — credits controls (Task 9)", () => {
  it("renders a label element with text 'Créditos' for the credits group", () => {
    renderBar();
    // The label for the min input serves as the visual group label
    const label = screen.getByText("Créditos");
    expect(label.tagName).toBe("LABEL");
  });

  it("credits min input has aria-label 'Créditos mínimos'", () => {
    renderBar();
    expect(screen.getByLabelText("Créditos mínimos")).toBeInTheDocument();
  });

  it("credits max input has aria-label 'Créditos máximos'", () => {
    renderBar();
    expect(screen.getByLabelText("Créditos máximos")).toBeInTheDocument();
  });

  it("credits min input has placeholder 'mín'", () => {
    renderBar();
    expect(screen.getByPlaceholderText("mín")).toBeInTheDocument();
  });

  it("credits max input has placeholder 'máx'", () => {
    renderBar();
    expect(screen.getByPlaceholderText("máx")).toBeInTheDocument();
  });

  it("credits inputs have inputMode numeric", () => {
    renderBar();
    const minInput = screen.getByLabelText("Créditos mínimos");
    const maxInput = screen.getByLabelText("Créditos máximos");
    expect(minInput).toHaveAttribute("inputMode", "numeric");
    expect(maxInput).toHaveAttribute("inputMode", "numeric");
  });

  it("calls onChange with minCredits when min input changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderBar({ onChange });
    const minInput = screen.getByLabelText("Créditos mínimos");
    await user.type(minInput, "3");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ minCredits: 3 }));
  });

  it("calls onChange with maxCredits when max input changes", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    renderBar({ onChange });
    const maxInput = screen.getByLabelText("Créditos máximos");
    await user.type(maxInput, "6");
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ maxCredits: 6 }));
  });

  it("credits min input has spin-button suppression classes", () => {
    renderBar();
    const minInput = screen.getByLabelText("Créditos mínimos");
    expect(minInput.className).toContain("[appearance:textfield]");
  });
});

// ─── Task 6: Clear filters button ─────────────────────────────────────────────

describe("OfferingFilterBar — clear filters (Task 6)", () => {
  it("does NOT show 'Limpiar filtros' button when filter is at defaults", () => {
    renderBar({ filter: DEFAULT_FILTER });
    expect(screen.queryByRole("button", { name: /limpiar filtros/i })).not.toBeInTheDocument();
  });

  it("shows 'Limpiar filtros' button when search is non-empty", () => {
    renderBar({ filter: { ...DEFAULT_FILTER, search: "calcul" } });
    expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
  });

  it("shows 'Limpiar filtros' button when semester is set", () => {
    renderBar({
      filter: { ...DEFAULT_FILTER, semester: 3 },
      availableSemesters: [1, 2, 3],
    });
    expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
  });

  it("shows 'Limpiar filtros' button when type is set", () => {
    renderBar({ filter: { ...DEFAULT_FILTER, type: "REQUIRED" } });
    expect(screen.getByRole("button", { name: /limpiar filtros/i })).toBeInTheDocument();
  });

  it("clicking 'Limpiar filtros' calls onClear", async () => {
    const onClear = vi.fn();
    const user = userEvent.setup();
    renderBar({ filter: { ...DEFAULT_FILTER, search: "algo" }, onClear });
    await user.click(screen.getByRole("button", { name: /limpiar filtros/i }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
