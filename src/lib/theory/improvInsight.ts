import type { IndexedChord } from "../types";
import { chordPitchClasses } from "./chordTones";
import { noteLabelForPitchClass } from "./fretboard";
import {
  pitchClassOf,
  scaleIntervalsFor,
  scalePitchClasses,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";

export type ScaleMotion = "smooth" | "jumpy";
export type ScaleTension = "rises" | "static" | "falls";
export type ScalePalette = "diatonic" | "chromatic";
export type ScaleStyle = "tonal" | "modal" | "blues";
export type ImprovScaleFormulaType =
  | "major"
  | "natural_minor"
  | "harmonic_minor"
  | "dorian"
  | "mixolydian"
  | "lydian"
  | "phrygian"
  | "major_pentatonic"
  | "minor_pentatonic"
  | "major_blues"
  | "minor_blues";

export interface ScaleSuggestionMetadata {
  readonly motion: ScaleMotion;
  readonly tension: ScaleTension;
  readonly palette: ScalePalette;
  readonly style: ScaleStyle;
}

export interface ScaleSuggestion {
  readonly key: string;
  readonly scaleType: ImprovScaleFormulaType;
  readonly label: string;
  readonly alsoKnownAs?: string;
  readonly match: number;
  readonly matchedTones: number;
  readonly totalTones: number;
  readonly missingScaleTones: number;
  readonly accidentalTones: number;
  readonly notes: ReadonlyArray<string>;
  readonly metadata: Readonly<ScaleSuggestionMetadata>;
  readonly reasons: ReadonlyArray<string>;
}

export interface ScaleFitScore {
  readonly overlap: number;
  readonly missing: number;
  readonly accidentals: number;
  readonly match: number;
}

export interface ScaleRankingOptions {
  readonly preferFlats?: boolean;
}

const CANDIDATE_ROOTS = Object.freeze([
  "C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B",
] as const);

const SCALE_TYPES = Object.freeze([
  "major",
  "natural_minor",
  "harmonic_minor",
  "dorian",
  "mixolydian",
  "lydian",
  "phrygian",
  "major_pentatonic",
  "minor_pentatonic",
  "major_blues",
  "minor_blues",
] as const satisfies ReadonlyArray<ImprovScaleFormulaType>);

export const SCALE_SUGGESTION_CANDIDATE_COUNT = CANDIDATE_ROOTS.length * SCALE_TYPES.length;

const SCALE_TYPE_LABELS: Readonly<Record<ImprovScaleFormulaType, string>> = Object.freeze({
  major: "Major",
  natural_minor: "Natural Minor",
  harmonic_minor: "Harmonic Minor",
  dorian: "Dorian",
  mixolydian: "Mixolydian",
  lydian: "Lydian",
  phrygian: "Phrygian",
  major_pentatonic: "Major Pentatonic",
  minor_pentatonic: "Minor Pentatonic",
  major_blues: "Major Blues",
  minor_blues: "Minor Blues",
});

const ENHARMONIC_ROOT_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  Cs: "Db",
  Ds: "Eb",
  Fs: "Gb",
  Gs: "Ab",
  As: "Bb",
});

const STYLE_TIE_BREAK: Readonly<Record<ScaleStyle, number>> = Object.freeze({
  tonal: 0,
  blues: 1,
  modal: 2,
});

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function progressionToneSet(chords: ReadonlyArray<IndexedChord>): ReadonlySet<number> {
  return new Set(chords.flatMap((chord) => chordPitchClasses(chord)));
}

export function scoreScale(
  scaleType: ScaleFormulaType,
  scaleRoot: string,
  progressionTones: ReadonlySet<number>,
): ScaleFitScore {
  const scale = scalePitchClasses(scaleRoot, scaleType);
  const overlap = [...progressionTones].filter((tone) => scale.has(tone)).length;
  const accidentals = progressionTones.size - overlap;
  const missing = [...scale].filter((tone) => !progressionTones.has(tone)).length;
  return Object.freeze({
    overlap,
    missing,
    accidentals,
    match: progressionTones.size === 0 ? 0 : clampPercent((overlap / progressionTones.size) * 100),
  });
}

export function scaleMotion(scaleType: ScaleFormulaType): ScaleMotion {
  const intervals = scaleIntervalsFor(scaleType);
  const steps = intervals.map((interval, index) => {
    const next = intervals[(index + 1) % intervals.length] + (index === intervals.length - 1 ? 12 : 0);
    return next - interval;
  });
  const mean = 12 / steps.length;
  const variance = steps.reduce((sum, step) => sum + (step - mean) ** 2, 0) / steps.length;
  return variance <= 0.3 ? "smooth" : "jumpy";
}

