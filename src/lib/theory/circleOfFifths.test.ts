import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import {
  adjacentCircleKeys,
  builderProgressionFor,
  CIRCLE_KEYS,
  circleInsightsFor,
  circleKeyAt,
  diatonicChordsFor,
  formatCircleRootLabel,
  formatSelectedCircleRootLabel,
} from "./circleOfFifths";
import { pitchClassOf } from "./scaleBasics";

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

  it("balances enharmonic aliases without changing canonical key data", () => {
    expect(formatCircleRootLabel("F# / Gb major")).toBe("F# (Gb)");
    expect(formatCircleRootLabel("D# / Eb minor")).toBe("D# (Eb)");
    expect(formatCircleRootLabel("C major")).toBe("C");
    expect(formatSelectedCircleRootLabel("Db major", "C#")).toBe("C# (Db)");
    expect(formatSelectedCircleRootLabel("Db / C# major", "C#")).toBe("C# (Db)");
    expect(formatSelectedCircleRootLabel("F# / Gb major", "F#")).toBe("F# (Gb)");
    expect(formatSelectedCircleRootLabel("Db / C# major", "D")).toBe("Db (C#)");
    expect(formatSelectedCircleRootLabel("Db / C# major", "C#")).not.toMatch(/\([^)]*\(/);
    expect(CIRCLE_KEYS[6].major).toBe("F# / Gb major");
  });

  it("publishes three actionable modes and three key changes for C", () => {
    const insights = circleInsightsFor("C");

    expect(insights.modes.map((insight) => ({
      id: insight.insightId,
      label: insight.label,
      characteristic: insight.characteristicKey,
      roman: insight.romanExample,
      example: insight.example,
    }))).toEqual([
      {
        id: "dorian",
        label: "C Dorian",
        characteristic: "Natural 6",
        roman: "i7 → IV7",
        example: ["Cm7", "F7"],
      },
      {
        id: "lydian",
        label: "C Lydian",
        characteristic: "Raised 4",
        roman: "Imaj7 → II/I",
        example: ["Cmaj7", "D/C"],
      },
      {
        id: "mixolydian",
        label: "C Mixolydian",
        characteristic: "Flat 7",
        roman: "I → bVII → IV → I",
        example: ["C", "Bb", "F", "C"],
      },
    ]);
    expect(insights.keyChanges.map((insight) => ({
      id: insight.insightId,
      target: insight.targetRoot,
      scaleId: insight.targetScaleId,
      roman: insight.romanExample,
      example: insight.example,
      evidence: insight.evidence,
    }))).toEqual([
      {
        id: "parallel-shift",
        target: "C",
        scaleId: "natural_minor",
        roman: "I → V → i → bVI",
        example: ["C", "G", "Cm", "Ab"],
        evidence: undefined,
      },
      {
        id: "whole-step-lift",
        target: "D",
        scaleId: "major",
        roman: "I → IV → V/new → I/new",
        example: ["C", "F", "A7", "D"],
        evidence: undefined,
      },
      {
        id: "chromatic-mediant",
        target: "E",
        scaleId: "major",
        roman: "Imaj7 → IIImaj7",
        example: ["Cmaj7", "Emaj7"],
        evidence: "E",
      },
    ]);
  });

  it("keeps every insight deterministic, immutable, unique, and valid across all roots", () => {
    const supportedRoots = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

    for (const root of supportedRoots) {
      const insights = circleInsightsFor(root);
      const repeated = circleInsightsFor(root);
      const allInsights = [...insights.modes, ...insights.keyChanges];

      expect(repeated).toEqual(insights);
      expect(insights.modes).toHaveLength(3);
      expect(insights.keyChanges).toHaveLength(3);
      expect(new Set(allInsights.map((insight) => insight.id)).size).toBe(6);
      expect(Object.isFrozen(insights)).toBe(true);
      expect(Object.isFrozen(insights.modes)).toBe(true);
      expect(Object.isFrozen(insights.keyChanges)).toBe(true);
      expect(allInsights.every(Object.isFrozen)).toBe(true);
      expect(allInsights.every((insight) => Object.isFrozen(insight.example))).toBe(true);
      expect(insights.modes.every((insight) => insight.root === root)).toBe(true);
      expect(insights.keyChanges.every((insight) => pitchClassOf(insight.targetRoot) >= 0)).toBe(true);
    }
  });

  it("rejects an invalid insight root instead of fabricating a fallback", () => {
    expect(() => circleInsightsFor("H")).toThrow('Unrecognized Circle insight root: "H"');
  });
});
