import { describe, expect, it } from "vitest";
import type { ScaleType } from "../types";
import type { ScaleFormulaType } from "./scaleBasics";
import {
  canonicalTheoryRoot,
  createTheoryContext,
  DEFAULT_THEORY_CONTEXT,
  scaleSynthesiaToHasherHandoff,
  SUPPORTED_HASHER_SCALE_MAP,
  THEORY_MOOD_ANY,
} from "./theoryContext";

describe("shared Theory context", () => {
  it("keeps Any as an explicit required default", () => {
    expect(DEFAULT_THEORY_CONTEXT).toEqual({
      root: "C",
      scaleId: "major",
      mood: "any",
      selectedRelationshipId: null,
    });
    expect(DEFAULT_THEORY_CONTEXT.mood).toBe(THEORY_MOOD_ANY);
    expect(Object.isFrozen(DEFAULT_THEORY_CONTEXT)).toBe(true);
    expect(createTheoryContext({ root: "D", scaleId: "dorian" }).mood).toBe("any");
  });

  it("canonicalizes enharmonic roots to values represented by the shared selector", () => {
    expect(canonicalTheoryRoot("Db")).toBe("C#");
    expect(canonicalTheoryRoot("D#")).toBe("Eb");
    expect(canonicalTheoryRoot("Gb")).toBe("F#");
    expect(canonicalTheoryRoot("A#")).toBe("Bb");
    expect(createTheoryContext({ root: "Db" }).root).toBe("C#");
    expect(scaleSynthesiaToHasherHandoff("Db", "dorian").root).toBe("C#");
  });

  it("maps exactly the seven Hasher modes", () => {
    const expected = Object.freeze({
      major: "major",
      natural_minor: "natural_minor",
      harmonic_minor: "harmonic_minor",
      dorian: "dorian",
      mixolydian: "mixolydian",
      lydian: "lydian",
      phrygian: "phrygian",
    } satisfies Record<ScaleType, ScaleType>);

    expect(SUPPORTED_HASHER_SCALE_MAP).toEqual(expected);
    for (const [scaleId, mode] of Object.entries(expected)) {
      expect(scaleSynthesiaToHasherHandoff("Eb", scaleId as ScaleFormulaType)).toEqual({
        kind: "supported-mode",
        root: "Eb",
        scaleId,
        mode,
      });
    }
  });

  it("returns truthful formula data instead of inventing an unsupported mode", () => {
    const handoff = scaleSynthesiaToHasherHandoff("C", "whole_tone");
    if (handoff.kind !== "free-input-context") {
      throw new Error("Whole tone must use the unsupported-formula handoff");
    }
    expect(handoff).toEqual({
      kind: "free-input-context",
      root: "C",
      scaleId: "whole_tone",
      mode: null,
      formula: ["1", "2", "3", "#4", "#5", "#6"],
      notes: ["C", "D", "E", "F#", "G#", "A#"],
      explanationKey: "theory.handoff.unsupportedFormula",
    });
    expect("mood" in handoff).toBe(false);
    expect(Object.isFrozen(handoff)).toBe(true);
    expect(Object.isFrozen(handoff.formula)).toBe(true);
    expect(Object.isFrozen(handoff.notes)).toBe(true);
  });

  it("rejects invalid roots instead of returning success-shaped data", () => {
    expect(() => createTheoryContext({ root: "H" })).toThrow(/Unrecognized theory root/);
    expect(() => scaleSynthesiaToHasherHandoff("H", "major")).toThrow(
      /Unrecognized Scale Synthesia root/,
    );
  });
});
