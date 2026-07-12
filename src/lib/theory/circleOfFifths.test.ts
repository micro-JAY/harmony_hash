import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import {
  adjacentCircleKeys,
  builderProgressionFor,
  CIRCLE_KEYS,
  circleKeyAt,
  diatonicChordsFor,
} from "./circleOfFifths";

describe("Circle of Fifths theory", () => {
  it("publishes twelve immutable keys in ascending fifths", () => {
    expect(CIRCLE_KEYS.map((key) => key.id)).toEqual([
      "C", "G", "D", "A", "E", "B", "F# / Gb", "Db", "Ab", "Eb", "Bb", "F",
    ]);
    expect(Object.isFrozen(CIRCLE_KEYS)).toBe(true);
    expect(CIRCLE_KEYS.every(Object.isFrozen)).toBe(true);
  });

  it("wraps adjacent-key navigation in both directions", () => {
    expect(adjacentCircleKeys(0).map((key) => key.id)).toEqual(["F", "G"]);
    expect(circleKeyAt(-1).id).toBe("F");
    expect(circleKeyAt(12).id).toBe("C");
  });

  it("spells diatonic chords with the selected key signature", () => {
    expect(diatonicChordsFor(CIRCLE_KEYS[0])).toEqual(["C", "Dm", "Em", "F", "G", "Am", "Bdim"]);
    expect(diatonicChordsFor(CIRCLE_KEYS[7])).toEqual(["Db", "Ebm", "Fm", "Gb", "Ab", "Bbm", "Cdim"]);
    expect(diatonicChordsFor(CIRCLE_KEYS[6])).toEqual(["F#", "G#m", "A#m", "B", "C#", "D#m", "E#dim"]);
    expect(builderProgressionFor(CIRCLE_KEYS[0])).toEqual(["C", "F", "G"]);
  });

  it("keeps every builder handoff inside the shared chord dictionary", () => {
    for (const key of CIRCLE_KEYS) {
      expect(builderProgressionFor(key).map(lookupChord), key.id).not.toContain(null);
    }
  });
});
