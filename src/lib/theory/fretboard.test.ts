import { describe, expect, it } from "vitest";
import type { ScaleType } from "../types";
import {
  buildFretboardRows,
  fretboardTuningFor,
  intervalLabelFor,
  noteLabelForPitchClass,
} from "./fretboard";
import { scaleIntervalsFor } from "./scaleBasics";

describe("fretboard theory", () => {
  it("maps C major across standard guitar from open strings through fret 15", () => {
    const rows = buildFretboardRows("guitar", "C", "major");
    expect(rows).toHaveLength(6);
    expect(rows.map((row) => row.string.registerLabel)).toEqual([
      "high E",
      "B",
      "G",
      "D",
      "A",
      "low E",
    ]);

    const lowE = rows[5];
    expect(lowE.positions).toHaveLength(16);
    expect(lowE.positions[0]).toMatchObject({ noteLabel: "E", isScaleTone: true, intervalLabel: "3" });
    expect(lowE.positions[1]).toMatchObject({ noteLabel: "F", isScaleTone: true, intervalLabel: "4" });
    expect(lowE.positions[2]).toMatchObject({ noteLabel: "F#", isScaleTone: false, intervalLabel: null });
    expect(lowE.positions[3]).toMatchObject({ noteLabel: "G", isScaleTone: true, intervalLabel: "5" });
    expect(lowE.positions[8]).toMatchObject({ noteLabel: "C", isRoot: true, intervalLabel: "1" });
  });

  it("maps G mixolydian across four-string bass", () => {
    const rows = buildFretboardRows("bass", "G", "mixolydian");
    expect(rows).toHaveLength(4);
    expect(fretboardTuningFor("bass").map((string) => string.openNote)).toEqual(["G", "D", "A", "E"]);
    expect(rows[3].positions[3]).toMatchObject({ noteLabel: "G", isRoot: true, intervalLabel: "1" });
  });

  it("uses deterministic flat or sharp display labels from the selected root", () => {
    expect(buildFretboardRows("guitar", "Eb", "major")[0].positions[11].noteLabel).toBe("Eb");
    expect(buildFretboardRows("guitar", "D#", "major")[0].positions[11].noteLabel).toBe("D#");
    expect(noteLabelForPitchClass(10, true)).toBe("Bb");
    expect(noteLabelForPitchClass(10, false)).toBe("A#");
  });

  it("keeps fret 12 enharmonically identical to each open string", () => {
    for (const instrument of ["guitar", "bass"] as const) {
      for (const row of buildFretboardRows(instrument, "A", "natural_minor")) {
        expect(row.positions[12].pitchClass).toBe(row.positions[0].pitchClass);
        expect(row.positions[12].noteLabel).toBe(row.positions[0].noteLabel);
      }
    }
  });

  it("supports every shipped scale type with seven ordered degrees", () => {
    const modes: ScaleType[] = [
      "major",
      "natural_minor",
      "harmonic_minor",
      "dorian",
      "mixolydian",
      "lydian",
      "phrygian",
    ];
    for (const mode of modes) {
      const pitchClasses = new Set(
        buildFretboardRows("guitar", "C", mode)[0].positions
          .filter((position) => position.isScaleTone)
          .map((position) => position.pitchClass),
      );
      expect(pitchClasses.size).toBe(7);
    }
  });

  it("returns deeply frozen deterministic rows", () => {
    const first = buildFretboardRows("bass", "F#", "dorian", 12);
    const second = buildFretboardRows("bass", "F#", "dorian", 12);
    expect(first).toEqual(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0].positions)).toBe(true);
    expect(Object.isFrozen(first[0].positions[0])).toBe(true);
  });

  it("keeps the shared ordered scale formula immutable at runtime", () => {
    const intervals = scaleIntervalsFor("major");
    expect(Object.isFrozen(intervals)).toBe(true);
    expect(Reflect.set(intervals, 0, 9)).toBe(false);
    expect(scaleIntervalsFor("major")).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it("rejects invalid roots, fret ranges, pitch classes, and intervals", () => {
    expect(() => buildFretboardRows("guitar", "H", "major")).toThrow(/Unrecognized fretboard root/);
    expect(() => buildFretboardRows("guitar", "C", "major", 25)).toThrow(RangeError);
    expect(() => buildFretboardRows("guitar", "C", "major", -1)).toThrow(RangeError);
    expect(() => noteLabelForPitchClass(12, false)).toThrow(RangeError);
    expect(() => intervalLabelFor(-1)).toThrow(RangeError);
  });
});
