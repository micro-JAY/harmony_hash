import { describe, expect, it } from "vitest";
import {
  CHORD_INTERVAL_PRESENTATIONS,
  chordIntervalPresentation,
} from "./chordIntervals";

describe("chord interval presentations", () => {
  it("names all twelve chromatic chord roles", () => {
    expect(CHORD_INTERVAL_PRESENTATIONS).toHaveLength(12);
    expect(chordIntervalPresentation(0)).toEqual({ interval: 0, degree: "1", name: "Root" });
    expect(chordIntervalPresentation(3)).toEqual({ interval: 3, degree: "b3", name: "Minor third" });
    expect(chordIntervalPresentation(4)).toEqual({ interval: 4, degree: "3", name: "Major third" });
    expect(chordIntervalPresentation(11)).toEqual({ interval: 11, degree: "7", name: "Major seventh" });
  });

  it("rejects out-of-range and fractional intervals", () => {
    expect(chordIntervalPresentation(-1)).toBeNull();
    expect(chordIntervalPresentation(12)).toBeNull();
    expect(chordIntervalPresentation(3.5)).toBeNull();
  });
});
