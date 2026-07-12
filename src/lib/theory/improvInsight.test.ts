import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import type { IndexedChord } from "../types";
import {
  progressionToneSet,
  rankCompatibleScales,
  scaleMotion,
  scalePalette,
  scaleStyle,
  scaleTension,
  scoreScale,
} from "./improvInsight";

function chords(...names: string[]): IndexedChord[] {
  return names.map((name) => {
    const chord = lookupChord(name);
    if (!chord) throw new Error(`Missing test chord ${name}`);
    return chord;
  });
}

describe("Improv Insight theory", () => {
  it("scores the union of unique progression pitch classes", () => {
    const progression = chords("Cmaj7", "Am7", "Dm7", "G7");
    const tones = progressionToneSet(progression);
    const score = scoreScale("major", "C", tones);
    const results = rankCompatibleScales(progression);

    expect(tones).toEqual(new Set([0, 2, 4, 5, 7, 9, 11]));
    expect(score).toEqual({ overlap: 7, missing: 0, accidentals: 0, match: 100 });
    expect(results[0]).toMatchObject({
      label: "C Major",
      match: 100,
      matchedTones: 7,
      totalTones: 7,
      missingScaleTones: 0,
      accidentalTones: 0,
      metadata: { motion: "smooth", palette: "diatonic", style: "tonal", tension: "static" },
    });
  });

  it("uses the first chord root only as a deterministic tie-break", () => {
    const results = rankCompatibleScales(chords("Am7", "Fmaj7", "Cmaj7", "Em7"));

    expect(results[0]).toMatchObject({ label: "A Natural Minor", match: 100 });
    expect(results.find((result) => result.label === "C Major")?.match).toBe(100);
  });

  it("reports outside tones without changing scale-family metadata", () => {
    const results = rankCompatibleScales(chords("Cmaj7", "Dm7", "G7#9"), 132);
    const cMajor = results.find((result) => result.label === "C Major");

    expect(cMajor).toMatchObject({
      matchedTones: 7,
      totalTones: 8,
      missingScaleTones: 0,
      accidentalTones: 1,
      match: 88,
      metadata: { palette: "diatonic", tension: "static" },
    });
  });

  it("derives motion, tension, palette, and style from scale formulas", () => {
    expect(scaleMotion("major")).toBe("smooth");
    expect(scaleMotion("harmonic_minor")).toBe("jumpy");
    expect(scaleTension("major_pentatonic")).toBe("falls");
    expect(scaleTension("major")).toBe("static");
    expect(scaleTension("harmonic_minor")).toBe("rises");
    expect(scalePalette("dorian")).toBe("diatonic");
    expect(scalePalette("minor_blues")).toBe("chromatic");
    expect(scaleStyle("major")).toBe("tonal");
    expect(scaleStyle("mixolydian")).toBe("modal");
    expect(scaleStyle("minor_pentatonic")).toBe("blues");
  });

  it("includes pentatonic and blues candidates", () => {
    const results = rankCompatibleScales(chords("C7"), 132);

    expect(results.some((result) => result.label === "C Major Pentatonic")).toBe(true);
    expect(results.some((result) => result.label === "C Minor Pentatonic")).toBe(true);
    expect(results.some((result) => result.label === "C Major Blues")).toBe(true);
    expect(results.some((result) => result.label === "C Minor Blues")).toBe(true);
  });

  it("publishes enharmonic aliases and parent-key note spelling", () => {
    const accidentalResults = rankCompatibleScales(chords("C#maj7"), 132);
    expect(accidentalResults.find((result) => result.label === "C# Major")?.alsoKnownAs)
      .toBe("Db Major");

    const naturalResults = rankCompatibleScales(chords("Cm7"), 132);
    expect(naturalResults.find((result) => result.label === "C Harmonic Minor")?.notes)
      .toEqual(["C", "D", "Eb", "F", "G", "Ab", "B"]);
    expect(naturalResults.find((result) => result.label === "C Phrygian")?.notes)
      .toEqual(["C", "Db", "Eb", "F", "G", "Ab", "Bb"]);

    const fResults = rankCompatibleScales(chords("Fm7"), 132);
    expect(fResults.find((result) => result.label === "F Phrygian")?.notes)
      .toEqual(["F", "Gb", "Ab", "Bb", "C", "Db", "Eb"]);
    expect(accidentalResults.find((result) => result.label === "F# Phrygian")?.notes)
      .toEqual(["F#", "G", "A", "B", "C#", "D", "E"]);

    const bResults = rankCompatibleScales(chords("Bmaj7"), 132);
    expect(bResults.find((result) => result.label === "B Major")?.notes)
      .toEqual(["B", "C#", "D#", "E", "F#", "G#", "A#"]);
    expect(bResults.find((result) => result.label === "B Lydian")?.notes)
      .toEqual(["B", "C#", "D#", "E#", "F#", "G#", "A#"]);
    expect(naturalResults.find((result) => result.label === "C Major Blues")?.notes)
      .toEqual(["C", "D", "Eb", "E", "G", "A"]);
    expect(naturalResults.find((result) => result.label === "C Minor Blues")?.notes)
      .toEqual(["C", "Eb", "F", "Gb", "G", "Bb"]);
  });

  it("returns immutable deterministic rankings and validates limits", () => {
    const progression = chords("Dm7", "G7", "Cmaj7");
    const first = rankCompatibleScales(progression, 6);
    const second = rankCompatibleScales(progression, 6);

    expect(second).toEqual(first);
    expect(first).toHaveLength(6);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0].notes)).toBe(true);
    expect(Object.isFrozen(first[0].metadata)).toBe(true);
    expect(rankCompatibleScales([])).toEqual([]);
    expect(() => rankCompatibleScales(progression, 0)).toThrow(RangeError);
    expect(() => rankCompatibleScales(progression, 133)).toThrow(RangeError);
  });
});
