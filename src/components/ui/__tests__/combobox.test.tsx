/**
 * Combobox — accessible single-select searchable combobox (WCAG 1.4.3 / ARIA 1.2 pattern 3.1)
 *
 * Tests written FIRST (TDD) for Change 2.
 * These tests initially fail because the Combobox component does not exist yet.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "@/components/ui/combobox";

const OPTIONS = [
  { value: "v1", label: "Álgebra" },
  { value: "v2", label: "Cálculo" },
  { value: "v3", label: "Física" },
];

describe("Combobox", () => {
  it("renders with placeholder text when no value selected", () => {
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onChange={() => {}}
        placeholder="Seleccioná una opción…"
      />
    );
    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("placeholder", "Seleccioná una opción…");
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("opens dropdown on focus and shows all options", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={() => {}} />);

    const input = screen.getByRole("combobox");
    await user.click(input);

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    expect(screen.getByRole("option", { name: "Álgebra" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Cálculo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Física" })).toBeInTheDocument();
  });

  it("filters options by typed text (case-insensitive substring)", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={() => {}} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "cal");

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Cálculo" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("option", { name: "Álgebra" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Física" })).not.toBeInTheDocument();
  });

  it("clicking an option sets the value and closes dropdown", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.click(input);

    const opt = await screen.findByRole("option", { name: "Cálculo" });
    await user.click(opt);

    expect(onChange).toHaveBeenCalledWith("v2");
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
  });

  it("ArrowDown + Enter selects via keyboard", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenCalled();
  });

  it("Escape closes dropdown without changing selection", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="v1" onChange={onChange} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await screen.findByRole("listbox");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("empty filter shows 'Sin resultados'", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={() => {}} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await user.type(input, "zzzzz");

    await waitFor(() => {
      expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    });
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("disabled state: input is disabled, dropdown does not open", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={() => {}} disabled />);

    const input = screen.getByRole("combobox");
    expect(input).toBeDisabled();

    await user.click(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("role=combobox present, aria-expanded toggles", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={() => {}} />);

    const input = screen.getByRole("combobox");
    expect(input).toHaveAttribute("aria-expanded", "false");

    await user.click(input);
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it("options have role=option, aria-selected on selected option", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="v2" onChange={() => {}} />);

    const input = screen.getByRole("combobox");
    await user.click(input);

    await screen.findByRole("listbox");
    const selected = screen.getByRole("option", { name: "Cálculo" });
    expect(selected).toHaveAttribute("aria-selected", "true");

    const unselected = screen.getByRole("option", { name: "Álgebra" });
    expect(unselected).toHaveAttribute("aria-selected", "false");
  });

  it("aria-activedescendant points to highlighted option during keyboard nav", async () => {
    const user = userEvent.setup();
    render(<Combobox options={OPTIONS} value="" onChange={() => {}} />);

    const input = screen.getByRole("combobox");
    await user.click(input);
    await screen.findByRole("listbox");

    await user.keyboard("{ArrowDown}");

    await waitFor(() => {
      const activeId = input.getAttribute("aria-activedescendant");
      expect(activeId).toBeTruthy();
      const activeEl = document.getElementById(activeId!);
      expect(activeEl).toBeTruthy();
      expect(activeEl?.getAttribute("role")).toBe("option");
    });
  });
});
