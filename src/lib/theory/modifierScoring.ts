import { lookupChord } from "../chordData";
import {
  getChordModifierOptions,
  type ChordModifierOption,
} from "../chordModifiers";
import type { IndexedChord, ScaleType } from "../types";
import {
  scoreChordKeyFit,
  scoreVoiceLeadingFit,
  type HarmonyContext,
} from "./harmonicSuggestions";
import { chordPitchClasses } from "./chordTones";
import {
  pitchClassOf,
  scaleDegreeOf,
  scaleIntervalsFor,
  scalePitchClasses,
} from "./scaleBasics";

export type ModifierFunction =
  | "tonic"
  | "tonic-color"
  | "predominant"
  | "dominant"
  | "leading-tone"
  | "modal"
  | "chromatic";

export type ModifierQualityEvidence =
  | "diatonic-triad"
  | "diatonic-seventh"
  | "minor-supertonic"
  | "half-diminished-supertonic"
  | "dominant-triad"
  | "dominant-seventh"
  | "dominant-extension"
  | "altered-dominant"
  | "suspended-dominant"
  | "harmonic-color";

export type ModifierReasonKey =
  | "modifier.reason.scaleCoverage"
  | "modifier.reason.rootFunction"
  | "modifier.reason.qualityExtension"
  | "modifier.reason.voiceLeading"
  | "modifier.reason.complexity";

export type ModifierReasonData = Readonly<Record<string, string | number>>;

export interface ModifierReason {
  readonly key: ModifierReasonKey;
  readonly data: ModifierReasonData;
}

export interface ModifierFitComponents {
  readonly scaleCoverage: number;
  readonly functionFit: number;
  readonly qualityExtensionFit: number;
  readonly voiceLeading: number | null;
  readonly complexityPenalty: number;
}

export interface ModifierFit {
  readonly score: number;
  readonly degree: number | null;
  readonly function: ModifierFunction;
  readonly components: ModifierFitComponents;
  readonly reasons: ReadonlyArray<ModifierReason>;
}

export interface ContextualChordModifierOption extends ChordModifierOption {
  readonly fit?: ModifierFit;
}

export interface HasherModifierContext {
  readonly key?: string | null;
  /** Runtime strings are accepted so unsupported or restored values fail safely. */
  readonly scaleType?: string | null;
}

export interface ContextualModifierInput {
  readonly selectedChord: IndexedChord;
  readonly selectedIndex: number;
  readonly timeline: ReadonlyArray<IndexedChord>;
  readonly displayName?: string;
  readonly context?: HasherModifierContext | null;
  readonly limit?: number;
}

export interface ContextualModifierSet {
  readonly rootLabel: string;
  readonly contextSupported: boolean;
  readonly quick: ReadonlyArray<ContextualChordModifierOption>;
  readonly all: ReadonlyArray<ChordModifierOption>;
}

interface DegreeProfile {
  readonly third: string;
  readonly fifth: string;
  readonly seventh: string;
}

interface QualityFit {
  readonly score: number;
  readonly evidence: ModifierQualityEvidence;
}

const SUPPORTED_SCALE_TYPES: ReadonlySet<string> = new Set<ScaleType>([
  "major",
  "natural_minor",
  "harmonic_minor",
  "dorian",
  "mixolydian",
  "lydian",
  "phrygian",
]);

const ALTERED_STEPS: ReadonlySet<string> = new Set([
  "b5",
  "#5",
  "b9",
  "#9",
  "#11",
  "b13",
]);

const UPPER_EXTENSION_STEPS: ReadonlySet<string> = new Set(["9", "11", "13"]);

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function chordSteps(chord: IndexedChord): ReadonlySet<string> {
  return new Set(chord.entry.Steps.split("-").filter(Boolean));
}

function isSupportedContext(
  context: HasherModifierContext | null | undefined,
): context is Readonly<{ key: string; scaleType: ScaleType }> {
  return typeof context?.key === "string"
    && pitchClassOf(context.key) >= 0
    && typeof context.scaleType === "string"
    && SUPPORTED_SCALE_TYPES.has(context.scaleType);
}

function scaleStepForInterval(interval: number): string {
  switch (interval) {
    case 3:
      return "b3";
    case 4:
      return "3";
    case 6:
      return "b5";
    case 7:
      return "5";
    case 8:
      return "#5";
    case 9:
      return "6";
    case 10:
      return "b7";
    case 11:
      return "7";
    default:
      return `interval-${interval}`;
  }
}

