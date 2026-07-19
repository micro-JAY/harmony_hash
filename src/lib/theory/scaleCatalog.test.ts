import { describe, expect, it } from "vitest";
import {
  ARPEGGIO_PATTERNS,
  buildScalePlaybackSchedule,
  buildScalePracticeSequence,
  parseScaleLearningDefinitions,
  PRACTICE_NOTE_LENGTHS,
  practiceNoteDurationSeconds,
  SCALE_PRACTICE_BEATS_PER_BAR,
  SCALE_PRACTICE_BPM,
  SCALE_FAMILIES,
  SCALE_LEARNING,
  scaleDegreeName,
  scaleLearningForFamily,
  scaleStepLabels,
} from "./scaleCatalog";

describe("Scale Synthesia catalog", () => {
  it("loads every required immutable family and formula", () => {
    expect(SCALE_FAMILIES.map((family) => family.id)).toEqual([
      "major_modes", "harmonic_minor_modes", "melodic_minor_modes",
      "pentatonic", "blues", "exotic",
    ]);
    expect(SCALE_LEARNING).toHaveLength(28);
    expect(scaleLearningForFamily("major_modes")).toHaveLength(7);
    expect(scaleLearningForFamily("harmonic_minor_modes")).toHaveLength(7);
    expect(scaleLearningForFamily("melodic_minor_modes")).toHaveLength(7);
    expect(SCALE_LEARNING.some((scale) => scale.id === "hungarian_minor")).toBe(true);
    expect(SCALE_LEARNING.some((scale) => scale.id === "phrygian_dominant")).toBe(true);
    expect(SCALE_LEARNING.every(Object.isFrozen)).toBe(true);
    expect(Object.isFrozen(SCALE_LEARNING)).toBe(true);
    expect(SCALE_FAMILIES.every(Object.isFrozen)).toBe(true);
  });

  it("rejects missing or duplicate learning records", () => {
    expect(() => parseScaleLearningDefinitions(SCALE_LEARNING.slice(1))).toThrow(/exactly once/);
    expect(() => parseScaleLearningDefinitions([...SCALE_LEARNING, SCALE_LEARNING[0]])).toThrow(
      /exactly once/,
    );
  });

  it("spells F-sharp harmonic minor and its interval formula", () => {
    const sequence = buildScalePracticeSequence(
      "F#", "harmonic_minor", "scale", "triad", "ascending",
    );
    expect(sequence.map((note) => note.label)).toEqual(["F#", "G#", "A", "B", "C#", "D", "E#", "F#"]);
    expect(sequence.map((note) => note.midi)).toEqual([54, 56, 57, 59, 61, 62, 65, 66]);
    expect(scaleStepLabels("harmonic_minor")).toEqual(["W", "H", "W", "W", "H", "1½", "H"]);
    expect(scaleDegreeName(11, "harmonic_minor")).toBe("Raised seventh");
  });

  it("builds bounded ascending and descending arpeggio practice", () => {
    const ascending = buildScalePracticeSequence("C", "major", "arpeggio", "seventh", "ascending");
    const descending = buildScalePracticeSequence("C", "major", "arpeggio", "seventh", "descending");
    expect(ascending.map((note) => note.label)).toEqual(["C", "E", "G", "B", "C"]);
    expect(descending.map((note) => note.midi)).toEqual([...ascending].reverse().map((note) => note.midi));
    expect(Object.isFrozen(ascending)).toBe(true);
  });

  it("defines five immutable arpeggio patterns and builds every sequence", () => {
    expect(ARPEGGIO_PATTERNS.map((pattern) => [pattern.id, pattern.degrees])).toEqual([
      ["triad", [1, 3, 5]],
      ["seventh", [1, 3, 5, 7]],
      ["sixth", [1, 3, 5, 6]],
      ["sus2", [1, 2, 5]],
      ["sus4", [1, 4, 5]],
    ]);
    expect(Object.isFrozen(ARPEGGIO_PATTERNS)).toBe(true);
    expect(ARPEGGIO_PATTERNS.every((pattern) => (
      Object.isFrozen(pattern) && Object.isFrozen(pattern.degrees)
    ))).toBe(true);
    expect(buildScalePracticeSequence("C", "major", "arpeggio", "triad", "ascending")
      .map((note) => note.label)).toEqual(["C", "E", "G", "C"]);
    expect(buildScalePracticeSequence("C", "major", "arpeggio", "seventh", "ascending")
      .map((note) => note.label)).toEqual(["C", "E", "G", "B", "C"]);
    expect(buildScalePracticeSequence("C", "major", "arpeggio", "sixth", "ascending")
      .map((note) => note.label)).toEqual(["C", "E", "G", "A", "C"]);
    expect(buildScalePracticeSequence("C", "major", "arpeggio", "sus2", "ascending")
      .map((note) => note.label)).toEqual(["C", "D", "G", "C"]);
    expect(buildScalePracticeSequence("C", "major", "arpeggio", "sus4", "ascending")
      .map((note) => note.label)).toEqual(["C", "F", "G", "C"]);
    expect(() => buildScalePracticeSequence(
      "C", "major", "arpeggio", "unknown" as never, "ascending",
    )).toThrow(RangeError);
  });

  it("maps all displayed note lengths to a locked 120 BPM 4/4 onset grid", () => {
    expect(SCALE_PRACTICE_BPM).toBe(120);
    expect(SCALE_PRACTICE_BEATS_PER_BAR).toBe(4);
    expect(PRACTICE_NOTE_LENGTHS.map((definition) => definition.label)).toEqual([
      "1/16", "1/8", "1/4", "1/2", "1",
    ]);
    expect(PRACTICE_NOTE_LENGTHS.map((definition) => (
      practiceNoteDurationSeconds(definition.id)
    ))).toEqual([0.125, 0.25, 0.5, 1, 2]);
    expect(Object.isFrozen(PRACTICE_NOTE_LENGTHS)).toBe(true);
    expect(PRACTICE_NOTE_LENGTHS.every(Object.isFrozen)).toBe(true);
    expect(() => practiceNoteDurationSeconds("triplet" as never)).toThrow(RangeError);
  });

  it("creates monophonic playback events with strict timing validation", () => {
    const sequence = buildScalePracticeSequence("C", "minor_blues", "scale", "triad", "ascending");
    const schedule = buildScalePlaybackSchedule(sequence, 0.4);
    expect(schedule).toHaveLength(7);
    expect(schedule[1]).toEqual({ startTime: 0.4, duration: 0.35200000000000004, notes: [51], chordIndex: 1 });
    expect(schedule.every((event) => event.notes.length === 1)).toBe(true);
    expect(() => buildScalePlaybackSchedule(sequence, 0)).toThrow(RangeError);
  });
});
