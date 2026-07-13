import { lookupChord } from "../chordData";
import type { IndexedChord, ScaleType } from "../types";
import { pitchClassOf, scaleIntervalsFor, scalePitchClasses } from "./scaleBasics";
import { chordPitchClasses } from "./chordTones";

export interface HarmonyContext {
  key: string;
  scaleType: ScaleType;
}

export type HarmonicFitTier = "strong" | "good" | "color" | "outside";

export interface HarmonicFitComponents {
  key: number;
  voiceLeading: number | null;
  rootMotion: number | null;
}

export interface HarmonicFitResult {
  score: number;
  tier: HarmonicFitTier;
  basis: "key" | "next" | "jazz";
  components: HarmonicFitComponents;
  reasons: string[];
}

export interface JazzHarmonicFitComponents extends HarmonicFitComponents {
  jazzVocabulary: number;
  cadence: number;
}

export interface JazzHarmonicFitResult extends Omit<HarmonicFitResult, "basis" | "components"> {
  basis: "jazz";
  components: JazzHarmonicFitComponents;
}

interface KeyFitDetails {
  score: number;
  matchingTones: number;
  totalTones: number;
}

const ROOT_MOTION_SCORES: Readonly<Record<number, number>> = {
  0: 45,
  1: 55,
  2: 80,
  3: 65,
  4: 65,
  5: 100,
  6: 25,
  7: 100,
  8: 65,
  9: 65,
  10: 80,
  11: 55,
};

const SCALE_TYPE_LABELS: Readonly<Record<ScaleType, string>> = {
  major: "major",
  natural_minor: "natural minor",
  harmonic_minor: "harmonic minor",
  dorian: "Dorian",
  mixolydian: "Mixolydian",
  lydian: "Lydian",
  phrygian: "Phrygian",
};

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

function circularPitchDistance(left: number, right: number): number {
  const distance = Math.abs(left - right);
  return Math.min(distance, 12 - distance);
}

function uniquePitchClasses(chord: IndexedChord): number[] {
  return [...chordPitchClasses(chord)];
}

function keyFitDetails(chord: IndexedChord, context: HarmonyContext): KeyFitDetails {
  const chordPitchClasses = uniquePitchClasses(chord);
  if (chordPitchClasses.length === 0) {
    return { score: 0, matchingTones: 0, totalTones: 0 };
  }

  const scale = scalePitchClasses(context.key, context.scaleType);
  const matchingTones = chordPitchClasses.filter((pitchClass) => scale.has(pitchClass)).length;
  return {
    score: clampScore((matchingTones / chordPitchClasses.length) * 100),
    matchingTones,
    totalTones: chordPitchClasses.length,
  };
}

function rootMotionInterval(previous: IndexedChord, candidate: IndexedChord): number | null {
  const previousRoot = pitchClassOf(previous.root);
  const candidateRoot = pitchClassOf(candidate.root);
  if (previousRoot < 0 || candidateRoot < 0) return null;
  return (candidateRoot - previousRoot + 12) % 12;
}

function rootPitchClass(chord: IndexedChord): number | null {
  const pitchClass = pitchClassOf(chord.root);
  return pitchClass < 0 ? null : pitchClass;
}

function chordSteps(chord: IndexedChord): ReadonlySet<string> {
  return new Set(chord.entry.Steps.split("-").filter(Boolean));
}

function hasDominantFunction(chord: IndexedChord): boolean {
  const steps = chordSteps(chord);
  return steps.has("3") && steps.has("b7");
}

function hasTonicFunction(chord: IndexedChord, context: HarmonyContext): boolean {
  const intervals = scaleIntervalsFor(context.scaleType);
  const steps = chordSteps(chord);
  const tonicThird = intervals[2] === 3 ? "b3" : "3";
  const conflictingThird = tonicThird === "b3" ? "3" : "b3";
  const tonicFifth = intervals[4] === 6
    ? "b5"
    : intervals[4] === 8
      ? "#5"
      : "5";
  const tonicSeventh = intervals[6] === 10 ? "b7" : "7";
  const conflictingSeventh = tonicSeventh === "b7" ? "7" : "b7";

  return steps.has(tonicThird)
    && !steps.has(conflictingThird)
    && steps.has(tonicFifth)
    && !steps.has(conflictingSeventh);
}

function isCompatibleJazzIi(chord: IndexedChord, context: HarmonyContext): boolean {
  const tonic = pitchClassOf(context.key);
  const root = rootPitchClass(chord);
  const intervals = scaleIntervalsFor(context.scaleType);
  const secondDegree = intervals[1];
  const iiThird = intervals[3] - secondDegree;
  const iiFifth = intervals[5] - secondDegree;
  const iiSeventh = 12 - secondDegree;

  // The ii label is reserved for minor or half-diminished scale-degree-two
  // functions. Lydian II7 and Phrygian bIImaj7 are different motions.
  if (tonic < 0 || root !== (tonic + secondDegree) % 12 || iiThird !== 3) {
    return false;
  }

  const steps = chordSteps(chord);
  const expectedFifth = iiFifth === 6 ? "b5" : iiFifth === 8 ? "#5" : "5";
  const expectedSeventh = iiSeventh === 11 ? "7" : "b7";
  return steps.has("b3")
    && steps.has(expectedFifth)
    && steps.has(expectedSeventh);
}

