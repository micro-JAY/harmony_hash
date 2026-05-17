import { describe, it, expect } from "vitest";
import { pitchClassOf, scalePitchClasses, isRootDiatonic, scaleDegreeOf } from "./index";

describe("pitchClassOf", () => {
  it("maps canonical naturals", () => {
    expect(pitchClassOf("C")).toBe(0);
    expect(pitchClassOf("D")).toBe(2);
    expect(pitchClassOf("E")).toBe(4);
    expect(pitchClassOf("F")).toBe(5);
    expect(pitchClassOf("G")).toBe(7);
    expect(pitchClassOf("A")).toBe(9);
    expect(pitchClassOf("B")).toBe(11);
  });

  it("maps user-facing sharps", () => {
    expect(pitchClassOf("C#")).toBe(1);
    expect(pitchClassOf("F#")).toBe(6);
  });

  it("maps user-facing flats", () => {
    expect(pitchClassOf("Bb")).toBe(10);
    expect(pitchClassOf("Eb")).toBe(3);
  });

  it("returns -1 for unknown roots", () => {
    expect(pitchClassOf("X")).toBe(-1);
    expect(pitchClassOf("")).toBe(-1);
  });
});

describe("scalePitchClasses", () => {
  it("returns C major scale pitches", () => {
    expect(scalePitchClasses("C", "major")).toEqual(new Set([0, 2, 4, 5, 7, 9, 11]));
  });

  it("returns A natural minor scale pitches", () => {
    expect(scalePitchClasses("A", "natural_minor")).toEqual(new Set([9, 11, 0, 2, 4, 5, 7]));
  });

  it("returns D dorian scale pitches", () => {
    expect(scalePitchClasses("D", "dorian")).toEqual(new Set([2, 4, 5, 7, 9, 11, 0]));
  });

  it("returns empty set for unknown key", () => {
    expect(scalePitchClasses("X", "major")).toEqual(new Set());
  });
});

describe("isRootDiatonic", () => {
  it("C, F, G are diatonic to C major; C#, F#, Bb are not", () => {
    expect(isRootDiatonic("C", "C", "major")).toBe(true);
    expect(isRootDiatonic("F", "C", "major")).toBe(true);
    expect(isRootDiatonic("G", "C", "major")).toBe(true);
    expect(isRootDiatonic("A", "C", "major")).toBe(true);
    expect(isRootDiatonic("C#", "C", "major")).toBe(false);
    expect(isRootDiatonic("F#", "C", "major")).toBe(false);
    expect(isRootDiatonic("Bb", "C", "major")).toBe(false);
  });

  it("handles transposition to D major", () => {
    // D major: D, E, F#, G, A, B, C#
    expect(isRootDiatonic("D", "D", "major")).toBe(true);
    expect(isRootDiatonic("F#", "D", "major")).toBe(true);
    expect(isRootDiatonic("C#", "D", "major")).toBe(true);
    expect(isRootDiatonic("F", "D", "major")).toBe(false);
    expect(isRootDiatonic("C", "D", "major")).toBe(false);
  });

  it("handles harmonic minor scale", () => {
    // A harmonic minor: A, B, C, D, E, F, G#
    expect(isRootDiatonic("A", "A", "harmonic_minor")).toBe(true);
    expect(isRootDiatonic("G#", "A", "harmonic_minor")).toBe(true);
    expect(isRootDiatonic("G", "A", "harmonic_minor")).toBe(false);
  });
});

describe("scaleDegreeOf", () => {
  it("returns 1-indexed degrees for C major chords", () => {
    expect(scaleDegreeOf("C", "C", "major")).toBe(1);
    expect(scaleDegreeOf("D", "C", "major")).toBe(2);
    expect(scaleDegreeOf("E", "C", "major")).toBe(3);
    expect(scaleDegreeOf("F", "C", "major")).toBe(4);
    expect(scaleDegreeOf("G", "C", "major")).toBe(5);
    expect(scaleDegreeOf("A", "C", "major")).toBe(6);
    expect(scaleDegreeOf("B", "C", "major")).toBe(7);
  });

  it("returns null for non-diatonic roots", () => {
    expect(scaleDegreeOf("C#", "C", "major")).toBeNull();
    expect(scaleDegreeOf("Bb", "C", "major")).toBeNull();
  });

  it("works in D major", () => {
    expect(scaleDegreeOf("D", "D", "major")).toBe(1);
    expect(scaleDegreeOf("G", "D", "major")).toBe(4);
    expect(scaleDegreeOf("A", "D", "major")).toBe(5);
    expect(scaleDegreeOf("F#", "D", "major")).toBe(3);
  });

  it("works in A harmonic minor", () => {
    expect(scaleDegreeOf("A", "A", "harmonic_minor")).toBe(1);
    expect(scaleDegreeOf("G#", "A", "harmonic_minor")).toBe(7);
  });
});
