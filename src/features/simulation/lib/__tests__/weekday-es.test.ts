/**
 * weekday-es.test.ts — Unit tests for weekdayEs utility.
 *
 * Pure function tests: no React, no DOM.
 */

import { describe, it, expect } from "vitest";
import { weekdayEs } from "../weekday-es";

describe("weekdayEs", () => {
  it("maps MONDAY to LUN", () => {
    expect(weekdayEs("MONDAY")).toBe("LUN");
  });

  it("maps TUESDAY to MAR", () => {
    expect(weekdayEs("TUESDAY")).toBe("MAR");
  });

  it("maps WEDNESDAY to MIÉ", () => {
    expect(weekdayEs("WEDNESDAY")).toBe("MIÉ");
  });

  it("maps THURSDAY to JUE", () => {
    expect(weekdayEs("THURSDAY")).toBe("JUE");
  });

  it("maps FRIDAY to VIE", () => {
    expect(weekdayEs("FRIDAY")).toBe("VIE");
  });

  it("maps SATURDAY to SÁB", () => {
    expect(weekdayEs("SATURDAY")).toBe("SÁB");
  });

  it("maps SUNDAY to DOM", () => {
    expect(weekdayEs("SUNDAY")).toBe("DOM");
  });

  it("returns empty string for unknown value", () => {
    expect(weekdayEs("XYZDAY")).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(weekdayEs("")).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(weekdayEs(undefined)).toBe("");
  });

  it("returns empty string for null", () => {
    expect(weekdayEs(null)).toBe("");
  });
});
