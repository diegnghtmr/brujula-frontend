/**
 * Grade text sanitization for GradeInput (0.0–5.0).
 *
 * Extracted from grade-input.tsx so the component file exports ONLY a component
 * (react-refresh/only-export-components) while this pure logic stays unit-testable.
 */

const MAX_DECIMALS = 2;

/**
 * Keep digits + a single decimal point, capped at MAX_DECIMALS decimals.
 * Also strips a leading zero in the integer part when followed by another digit
 * (e.g. "05" → "5"), but preserves "0" and "0.x".
 */
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

export { sanitizeGradeText };