function degreeProfile(context: HarmonyContext, degree: number): DegreeProfile {
  const intervals = scaleIntervalsFor(context.scaleType);
  const rootIndex = degree - 1;
  const rootInterval = intervals[rootIndex];

  function stackedInterval(offset: number): number {
    const absoluteIndex = rootIndex + offset;
    const octave = Math.floor(absoluteIndex / intervals.length) * 12;
    return intervals[absoluteIndex % intervals.length] + octave - rootInterval;
  }

  return Object.freeze({
    third: scaleStepForInterval(stackedInterval(2)),
    fifth: scaleStepForInterval(stackedInterval(4)),
    seventh: scaleStepForInterval(stackedInterval(6)),
  });
}

function functionForDegree(degree: number | null): ModifierFunction {
  switch (degree) {
    case 1:
      return "tonic";
    case 2:
    case 4:
      return "predominant";
    case 5:
      return "dominant";
    case 7:
      return "leading-tone";
    case 3:
    case 6:
      return "tonic-color";
    case null:
      return "chromatic";
    default:
      return "modal";
  }
}

function hasAny(steps: ReadonlySet<string>, expected: ReadonlySet<string>): boolean {
  for (const step of expected) {
    if (steps.has(step)) return true;
  }
  return false;
}

function coreQualityScore(steps: ReadonlySet<string>, profile: DegreeProfile): number {
  const thirdMatches = steps.has(profile.third);
  const fifthMatches = steps.has(profile.fifth);
  if (thirdMatches && fifthMatches) return 92;
  if (thirdMatches || fifthMatches) return 60;
  return 25;
}

function supertonicQualityFit(
  steps: ReadonlySet<string>,
  profile: DegreeProfile,
): QualityFit {
  const isMinor = steps.has("b3") && steps.has("5");
  const isHalfDiminished = steps.has("b3") && steps.has("b5") && steps.has("b7");
  const isDiminished = steps.has("b3") && steps.has("b5");
  const expectsDiminished = profile.fifth === "b5";

  if (expectsDiminished && isHalfDiminished) {
    return { score: 100, evidence: "half-diminished-supertonic" };
  }
  if (expectsDiminished && isDiminished) {
    return { score: 96, evidence: "diatonic-triad" };
  }
  if (expectsDiminished && isMinor) {
    return { score: 78, evidence: "minor-supertonic" };
  }
  if (!expectsDiminished && isMinor && steps.has(profile.seventh)) {
    return { score: 100, evidence: "minor-supertonic" };
  }
  if (!expectsDiminished && isMinor) {
    return { score: 96, evidence: "minor-supertonic" };
  }
  if (!expectsDiminished && isHalfDiminished) {
    return { score: 65, evidence: "half-diminished-supertonic" };
  }
  return { score: coreQualityScore(steps, profile), evidence: "harmonic-color" };
}

function dominantQualityFit(
  steps: ReadonlySet<string>,
  scaleType: ScaleType,
): QualityFit {
  const hasMajorThird = steps.has("3");
  const hasMinorThird = steps.has("b3");
  const hasFlatSeventh = steps.has("b7");
  const hasAlteration = hasAny(steps, ALTERED_STEPS);
  const hasUpperExtension = hasAny(steps, UPPER_EXTENSION_STEPS);
  const isSuspended = !hasMajorThird && !hasMinorThird && (steps.has("4") || steps.has("2"));

  if (hasMajorThird && hasFlatSeventh && hasAlteration) {
    return { score: 100, evidence: "altered-dominant" };
  }
  if (hasMajorThird && hasFlatSeventh && hasUpperExtension) {
    return { score: 98, evidence: "dominant-extension" };
  }
  if (hasMajorThird && hasFlatSeventh) {
    return { score: 100, evidence: "dominant-seventh" };
  }
  if (isSuspended && hasFlatSeventh) {
    return { score: 90, evidence: "suspended-dominant" };
  }
  if (hasMajorThird) {
    return { score: 86, evidence: "dominant-triad" };
  }
  if (hasMinorThird && scaleType === "natural_minor") {
    return { score: 80, evidence: "diatonic-triad" };
  }
  return { score: 35, evidence: "harmonic-color" };
}