interface JazzCadenceDetails {
  score: number;
  reason: string;
}

function jazzCadenceDetails(
  candidate: IndexedChord,
  context: HarmonyContext,
  history: ReadonlyArray<IndexedChord>,
): JazzCadenceDetails {
  const tonic = pitchClassOf(context.key);
  const candidateRoot = rootPitchClass(candidate);
  if (tonic < 0 || candidateRoot === null) {
    return { score: 35, reason: "open jazz color" };
  }

  const dominantRoot = (tonic + 7) % 12;
  const tritoneSubRoot = (dominantRoot + 6) % 12;
  const previous = history.at(-1);
  const penultimate = history.at(-2);
  const previousRoot = previous ? rootPitchClass(previous) : null;
  const previousIsIi = previous !== undefined && isCompatibleJazzIi(previous, context);
  const penultimateIsIi = penultimate !== undefined
    && isCompatibleJazzIi(penultimate, context);
  const previousIsDominant = previous !== undefined && hasDominantFunction(previous);
  const candidateIsDominant = hasDominantFunction(candidate);
  const candidateIsTonic = candidateRoot === tonic && hasTonicFunction(candidate, context);

  if (
    candidateIsTonic
    && penultimateIsIi
    && previousIsDominant
    && previousRoot === dominantRoot
  ) {
    return { score: 100, reason: "completes ii–V–I" };
  }
  if (
    candidateIsTonic
    && penultimateIsIi
    && previousIsDominant
    && previousRoot === tritoneSubRoot
  ) {
    return { score: 98, reason: "completes ii–subV–I" };
  }
  if (candidateIsTonic && previousIsDominant && previousRoot === dominantRoot) {
    return { score: 100, reason: "dominant resolution" };
  }
  if (candidateIsTonic && previousIsDominant && previousRoot === tritoneSubRoot) {
    return { score: 96, reason: "tritone-sub resolution" };
  }
  if (previousIsIi && candidateIsDominant && candidateRoot === dominantRoot) {
    return { score: 100, reason: "ii–V motion" };
  }
  if (previousIsIi && candidateIsDominant && candidateRoot === tritoneSubRoot) {
    return { score: 92, reason: "tritone-substitute dominant" };
  }
  if (candidateIsDominant && candidateRoot === dominantRoot) {
    return { score: 72, reason: "primary dominant function" };
  }
  if (candidateIsDominant && candidateRoot === tritoneSubRoot) {
    return { score: 68, reason: "tritone-substitute color" };
  }
  if (isCompatibleJazzIi(candidate, context)) {
    return { score: 72, reason: "ii function" };
  }
  if (candidateIsTonic) {
    return { score: 66, reason: "tonic color" };
  }
  return { score: 35, reason: "open jazz color" };
}

function rootMotionReason(interval: number): string {
  if (interval === 5 || interval === 7) return "fifth motion";
  if (interval === 2 || interval === 10) return "stepwise root motion";
  if ([3, 4, 8, 9].includes(interval)) return "third motion";
  if (interval === 1 || interval === 11) return "chromatic root motion";
  if (interval === 0) return "same-root color";
  return "tritone root motion";
}

function voiceLeadingReason(score: number): string {
  if (score >= 85) return "smooth voice leading";
  if (score >= 65) return "connected voice leading";
  return "wider voice-leading motion";
}

export function harmonicFitTier(score: number): HarmonicFitTier {
  const bounded = clampScore(score);
  if (bounded >= 85) return "strong";
  if (bounded >= 70) return "good";
  if (bounded >= 50) return "color";
  return "outside";
}

export function scoreChordKeyFit(chord: IndexedChord, context: HarmonyContext): HarmonicFitResult {
  const details = keyFitDetails(chord, context);
  const scaleLabel = SCALE_TYPE_LABELS[context.scaleType];
  const toneReason = details.totalTones > 0
    ? `${details.matchingTones}/${details.totalTones} tones in ${context.key} ${scaleLabel}`
    : "No catalog chord tones available";

  return {
    score: details.score,
    tier: harmonicFitTier(details.score),
    basis: "key",
    components: {
      key: details.score,
      voiceLeading: null,
      rootMotion: null,
    },
    reasons: [toneReason],
  };
}

