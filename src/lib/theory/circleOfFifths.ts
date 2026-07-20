import {
  pitchClassOf,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";
import { canonicalTheoryRoot } from "./theoryContext";

export interface CircleKey {
  readonly id: string;
  readonly major: string;
  readonly builderKey: string;
  readonly relativeMinor: string;
  readonly signature: string;
}

export type CircleModeInsightId = "dorian" | "lydian" | "mixolydian";
export type CircleKeyChangeInsightId =
  | "parallel-shift"
  | "whole-step-lift"
  | "chromatic-mediant";

export interface CircleModeInsight {
  readonly id: string;
  readonly kind: "mode";
  readonly insightId: CircleModeInsightId;
  readonly root: string;
  readonly scaleId: Extract<ScaleFormulaType, "dorian" | "lydian" | "mixolydian">;
  readonly label: string;
  readonly characteristicKey: "Natural 6" | "Raised 4" | "Flat 7";
  readonly useKey: "Minor-seventh vamp" | "Major sharp-eleven color" | "Dominant and rock cadence";
  readonly romanExample: "i7 → IV7" | "Imaj7 → II/I" | "I → bVII → IV → I";
  readonly example: ReadonlyArray<string>;
}

export interface CircleKeyChangeInsight {
  readonly id: string;
  readonly kind: "key-change";
  readonly insightId: CircleKeyChangeInsightId;
  readonly sourceRoot: string;
  readonly targetRoot: string;
  readonly targetRootLabel: string;
  readonly targetScaleId: Extract<ScaleFormulaType, "major" | "natural_minor">;
  readonly labelKey: "Parallel shift" | "Whole-step lift" | "Chromatic mediant";
  readonly explanationKey:
    | "Borrow the parallel tonic quality."
    | "Use the new key's dominant to land one whole step higher."
    | "Hold a common tone through a direct major-third shift.";
  readonly evidence?: string;
  readonly romanExample: "I → V → i → bVI" | "I → IV → V/new → I/new" | "Imaj7 → IIImaj7";
  readonly example: ReadonlyArray<string>;
}

export interface CircleInsights {
  readonly modes: ReadonlyArray<CircleModeInsight>;
  readonly keyChanges: ReadonlyArray<CircleKeyChangeInsight>;
}

export const CIRCLE_KEYS: ReadonlyArray<CircleKey> = Object.freeze([
  { id: "C", major: "C major", builderKey: "C", relativeMinor: "A minor", signature: "No sharps or flats" },
  { id: "G", major: "G major", builderKey: "G", relativeMinor: "E minor", signature: "1 sharp" },
  { id: "D", major: "D major", builderKey: "D", relativeMinor: "B minor", signature: "2 sharps" },
  { id: "A", major: "A major", builderKey: "A", relativeMinor: "F# minor", signature: "3 sharps" },
  { id: "E", major: "E major", builderKey: "E", relativeMinor: "C# minor", signature: "4 sharps" },
  { id: "B", major: "B major", builderKey: "B", relativeMinor: "G# minor", signature: "5 sharps" },
  { id: "F# / Gb", major: "F# / Gb major", builderKey: "F#", relativeMinor: "D# / Eb minor", signature: "6 sharps / 6 flats" },
  { id: "Db", major: "Db major", builderKey: "Db", relativeMinor: "Bb minor", signature: "5 flats" },
  { id: "Ab", major: "Ab major", builderKey: "Ab", relativeMinor: "F minor", signature: "4 flats" },
  { id: "Eb", major: "Eb major", builderKey: "Eb", relativeMinor: "C minor", signature: "3 flats" },
  { id: "Bb", major: "Bb major", builderKey: "Bb", relativeMinor: "G minor", signature: "2 flats" },
  { id: "F", major: "F major", builderKey: "F", relativeMinor: "D minor", signature: "1 flat" },
].map((key) => Object.freeze(key)));

const MAJOR_QUALITIES = Object.freeze(["", "m", "m", "", "", "m", "dim"]);

/** Keeps the preferred spelling first while making its enharmonic alias subordinate. */
export function formatCircleRootLabel(value: string): string {
  const root = value.replace(/ (?:major|minor)$/, "");
  const [preferred, alternate] = root.split(" / ");
  return alternate ? `${preferred} (${alternate})` : preferred;
}

export function formatSelectedCircleRootLabel(value: string, selectedRoot: string): string {
  const aliases = value.replace(/ (?:major|minor)$/, "").split(" / ");
  const selectedPitchClass = pitchClassOf(selectedRoot);
  if (
    selectedPitchClass < 0
    || !aliases.some((alias) => pitchClassOf(alias) === selectedPitchClass)
  ) {
    return formatCircleRootLabel(value);
  }

  const orderedAliases = [selectedRoot, ...aliases.filter((alias) => alias !== selectedRoot)];
  const uniqueAliases = orderedAliases.filter((alias, index) => orderedAliases.indexOf(alias) === index);
  return uniqueAliases.length > 1
    ? `${uniqueAliases[0]} (${uniqueAliases.slice(1).join(" / ")})`
    : uniqueAliases[0];
}

function supportedTargetRoot(spelledRoot: string): Readonly<{ root: string; label: string }> {
  const root = canonicalTheoryRoot(spelledRoot);
  return Object.freeze({
    root,
    label: root === spelledRoot ? root : `${spelledRoot} (${root})`,
  });
}

function freezeExample(...chords: string[]): ReadonlyArray<string> {
  return Object.freeze(chords);
}

export function circleInsightsFor(root: string): CircleInsights {
  if (pitchClassOf(root) < 0) throw new Error(`Unrecognized Circle insight root: "${root}"`);

  const stableRoot = canonicalTheoryRoot(root);
  const majorNotes = spellScaleNotes(stableRoot, "major");
  const minorNotes = spellScaleNotes(stableRoot, "natural_minor");
  const dorianNotes = spellScaleNotes(stableRoot, "dorian");
  const lydianNotes = spellScaleNotes(stableRoot, "lydian");
  const mixolydianNotes = spellScaleNotes(stableRoot, "mixolydian");

  const modes = Object.freeze([
    Object.freeze({
      id: `circle-mode:${stableRoot}:dorian`,
      kind: "mode",
      insightId: "dorian",
      root: stableRoot,
      scaleId: "dorian",
      label: `${stableRoot} Dorian`,
      characteristicKey: "Natural 6",
      useKey: "Minor-seventh vamp",
      romanExample: "i7 → IV7",
      example: freezeExample(`${stableRoot}m7`, `${dorianNotes[3]}7`),
    } as const),
    Object.freeze({
      id: `circle-mode:${stableRoot}:lydian`,
      kind: "mode",
      insightId: "lydian",
      root: stableRoot,
      scaleId: "lydian",
      label: `${stableRoot} Lydian`,
      characteristicKey: "Raised 4",
      useKey: "Major sharp-eleven color",
      romanExample: "Imaj7 → II/I",
      example: freezeExample(`${stableRoot}maj7`, `${lydianNotes[1]}/${stableRoot}`),
    } as const),
    Object.freeze({
      id: `circle-mode:${stableRoot}:mixolydian`,
      kind: "mode",
      insightId: "mixolydian",
      root: stableRoot,
      scaleId: "mixolydian",
      label: `${stableRoot} Mixolydian`,
      characteristicKey: "Flat 7",
      useKey: "Dominant and rock cadence",
      romanExample: "I → bVII → IV → I",
      example: freezeExample(stableRoot, mixolydianNotes[6], mixolydianNotes[3], stableRoot),
    } as const),
  ] satisfies ReadonlyArray<CircleModeInsight>);

  const wholeStepTarget = supportedTargetRoot(majorNotes[1]);
  const wholeStepNotes = spellScaleNotes(wholeStepTarget.root, "major");
  const chromaticMediantTarget = supportedTargetRoot(majorNotes[2]);
  const commonTone = chromaticMediantTarget.root === majorNotes[2]
    ? majorNotes[2]
    : `${majorNotes[2]} (${chromaticMediantTarget.root})`;
  const keyChanges = Object.freeze([
    Object.freeze({
      id: `circle-key-change:${stableRoot}:parallel-shift`,
      kind: "key-change",
      insightId: "parallel-shift",
      sourceRoot: stableRoot,
      targetRoot: stableRoot,
      targetRootLabel: stableRoot,
      targetScaleId: "natural_minor",
      labelKey: "Parallel shift",
      explanationKey: "Borrow the parallel tonic quality.",
      romanExample: "I → V → i → bVI",
      example: freezeExample(stableRoot, majorNotes[4], `${stableRoot}m`, minorNotes[5]),
    } as const),
    Object.freeze({
      id: `circle-key-change:${stableRoot}:whole-step-lift`,
      kind: "key-change",
      insightId: "whole-step-lift",
      sourceRoot: stableRoot,
      targetRoot: wholeStepTarget.root,
      targetRootLabel: wholeStepTarget.label,
      targetScaleId: "major",
      labelKey: "Whole-step lift",
      explanationKey: "Use the new key's dominant to land one whole step higher.",
      romanExample: "I → IV → V/new → I/new",
      example: freezeExample(stableRoot, majorNotes[3], `${wholeStepNotes[4]}7`, wholeStepTarget.root),
    } as const),
    Object.freeze({
      id: `circle-key-change:${stableRoot}:chromatic-mediant`,
      kind: "key-change",
      insightId: "chromatic-mediant",
      sourceRoot: stableRoot,
      targetRoot: chromaticMediantTarget.root,
      targetRootLabel: chromaticMediantTarget.label,
      targetScaleId: "major",
      labelKey: "Chromatic mediant",
      explanationKey: "Hold a common tone through a direct major-third shift.",
      evidence: commonTone,
      romanExample: "Imaj7 → IIImaj7",
      example: freezeExample(`${stableRoot}maj7`, `${chromaticMediantTarget.root}maj7`),
    } as const),
  ] satisfies ReadonlyArray<CircleKeyChangeInsight>);

  return Object.freeze({ modes, keyChanges });
}

export function circleKeyAt(index: number): CircleKey {
  const normalized = ((index % CIRCLE_KEYS.length) + CIRCLE_KEYS.length) % CIRCLE_KEYS.length;
  return CIRCLE_KEYS[normalized];
}

export function adjacentCircleKeys(index: number): readonly [CircleKey, CircleKey] {
  return Object.freeze([circleKeyAt(index - 1), circleKeyAt(index + 1)]);
}

export function diatonicChordsFor(key: CircleKey): ReadonlyArray<string> {
  return Object.freeze(
    spellScaleNotes(key.builderKey, "major").map(
      (note, index) => `${note}${MAJOR_QUALITIES[index]}`,
    ),
  );
}

export function builderProgressionFor(key: CircleKey): ReadonlyArray<string> {
  const chords = diatonicChordsFor(key);
  return Object.freeze([chords[0], chords[3], chords[4]]);
}