export function scaleTension(scaleType: ScaleFormulaType): ScaleTension {
  const intervals = new Set(scaleIntervalsFor(scaleType));
  const tritoneCount = [...intervals]
    .filter((interval) => intervals.has((interval + 6) % 12)).length / 2;
  if (tritoneCount === 0) return "falls";
  if (tritoneCount === 1) return "static";
  return "rises";
}

export function scalePalette(scaleType: ScaleFormulaType): ScalePalette {
  return ["harmonic_minor", "major_blues", "minor_blues"].includes(scaleType)
    ? "chromatic"
    : "diatonic";
}

export function scaleStyle(scaleType: ScaleFormulaType): ScaleStyle {
  if (["major_pentatonic", "minor_pentatonic", "major_blues", "minor_blues"].includes(scaleType)) {
    return "blues";
  }
  if (["dorian", "mixolydian", "lydian", "phrygian"].includes(scaleType)) return "modal";
  return "tonal";
}

function suggestionFor(
  progressionTones: ReadonlySet<number>,
  key: string,
  scaleType: ImprovScaleFormulaType,
  preferFlats: boolean,
): ScaleSuggestion {
  const fit = scoreScale(scaleType, key, progressionTones);
  const rootPitchClass = pitchClassOf(key);
  const sharpRoot = noteLabelForPitchClass(rootPitchClass, false);
  const scaleLabel = SCALE_TYPE_LABELS[scaleType];
  const flatRoot = ENHARMONIC_ROOT_ALIASES[key];
  const displayRoot = preferFlats && flatRoot ? flatRoot : sharpRoot;
  const alternativeRoot = preferFlats && flatRoot ? sharpRoot : flatRoot;
  const notes = spellScaleNotes(displayRoot, scaleType);
  const metadata = Object.freeze({
    motion: scaleMotion(scaleType),
    tension: scaleTension(scaleType),
    palette: scalePalette(scaleType),
    style: scaleStyle(scaleType),
  } satisfies ScaleSuggestionMetadata);

  return Object.freeze({
    key,
    scaleType,
    label: `${displayRoot} ${scaleLabel}`,
    alsoKnownAs: alternativeRoot ? `${alternativeRoot} ${scaleLabel}` : undefined,
    match: fit.match,
    matchedTones: fit.overlap,
    totalTones: progressionTones.size,
    missingScaleTones: fit.missing,
    accidentalTones: fit.accidentals,
    notes,
    metadata,
    reasons: Object.freeze([
      `${fit.overlap}/${progressionTones.size} unique progression tones covered`,
      `${fit.accidentals} progression tones outside the scale`,
      `${fit.missing} scale tones unused by the progression`,
    ]),
  });
}

export function rankCompatibleScales(
  chords: ReadonlyArray<IndexedChord>,
  limit = 8,
  options: ScaleRankingOptions = {},
): ReadonlyArray<ScaleSuggestion> {
  const maximum = SCALE_SUGGESTION_CANDIDATE_COUNT;
  if (!Number.isInteger(limit) || limit < 1 || limit > maximum) {
    throw new RangeError(`Scale suggestion limit must be an integer from 1 to ${maximum}; received ${limit}`);
  }
  if (chords.length === 0) return Object.freeze([]);

  const tones = progressionToneSet(chords);
  const anchorPitchClass = pitchClassOf(chords[0].root);
  const suggestions = CANDIDATE_ROOTS.flatMap((key) =>
    SCALE_TYPES.map((scaleType) => suggestionFor(tones, key, scaleType, options.preferFlats ?? false)),
  );
  suggestions.sort((left, right) => {
    if (right.match !== left.match) return right.match - left.match;
    if (left.accidentalTones !== right.accidentalTones) return left.accidentalTones - right.accidentalTones;
    if (left.missingScaleTones !== right.missingScaleTones) return left.missingScaleTones - right.missingScaleTones;
    const leftAnchored = pitchClassOf(left.key) === anchorPitchClass ? 0 : 1;
    const rightAnchored = pitchClassOf(right.key) === anchorPitchClass ? 0 : 1;
    if (leftAnchored !== rightAnchored) return leftAnchored - rightAnchored;
    const styleOrder = STYLE_TIE_BREAK[left.metadata.style] - STYLE_TIE_BREAK[right.metadata.style];
    if (styleOrder !== 0) return styleOrder;
    const rootOrder = CANDIDATE_ROOTS.indexOf(left.key as typeof CANDIDATE_ROOTS[number])
      - CANDIDATE_ROOTS.indexOf(right.key as typeof CANDIDATE_ROOTS[number]);
    if (rootOrder !== 0) return rootOrder;
    return SCALE_TYPES.indexOf(left.scaleType) - SCALE_TYPES.indexOf(right.scaleType);
  });

  return Object.freeze(suggestions.slice(0, limit));
}