function generalQualityFit(
  steps: ReadonlySet<string>,
  profile: DegreeProfile,
): QualityFit {
  const coreScore = coreQualityScore(steps, profile);
  if (coreScore === 92 && steps.has(profile.seventh)) {
    return { score: 100, evidence: "diatonic-seventh" };
  }
  if (coreScore === 92) {
    return { score: 96, evidence: "diatonic-triad" };
  }
  return { score: coreScore, evidence: "harmonic-color" };
}

function qualityFitFor(
  chord: IndexedChord,
  context: HarmonyContext,
  degree: number | null,
): QualityFit {
  const steps = chordSteps(chord);
  if (degree === null) {
    return { score: 45, evidence: "harmonic-color" };
  }
  const profile = degreeProfile(context, degree);
  if (degree === 2) return supertonicQualityFit(steps, profile);
  if (degree === 5) return dominantQualityFit(steps, context.scaleType);
  return generalQualityFit(steps, profile);
}

function functionFitFor(
  chord: IndexedChord,
  context: HarmonyContext,
  degree: number | null,
): number {
  if (degree === null) return 35;
  const steps = chordSteps(chord);
  const profile = degreeProfile(context, degree);

  if (degree === 5) {
    const hasMajorThird = steps.has("3");
    const hasMinorThird = steps.has("b3");
    const hasFlatSeventh = steps.has("b7");
    const isSuspended = !hasMajorThird && !hasMinorThird && (steps.has("4") || steps.has("2"));
    if (hasMajorThird && hasFlatSeventh) return 100;
    if (isSuspended && hasFlatSeventh) return 92;
    if (hasMajorThird) return 84;
    if (hasMinorThird && context.scaleType === "natural_minor") return 66;
    return 40;
  }

  if (degree === 2) {
    const expectsDiminished = profile.fifth === "b5";
    const isMinor = steps.has("b3") && steps.has("5");
    const isDiminished = steps.has("b3") && steps.has("b5");
    if (expectsDiminished && isDiminished) return 100;
    if (expectsDiminished && isMinor) return 76;
    if (!expectsDiminished && isMinor) return 100;
    if (!expectsDiminished && isDiminished) return 65;
    return 38;
  }

  const thirdMatches = steps.has(profile.third);
  const fifthMatches = steps.has(profile.fifth);
  if (thirdMatches && fifthMatches) return 100;
  if (thirdMatches || fifthMatches) return 62;
  return 30;
}

function complexityPenaltyFor(chord: IndexedChord): number {
  const steps = chordSteps(chord);
  const alterationCount = [...ALTERED_STEPS].filter((step) => steps.has(step)).length;
  const extensionCount = [...UPPER_EXTENSION_STEPS].filter((step) => steps.has(step)).length;
  const extraToneCount = Math.max(0, chordPitchClasses(chord).length - 4);
  return Math.min(10, alterationCount * 2 + extensionCount + extraToneCount);
}

function adjacentVoiceLeading(
  candidate: IndexedChord,
  selectedIndex: number,
  timeline: ReadonlyArray<IndexedChord>,
): Readonly<{ score: number | null; neighborCount: number }> {
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= timeline.length) {
    return { score: null, neighborCount: 0 };
  }
  const scores: number[] = [];
  const previous = timeline[selectedIndex - 1];
  const next = timeline[selectedIndex + 1];
  if (previous) scores.push(scoreVoiceLeadingFit(previous, candidate));
  if (next) scores.push(scoreVoiceLeadingFit(candidate, next));
  if (scores.length === 0) return { score: null, neighborCount: 0 };
  return {
    score: clampScore(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    neighborCount: scores.length,
  };
}

function scaleCoverageData(chord: IndexedChord, context: HarmonyContext): ModifierReasonData {
  const scale = scalePitchClasses(context.key, context.scaleType);
  const tones = chordPitchClasses(chord);
  const matching = tones.filter((pitchClass) => scale.has(pitchClass)).length;
  return Object.freeze({ matching, total: tones.length });
}

