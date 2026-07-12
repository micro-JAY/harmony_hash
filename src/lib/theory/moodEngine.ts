import moodDataset from "../../data/moods.json";
import type { IndexedChord } from "../types";
import { chordPitchClasses } from "./chordTones";
import {
  harmonicFitTier,
  type HarmonicFitComponents,
  type HarmonicFitResult,
  type HarmonyContext,
} from "./harmonicSuggestions";
import { scalePitchClasses, type ScaleFormulaType } from "./scaleBasics";

export const MOOD_IDS = Object.freeze([
  "bright",
  "dark",
  "jazzy",
  "bluesy",
  "latin",
  "film_noir",
  "ethereal",
  "happy",
  "melancholy",
  "heroic",
  "ancient",
  "lively",
] as const);

export type MoodId = typeof MOOD_IDS[number];
export type MoodKind = "mood" | "genre";
export type MoodChordQuality = "major" | "minor" | "dominant" | "other" | "sustained";

export interface MoodDefinition {
  readonly id: MoodId;
  readonly label: string;
  readonly kind: MoodKind;
  readonly description: string;
  readonly scales: ReadonlyArray<ScaleFormulaType>;
  readonly qualityWeights: Readonly<Record<MoodChordQuality, number>>;
}

export interface MoodChordFit {
  readonly moodId: MoodId;
  readonly moodLabel: string;
  readonly score: number;
  readonly qualityScore: number;
  readonly scaleScore: number;
  readonly bestScaleType: ScaleFormulaType;
  readonly reasons: ReadonlyArray<string>;
}

export interface MoodHarmonicFitComponents extends HarmonicFitComponents {
  readonly mood: number;
}

export interface MoodHarmonicFitResult extends Omit<HarmonicFitResult, "components" | "reasons"> {
  readonly components: MoodHarmonicFitComponents;
  readonly reasons: ReadonlyArray<string>;
  readonly mood: MoodChordFit;
}

export interface MoodScaleCandidate {
  readonly scaleType: ScaleFormulaType;
}

const SCALE_FORMULA_TYPES = Object.freeze([
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
] as const satisfies ReadonlyArray<ScaleFormulaType>);