export function scoreVoiceLeadingFit(
  previous: IndexedChord,
  candidate: IndexedChord,
): number {
  const previousPitchClasses = uniquePitchClasses(previous);
  const candidatePitchClasses = uniquePitchClasses(candidate);
  if (previousPitchClasses.length === 0 || candidatePitchClasses.length === 0) return 0;

  const totalDistance = candidatePitchClasses.reduce((sum, candidatePitchClass) => {
    const nearestDistance = Math.min(
      ...previousPitchClasses.map((previousPitchClass) =>
        circularPitchDistance(previousPitchClass, candidatePitchClass),
      ),
    );
    return sum + nearestDistance;
  }, 0);
  const averageDistance = totalDistance / candidatePitchClasses.length;
  return clampScore(100 - averageDistance * 24);
}

export function scoreRootMotionFit(
  previous: IndexedChord,
  candidate: IndexedChord,
): number {
  const interval = rootMotionInterval(previous, candidate);
  return interval === null ? 0 : ROOT_MOTION_SCORES[interval] ?? 0;
}

export function scoreJazzVocabularyFit(chord: IndexedChord): number {
  const steps = chordSteps(chord);
  const toneCount = uniquePitchClasses(chord).length;
  const hasAlteration = ["b5", "#5", "b9", "#9", "#11", "b13"]
    .some((step) => steps.has(step));
  const hasUpperExtension = ["9", "11", "13", "b9", "#9", "#11", "b13"]
    .some((step) => steps.has(step));
  const halfDiminished = steps.has("b3") && steps.has("b5") && steps.has("b7");
  const diminishedSeventh = steps.has("b3") && steps.has("b5") && steps.has("6");
  const hasSeventhOrSixth = ["6", "7", "b7"].some((step) => steps.has(step));

  if (hasDominantFunction(chord) && hasAlteration) return 100;
  if (hasUpperExtension || toneCount >= 5) return 96;
  if (halfDiminished || diminishedSeventh) return 94;
  if (hasSeventhOrSixth || toneCount >= 4) return 90;
  if (toneCount === 3) return 58;
  return 35;
}

export function scoreJazzChordFit(
  candidate: IndexedChord,
  context: HarmonyContext,
  history: ReadonlyArray<IndexedChord> = [],
): JazzHarmonicFitResult {
  const keyResult = scoreChordKeyFit(candidate, context);
  const previous = history.at(-1);
  const jazzVocabulary = scoreJazzVocabularyFit(candidate);
  const cadence = jazzCadenceDetails(candidate, context, history);
  const voiceLeading = previous ? scoreVoiceLeadingFit(previous, candidate) : null;
  const rootMotion = previous ? scoreRootMotionFit(previous, candidate) : null;
  const score = previous
    ? clampScore(
      keyResult.components.key * 0.25
      + (voiceLeading ?? 0) * 0.25
      + (rootMotion ?? 0) * 0.1
      + jazzVocabulary * 0.2
      + cadence.score * 0.2,
    )
    : clampScore(
      keyResult.components.key * 0.45
      + jazzVocabulary * 0.35
      + cadence.score * 0.2,
    );

  return {
    score,
    tier: harmonicFitTier(score),
    basis: "jazz",
    components: {
      key: keyResult.components.key,
      voiceLeading,
      rootMotion,
      jazzVocabulary,
      cadence: cadence.score,
    },
    reasons: [
      keyResult.reasons[0],
      `jazz vocabulary ${jazzVocabulary}%`,
      ...(voiceLeading === null ? [] : [voiceLeadingReason(voiceLeading)]),
      cadence.reason,
    ],
  };
}

export function scoreNextChordFit(
  candidate: IndexedChord,
  context: HarmonyContext,
  previous?: IndexedChord,
): HarmonicFitResult {
  const keyResult = scoreChordKeyFit(candidate, context);
  if (!previous) {
    return {
      ...keyResult,
      reasons: [...keyResult.reasons, "Add a chord to rank what follows"],
    };
  }

  const voiceLeading = scoreVoiceLeadingFit(previous, candidate);
  const rootMotion = scoreRootMotionFit(previous, candidate);
  const interval = rootMotionInterval(previous, candidate);
  const score = clampScore(
    keyResult.components.key * 0.55 + voiceLeading * 0.3 + rootMotion * 0.15,
  );
  const dominantResolution = previous.entry.Type === "Dominant" && interval === 5;

  return {
    score,
    tier: harmonicFitTier(score),
    basis: "next",
    components: {
      key: keyResult.components.key,
      voiceLeading,
      rootMotion,
    },
    reasons: [
      keyResult.reasons[0],
      voiceLeadingReason(voiceLeading),
      dominantResolution ? "dominant resolution" : rootMotionReason(interval ?? 6),
    ],
  };
}

export function findLastResolvedChord(inputValue: string): IndexedChord | undefined {
  const tokens = inputValue.trim().split(/\s+/).filter(Boolean);
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const chord = lookupChord(tokens[index]);
    if (chord) return chord;
  }
  return undefined;
}
