/**
 * GradeInput — controlled decimal input for an academic grade (0.0–5.0).
 *
 * Why this exists: a naive controlled input that derives its display text from
 * String(numericValue) cannot preserve an in-progress decimal separator. Typing
 * "4." collapses to the number 4, and String(4) === "4" — the dot vanishes and the
 * user can never type the decimal part. This component keeps its OWN text state so
 * intermediate values like "4." or "4.0" are preserved while the numeric value is
 * reported separately to the form.
 *
 * Rules enforced at keystroke (frontend):
 * - Only digits and a single decimal separator are accepted.
 * - At most 2 decimal places.
 * - Values greater than 5 are rejected (the keystroke is ignored).
 * React Compiler is ON: no useMemo/useCallback.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { sanitizeGradeText } from "./grade-input.utils";

interface GradeInputProps {
  id?: string;
  /** Numeric form value (null when empty). */
  value: number | null;
  /** Reports the parsed numeric value (null when empty/incomplete). */
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  hasError?: boolean;
}

const MAX_GRADE = 5;

function initialText(value: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function GradeInput({ id, value, onChange, onBlur, hasError }: GradeInputProps) {
  // The input's display text is the source of truth while focused/typing,
  // so an in-progress "4." survives across renders.
  const [text, setText] = useState<string>(() => initialText(value));

  // Sync display when the form value is reset/cleared externally, using React's
  // "adjust state during render" pattern (https://react.dev/reference/react/useState#storing-information-from-previous-renders).
  // This avoids a setState-in-effect cascade. The component is the source of truth
  // WHILE typing, so we only re-sync the display on an external clear (value → null).
  const [lastValue, setLastValue] = useState<number | null>(value);
  if (value !== lastValue) {
    setLastValue(value);
    if (value === null || value === undefined) setText("");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = sanitizeGradeText(e.target.value);

    // Reject values above the maximum: ignore the keystroke, keep prior text.
    if (next !== "" && next !== ".") {
      const num = Number.parseFloat(next);
      if (!Number.isNaN(num) && num > MAX_GRADE) return;
    }

    setText(next);

    if (next === "" || next === ".") {
      onChange(null);
      return;
    }
    const num = Number.parseFloat(next);
    onChange(Number.isNaN(num) ? null : num);
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label="Nota definitiva (0.0–5.0)"
      value={text}
      onChange={handleChange}
      onBlur={onBlur}
      className={cn(
        "border rounded px-2 py-1.5 text-sm bg-background text-foreground w-24",
        "focus:outline-none focus:ring-1 focus:ring-primary",
        hasError && "border-destructive"
      )}
    />
  );
}

export { GradeInput };
export type { GradeInputProps };
