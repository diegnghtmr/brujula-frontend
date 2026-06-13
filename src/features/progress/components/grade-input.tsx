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

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

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
const MAX_DECIMALS = 2;

/** Keep digits + a single decimal point, capped at MAX_DECIMALS decimals.
 * Also strips leading zeros in the integer part when followed by another digit
 * (e.g. "05" → "5"), but preserves "0" and "0.x". */
function sanitizeGradeText(raw: string): string {
  const onlyValid = raw.replace(/[^0-9.]/g, "");
  const firstDot = onlyValid.indexOf(".");
  if (firstDot === -1) {
    // No decimal: strip leading zero before another digit (e.g. "05" → "5")
    return onlyValid.replace(/^0(\d)/, "$1");
  }
  const intPartRaw = onlyValid.slice(0, firstDot).replace(/^0(\d)/, "$1");
  const decPart = onlyValid.slice(firstDot + 1).replace(/\./g, "").slice(0, MAX_DECIMALS);
  return `${intPartRaw}.${decPart}`;
}

function initialText(value: number | null): string {
  return value === null || value === undefined ? "" : String(value);
}

function GradeInput({ id, value, onChange, onBlur, hasError }: GradeInputProps) {
  // The input's display text is the source of truth while focused/typing,
  // so an in-progress "4." survives across renders.
  const [text, setText] = useState<string>(() => initialText(value));

  // Sync display when the form value is reset/cleared externally.
  // The component is the source of truth WHILE typing, so only re-sync on an external null (clear/reset).
  useEffect(() => {
    if (value === null || value === undefined) setText("");
  }, [value]);

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

export { GradeInput, sanitizeGradeText };
export type { GradeInputProps };