const QUALITY_LABELS: Readonly<Record<MoodChordQuality, string>> = Object.freeze({
  major: "major quality",
  minor: "minor quality",
  dominant: "dominant quality",
  other: "altered or color quality",
  sustained: "suspended quality",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMoodId(value: unknown): value is MoodId {
  return typeof value === "string" && MOOD_IDS.some((id) => id === value);
}

function isMoodKind(value: unknown): value is MoodKind {
  return value === "mood" || value === "genre";
}

function isScaleFormulaType(value: unknown): value is ScaleFormulaType {
  return typeof value === "string" && SCALE_FORMULA_TYPES.some((type) => type === value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function requiredWeight(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 100) {
    throw new RangeError(`${path} must be an integer from 0 to 100`);
  }
  return value;
}

function parseQualityWeights(value: unknown, path: string): Readonly<Record<MoodChordQuality, number>> {
  if (!isRecord(value)) throw new TypeError(`${path} must be an object`);
  return Object.freeze({
    major: requiredWeight(value.major, `${path}.major`),
    minor: requiredWeight(value.minor, `${path}.minor`),
    dominant: requiredWeight(value.dominant, `${path}.dominant`),
    other: requiredWeight(value.other, `${path}.other`),
    sustained: requiredWeight(value.sustained, `${path}.sustained`),
  });
}

function parseMoodDefinition(value: unknown, index: number): MoodDefinition {
  const path = `moods[${index}]`;
  if (!isRecord(value)) throw new TypeError(`${path} must be an object`);
  if (!isMoodId(value.id)) throw new TypeError(`${path}.id is not a supported mood id`);
  if (!isMoodKind(value.kind)) throw new TypeError(`${path}.kind must be mood or genre`);
  if (!Array.isArray(value.scales) || value.scales.length === 0) {
    throw new TypeError(`${path}.scales must be a non-empty array`);
  }
  const scales = value.scales.map((scale, scaleIndex) => {
    if (!isScaleFormulaType(scale)) {
      throw new TypeError(`${path}.scales[${scaleIndex}] is not a supported scale type`);
    }
    return scale;
  });
  if (new Set(scales).size !== scales.length) {
    throw new TypeError(`${path}.scales must not contain duplicates`);
  }

  return Object.freeze({
    id: value.id,
    label: requiredString(value.label, `${path}.label`),
    kind: value.kind,
    description: requiredString(value.description, `${path}.description`),
    scales: Object.freeze(scales),
    qualityWeights: parseQualityWeights(value.qualityWeights, `${path}.qualityWeights`),
  });
}

export function parseMoodDefinitions(records: ReadonlyArray<unknown>): ReadonlyArray<MoodDefinition> {
  const parsed = records.map((record, index) => parseMoodDefinition(record, index));
  const parsedIds = new Set(parsed.map((definition) => definition.id));
  if (
    parsed.length !== MOOD_IDS.length
    || parsedIds.size !== MOOD_IDS.length
    || MOOD_IDS.some((id) => !parsedIds.has(id))
  ) {
    throw new TypeError("moods.json must define every supported mood id exactly once");
  }
  return Object.freeze(parsed);
}

export const MOODS = parseMoodDefinitions(moodDataset.moods);

export function moodDefinitionFor(moodId: MoodId): MoodDefinition {
  const definition = MOODS.find((candidate) => candidate.id === moodId);
  if (!definition) throw new RangeError(`Unknown mood id: ${moodId}`);
  return definition;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function qualityForChord(chord: IndexedChord): MoodChordQuality {
  switch (chord.entry.Type) {
    case "Major": return "major";
    case "Minor": return "minor";
    case "Dominant": return "dominant";
    case "Sustained": return "sustained";
    case "Other": return "other";
  }
}

export function scoreChordMoodFit(
  chord: IndexedChord,
  context: HarmonyContext,
  moodId: MoodId,
): MoodChordFit {
  const definition = moodDefinitionFor(moodId);
  const quality = qualityForChord(chord);
  const qualityScore = definition.qualityWeights[quality];
  const tones = [...chordPitchClasses(chord)];
  const scaleScores = definition.scales.map((scaleType) => {
    const scaleTones = scalePitchClasses(context.key, scaleType);
    const matchingTones = tones.filter((tone) => scaleTones.has(tone)).length;
    return {
      scaleType,
      score: tones.length === 0 ? 0 : clampScore((matchingTones / tones.length) * 100),
    };
  });
  scaleScores.sort((left, right) => right.score - left.score);
  const bestScale = scaleScores[0];
  const scaleScore = bestScale?.score ?? 0;
  const score = clampScore(scaleScore * 0.58 + qualityScore * 0.42);

  return Object.freeze({
    moodId,
    moodLabel: definition.label,
    score,
    qualityScore,
    scaleScore,
    bestScaleType: bestScale?.scaleType ?? definition.scales[0],
    reasons: Object.freeze([
      `${definition.label} scale fit ${scaleScore}%`,
      `${QUALITY_LABELS[quality]} weight ${qualityScore}%`,
    ]),
  });
}

export function applyMoodToHarmonicFit(
  baseFit: HarmonicFitResult,
  chord: IndexedChord,
  context: HarmonyContext,
  moodId: MoodId,
): MoodHarmonicFitResult {
  const mood = scoreChordMoodFit(chord, context, moodId);
  const score = clampScore(baseFit.score * 0.72 + mood.score * 0.28);
  return Object.freeze({
    ...baseFit,
    score,
    tier: harmonicFitTier(score),
    components: Object.freeze({ ...baseFit.components, mood: mood.score }),
    reasons: Object.freeze([...baseFit.reasons, ...mood.reasons]),
    mood,
  });
}

export function filterScaleSuggestionsByMood<T extends MoodScaleCandidate>(
  suggestions: ReadonlyArray<T>,
  moodId: MoodId,
  limit: number,
): ReadonlyArray<T> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Mood scale result limit must be a positive integer; received ${limit}`);
  }
  const allowedScales = new Set(moodDefinitionFor(moodId).scales);
  return Object.freeze(
    suggestions.filter((suggestion) => allowedScales.has(suggestion.scaleType)).slice(0, limit),
  );
}