function scoreCandidate(
  option: ChordModifierOption,
  context: HarmonyContext,
  selectedIndex: number,
  timeline: ReadonlyArray<IndexedChord>,
): ModifierFit {
  const degree = scaleDegreeOf(option.chord.root, context.key, context.scaleType);
  const harmonicFunction = functionForDegree(degree);
  const scaleCoverage = scoreChordKeyFit(option.chord, context).components.key;
  const functionFit = functionFitFor(option.chord, context, degree);
  const qualityFit = qualityFitFor(option.chord, context, degree);
  const voiceLeading = adjacentVoiceLeading(option.chord, selectedIndex, timeline);
  const complexityPenalty = complexityPenaltyFor(option.chord);

  let weighted = scaleCoverage * 0.32
    + functionFit * 0.28
    + qualityFit.score * 0.25;
  let weight = 0.85;
  if (voiceLeading.score !== null) {
    weighted += voiceLeading.score * 0.15;
    weight += 0.15;
  }
  const score = clampScore(weighted / weight - complexityPenalty);

  const reasons: ModifierReason[] = [
    Object.freeze({
      key: "modifier.reason.scaleCoverage" as const,
      data: scaleCoverageData(option.chord, context),
    }),
    Object.freeze({
      key: "modifier.reason.rootFunction" as const,
      data: Object.freeze({
        degree: degree ?? "outside",
        function: harmonicFunction,
      }),
    }),
    Object.freeze({
      key: "modifier.reason.qualityExtension" as const,
      data: Object.freeze({ evidence: qualityFit.evidence }),
    }),
  ];
  if (voiceLeading.score !== null) {
    reasons.push(Object.freeze({
      key: "modifier.reason.voiceLeading" as const,
      data: Object.freeze({
        score: voiceLeading.score,
        neighbors: voiceLeading.neighborCount,
      }),
    }));
  }
  reasons.push(Object.freeze({
    key: "modifier.reason.complexity" as const,
    data: Object.freeze({ penalty: complexityPenalty }),
  }));

  return Object.freeze({
    score,
    degree,
    function: harmonicFunction,
    components: Object.freeze({
      scaleCoverage,
      functionFit,
      qualityExtensionFit: qualityFit.score,
      voiceLeading: voiceLeading.score,
      complexityPenalty,
    }),
    reasons: Object.freeze(reasons),
  });
}

function stableCandidateOrder(
  genericQuick: ReadonlyArray<ChordModifierOption>,
  all: ReadonlyArray<ChordModifierOption>,
): ReadonlyArray<ChordModifierOption> {
  const seen = new Set<IndexedChord["entry"]>();
  const ordered: ChordModifierOption[] = [];
  for (const option of [...genericQuick, ...all]) {
    if (seen.has(option.chord.entry)) continue;
    seen.add(option.chord.entry);
    ordered.push(option);
  }
  return ordered;
}

function isDictionaryValidOption(
  option: ChordModifierOption,
  selectedChord: IndexedChord,
): boolean {
  const resolved = lookupChord(option.label);
  return resolved?.entry === option.chord.entry && option.chord.root === selectedChord.root;
}

export function rankContextualChordModifiers(
  input: ContextualModifierInput,
): ContextualModifierSet {
  const limit = input.limit ?? 6;
  if (!Number.isInteger(limit) || limit < 1 || limit > 64) {
    throw new RangeError(`Modifier quick limit must be an integer from 1 to 64; received ${limit}`);
  }

  const base = getChordModifierOptions(
    input.selectedChord,
    input.displayName ?? input.selectedChord.displayName,
  );
  if (!isSupportedContext(input.context)) {
    return Object.freeze({
      rootLabel: base.rootLabel,
      contextSupported: false,
      quick: Object.freeze(base.quick.slice(0, limit)),
      all: Object.freeze(base.all),
    });
  }

  const context: HarmonyContext = {
    key: input.context.key,
    scaleType: input.context.scaleType,
  };
  const scored = stableCandidateOrder(base.quick, base.all)
    .filter((option) => isDictionaryValidOption(option, input.selectedChord))
    .map((option, genericIndex) => ({
      ...option,
      fit: scoreCandidate(option, context, input.selectedIndex, input.timeline),
      genericIndex,
    }))
    .sort((left, right) =>
      right.fit.score - left.fit.score || left.genericIndex - right.genericIndex,
    )
    .slice(0, limit)
    .map((option) => Object.freeze({
      label: option.label,
      chord: option.chord,
      fit: option.fit,
    }));

  return Object.freeze({
    rootLabel: base.rootLabel,
    contextSupported: true,
    quick: Object.freeze(scored),
    all: Object.freeze(base.all),
  });
}
