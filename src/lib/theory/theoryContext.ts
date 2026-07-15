import type { ScaleType } from "../types";
import type { MoodId } from "./moodEngine";
import {
  pitchClassOf,
  scaleIntervalFormulaFor,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";

export const THEORY_MOOD_ANY = "any" as const;

const CANONICAL_THEORY_ROOTS = Object.freeze([
  "C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
] as const);

export type TheoryMood = typeof THEORY_MOOD_ANY | MoodId;
export type TheoryRelationshipId = string;

export interface TheoryContext {
  readonly root: string;
  readonly scaleId: ScaleFormulaType;
  readonly mood: TheoryMood;
  readonly selectedRelationshipId: TheoryRelationshipId | null;
}

export interface SupportedHasherHandoff {
  readonly kind: "supported-mode";
  readonly root: string;
  readonly scaleId: ScaleFormulaType;
  readonly mode: ScaleType;
}

export interface UnsupportedHasherHandoff {
  readonly kind: "free-input-context";
  readonly root: string;
  readonly scaleId: ScaleFormulaType;
  readonly mode: null;
  readonly formula: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
  readonly explanationKey: "theory.handoff.unsupportedFormula";
}

export type HasherHandoff = SupportedHasherHandoff | UnsupportedHasherHandoff;

export const SUPPORTED_HASHER_SCALE_MAP: Readonly<
  Partial<Record<ScaleFormulaType, ScaleType>>
> = Object.freeze({
  major: "major",
  natural_minor: "natural_minor",
  harmonic_minor: "harmonic_minor",
  dorian: "dorian",
  mixolydian: "mixolydian",
  lydian: "lydian",
  phrygian: "phrygian",
});

export const DEFAULT_THEORY_CONTEXT: TheoryContext = Object.freeze({
  root: "C",
  scaleId: "major",
  mood: THEORY_MOOD_ANY,
  selectedRelationshipId: null,
});

export function canonicalTheoryRoot(root: string): string {
  const pitchClass = pitchClassOf(root);
  if (pitchClass < 0) {
    throw new Error(`Unrecognized theory root: "${root}"`);
  }
  return CANONICAL_THEORY_ROOTS[pitchClass];
}

export function createTheoryContext(
  overrides: Partial<TheoryContext> = {},
): TheoryContext {
  const context = {
    ...DEFAULT_THEORY_CONTEXT,
    ...overrides,
    root: canonicalTheoryRoot(overrides.root ?? DEFAULT_THEORY_CONTEXT.root),
  };
  return Object.freeze(context);
}

export function scaleSynthesiaToHasherHandoff(
  root: string,
  scaleId: ScaleFormulaType,
): HasherHandoff {
  if (pitchClassOf(root) < 0) {
    throw new Error(`Unrecognized Scale Synthesia root: "${root}"`);
  }
  const canonicalRoot = canonicalTheoryRoot(root);

  const mode = SUPPORTED_HASHER_SCALE_MAP[scaleId];
  if (mode) {
    return Object.freeze({
      kind: "supported-mode",
      root: canonicalRoot,
      scaleId,
      mode,
    });
  }

  return Object.freeze({
    kind: "free-input-context",
    root: canonicalRoot,
    scaleId,
    mode: null,
    formula: scaleIntervalFormulaFor(scaleId),
    notes: spellScaleNotes(canonicalRoot, scaleId),
    explanationKey: "theory.handoff.unsupportedFormula",
  });
}
