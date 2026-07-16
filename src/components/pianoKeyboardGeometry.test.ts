import { describe, expect, it } from "vitest";
import {
  getBlackKeyGeometry,
  getKeyboardMaxWidth,
  getWhiteKeyGeometry,
  PIANO_WHITE_KEY_COUNT,
} from "./pianoKeyboardGeometry";

describe("piano keyboard percentage geometry", () => {
  it("fits every white key exactly inside the three-octave surface", () => {
    const first = getWhiteKeyGeometry(0);
    const last = getWhiteKeyGeometry(PIANO_WHITE_KEY_COUNT - 1);

    expect(first.leftPercent).toBe(0);
    expect(last.leftPercent + last.widthPercent).toBeCloseTo(100, 10);
  });

  it("keeps black keys inside the same proportional surface at either size", () => {
    for (const size of ["standard", "compact"] as const) {
      const first = getBlackKeyGeometry("Cs", 3, size);
      const last = getBlackKeyGeometry("As", 5, size);

      expect(first.leftPercent).toBeGreaterThan(0);
      expect(last.leftPercent + last.widthPercent).toBeLessThan(100);
    }
  });

  it("retains the established visual widths while allowing responsive shrinkage", () => {
    expect(getKeyboardMaxWidth("standard")).toBe(630);
    expect(getKeyboardMaxWidth("compact")).toBe(252);
  });

  it("fails explicitly for positions outside the rendered keyboard", () => {
    expect(() => getWhiteKeyGeometry(-1)).toThrow(RangeError);
    expect(() => getWhiteKeyGeometry(PIANO_WHITE_KEY_COUNT)).toThrow(RangeError);
    expect(() => getBlackKeyGeometry("Cs", 6, "standard")).toThrow(RangeError);
    expect(() => getBlackKeyGeometry("C", 3, "standard")).toThrow(RangeError);
  });
});
