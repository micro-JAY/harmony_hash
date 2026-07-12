import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import type { ScaleType } from "../types";
import { deriveChordTones } from "./chordTones";
import { buildFretboardRows } from "./fretboard";
import {
  buildFretboardPattern,
  CAGED_FORM_OPTIONS,
  decorateFretboardPositions,
  PATTERN_COMPATIBILITY_REASON,
  THREE_NPS_OPTIONS,
} from "./fretboardPatterns";

const ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
const MODES: ScaleType[] = [
  "major", "natural_minor", "harmonic_minor", "dorian", "mixolydian", "lydian", "phrygian",
];

function chord(name: string) {
  const resolved = lookupChord(name);
  if (!resolved) throw new Error(`Missing test chord ${name}`);
  return resolved;
}

describe("fretboard patterns", () => {
  it("keeps All behavior-identical and deeply frozen", () => {
    const rows = buildFretboardRows("bass", "Eb", "dorian", 15, "bass-bead");
    const result = buildFretboardPattern(rows, "bass", "bass-bead", "Eb", "dorian", {
      family: "all", cagedForm: "e", threeNpsStartDegree: 4,
    });
    const expected = rows.flatMap((row) => row.positions
      .filter((position) => position.isScaleTone)
      .map((position) => `${position.stringNumber}:${position.fret}`));
    expect(result.positionKeys).toEqual(expected);
    expect(result).toMatchObject({ available: true, effectiveFamily: "all", label: "All positions" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.positionKeys)).toBe(true);
    expect(Object.isFrozen(result.envelopes[0])).toBe(true);
  });

  it("publishes five frozen CAGED forms and anchors G Major E form", () => {
    expect(CAGED_FORM_OPTIONS.map((option) => option.id)).toEqual(["c", "a", "g", "e", "d"]);
    expect(Object.isFrozen(CAGED_FORM_OPTIONS)).toBe(true);
    const rows = buildFretboardRows("guitar", "G", "major");
    const result = buildFretboardPattern(rows, "guitar", "guitar-standard", "G", "major", {
      family: "caged", cagedForm: "e", threeNpsStartDegree: 1,
    });
    expect(result.rootAnchorKeys).toEqual(expect.arrayContaining(["6:3", "4:5", "1:3"]));
    expect(result.positionKeys.every((key) => {
      const [stringNumber, fret] = key.split(":").map(Number);
      const envelope = result.envelopes.find((item) => item.stringNumber === stringNumber);
      return envelope !== undefined && fret >= envelope.minFret && fret <= envelope.maxFret;
    })).toBe(true);
  });

  it.each([
    ["c", ["5:3", "2:1"]],
    ["a", ["5:3", "3:5"]],
    ["g", ["6:8", "3:5", "1:8"]],
    ["e", ["6:8", "4:10", "1:8"]],
    ["d", ["4:10", "2:13"]],
  ] as const)("locks the C Major %s-form tonic framework", (form, expectedAnchors) => {
    const rows = buildFretboardRows("guitar", "C", "major");
    const result = buildFretboardPattern(rows, "guitar", "guitar-standard", "C", "major", {
      family: "caged", cagedForm: form, threeNpsStartDegree: 1,
    });
    expect(result.rootAnchorKeys).toEqual(expectedAnchors);
    expect(result.positionKeys.every((key) => {
      const [stringNumber, fret] = key.split(":").map(Number);
      const envelope = result.envelopes.find((item) => item.stringNumber === stringNumber);
      return envelope !== undefined && fret >= envelope.minFret && fret <= envelope.maxFret;
    })).toBe(true);
  });

  it("generates the exact C Major degree-one 3NPS shape", () => {
    const rows = buildFretboardRows("guitar", "C", "major");
    const result = buildFretboardPattern(rows, "guitar", "guitar-standard", "C", "major", {
      family: "three-nps", cagedForm: "e", threeNpsStartDegree: 1,
    });
    expect(result.positionKeys).toEqual([
      "6:8", "6:10", "6:12", "5:8", "5:10", "5:12", "4:9", "4:10", "4:12",
      "3:9", "3:10", "3:12", "2:10", "2:12", "2:13", "1:10", "1:12", "1:13",
    ]);
  });

  it("generates complete ascending 3NPS shapes or an explicit bounded-neck result exhaustively", () => {
    expect(THREE_NPS_OPTIONS).toHaveLength(7);
    for (const root of ROOTS) {
      for (const mode of MODES) {
        const rows = buildFretboardRows("guitar", root, mode);
        const rowByString = new Map(rows.map((row) => [row.string.number, row]));
        for (const option of THREE_NPS_OPTIONS) {
          const result = buildFretboardPattern(rows, "guitar", "guitar-standard", root, mode, {
            family: "three-nps", cagedForm: "e", threeNpsStartDegree: option.id,
          });
          if (!result.available) {
            expect(result).toMatchObject({
              effectiveFamily: "all",
              reason: "This 3NPS position does not fit frets 0–15",
            });
            continue;
          }
          expect(result.positionKeys).toHaveLength(18);
          const absolutePitches = result.positionKeys.map((key) => {
            const [stringNumber, fret] = key.split(":").map(Number);
            const row = rowByString.get(stringNumber);
            if (!row) throw new Error(`Missing string ${stringNumber}`);
            return row.string.absoluteOpenPitch + fret;
          });
          expect(absolutePitches.every((pitch, index) => index === 0 || pitch > absolutePitches[index - 1])).toBe(true);
          for (const stringNumber of [6, 5, 4, 3, 2, 1]) {
            expect(result.positionKeys.filter((key) => key.startsWith(`${stringNumber}:`))).toHaveLength(3);
          }
        }
      }
    }
  });

  it("falls back to All without forgetting why a focused pattern is incompatible", () => {
    const rows = buildFretboardRows("guitar", "C", "major", 15, "guitar-dadgad");
    const result = buildFretboardPattern(rows, "guitar", "guitar-dadgad", "C", "major", {
      family: "caged", cagedForm: "e", threeNpsStartDegree: 1,
    });
    expect(result).toMatchObject({
      requestedFamily: "caged",
      effectiveFamily: "all",
      available: false,
      reason: PATTERN_COMPATIBILITY_REASON,
    });
    expect(result.positionKeys).toEqual(rows.flatMap((row) => row.positions
      .filter((position) => position.isScaleTone)
      .map((position) => `${position.stringNumber}:${position.fret}`)));
  });

  it("decorates all chord tones under All and limits chromatic tones to focused envelopes", () => {
    const rows = buildFretboardRows("guitar", "C", "major");
    const tones = deriveChordTones(chord("G7#9"));
    expect(tones.map((tone) => [tone.pitchClass, tone.degree])).toEqual([
      [7, "1"], [11, "3"], [2, "5"], [5, "b7"], [10, "#9"],
    ]);
    const all = buildFretboardPattern(rows, "guitar", "guitar-standard", "C", "major", {
      family: "all", cagedForm: "e", threeNpsStartDegree: 1,
    });
    const allDecorated = decorateFretboardPositions(rows, all, tones);
    const expectedAllChordPositions = rows.flatMap((row) => row.positions)
      .filter((position) => tones.some((tone) => tone.pitchClass === position.pitchClass));
    expect(allDecorated.filter((item) => item.isChordTone)).toHaveLength(expectedAllChordPositions.length);
    expect(allDecorated.filter((item) => item.position.pitchClass === 10)).not.toHaveLength(0);
    expect(allDecorated.filter((item) => item.isChordTone && item.isInScale)
      .every((item) => [7, 11, 2, 5].includes(item.position.pitchClass))).toBe(true);

    const focused = buildFretboardPattern(rows, "guitar", "guitar-standard", "C", "major", {
      family: "caged", cagedForm: "e", threeNpsStartDegree: 1,
    });
    const focusedDecorated = decorateFretboardPositions(rows, focused, tones);
    const focusedKeys = new Set(focused.positionKeys);
    expect(focusedDecorated
      .filter((item) => item.isChordTone && item.isInScale)
      .every((item) => focusedKeys.has(item.key))).toBe(true);
    for (const item of focusedDecorated.filter((position) => !position.isInScale)) {
      const envelope = focused.envelopes.find((entry) => entry.stringNumber === item.position.stringNumber);
      expect(envelope).toBeDefined();
      expect(item.position.fret).toBeGreaterThanOrEqual(envelope?.minFret ?? -1);
      expect(item.position.fret).toBeLessThanOrEqual(envelope?.maxFret ?? 99);
    }
  });

  it("classifies every Cmaj7 tone as in-scale over C Major", () => {
    const rows = buildFretboardRows("guitar", "C", "major");
    const pattern = buildFretboardPattern(rows, "guitar", "guitar-standard", "C", "major", {
      family: "all", cagedForm: "e", threeNpsStartDegree: 1,
    });
    const tones = deriveChordTones(chord("Cmaj7"));
    expect(tones.map((tone) => tone.degree)).toEqual(["1", "3", "5", "7"]);
    const decorated = decorateFretboardPositions(rows, pattern, tones);
    expect(decorated.filter((item) => item.isChordTone).every((item) => item.isInScale)).toBe(true);
  });
});
