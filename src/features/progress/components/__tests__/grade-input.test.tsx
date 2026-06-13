/**
 * GradeInput tests — focus on the decimal-separator regression:
 * the user must be able to type "4." and keep the dot while building "4.5".
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { GradeInput, sanitizeGradeText } from "../grade-input";

// A tiny controlled harness mirroring how react-hook-form drives the field.
function Harness({ onValue }: { onValue?: (v: number | null) => void }) {
  const [value, setValue] = useState<number | null>(null);
  return (
    <GradeInput
      id="grade"
      value={value}
      onChange={(v) => {
        setValue(v);
        onValue?.(v);
      }}
    />
  );
}

describe("GradeInput", () => {
  it("preserves the decimal separator while typing '4.'", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Nota") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "4" } });
    expect(input.value).toBe("4");

    // Typing the dot must NOT collapse back to "4"
    fireEvent.change(input, { target: { value: "4." } });
    expect(input.value).toBe("4.");

    fireEvent.change(input, { target: { value: "4.5" } });
    expect(input.value).toBe("4.5");
  });

  it("reports the parsed number to onChange", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByLabelText("Nota");

    fireEvent.change(input, { target: { value: "4.5" } });
    expect(onValue).toHaveBeenLastCalledWith(4.5);
  });

  it("strips letters — garbage never appears", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Nota") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "DASDASD" } });
    expect(input.value).toBe("");
  });

  it("rejects values above 5 (keystroke ignored)", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Nota") as HTMLInputElement;

    fireEvent.change(input, { target: { value: "5" } });
    expect(input.value).toBe("5");
    // "5.5" exceeds the max → ignored, stays "5"
    fireEvent.change(input, { target: { value: "5.5" } });
    expect(input.value).toBe("5");

    fireEvent.change(input, { target: { value: "7" } });
    expect(input.value).toBe("5");
  });

  it("reports null when cleared", () => {
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    const input = screen.getByLabelText("Nota");
    fireEvent.change(input, { target: { value: "4" } });
    fireEvent.change(input, { target: { value: "" } });
    expect(onValue).toHaveBeenLastCalledWith(null);
  });

  it("caps decimals at 2 places", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Nota") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "4.567" } });
    expect(input.value).toBe("4.56");
  });
});

describe("sanitizeGradeText", () => {
  it("keeps a single decimal point", () => {
    expect(sanitizeGradeText("4.5.6")).toBe("4.56");
  });
  it("preserves a trailing dot", () => {
    expect(sanitizeGradeText("4.")).toBe("4.");
  });
  it("removes non-numeric characters", () => {
    expect(sanitizeGradeText("a4b.c5")).toBe("4.5");
  });
});
