import { lookupChord, parseNotes } from "../chordData";
import type { IndexedChord, ScaleType } from "../types";
import { pitchClassOf, scalePitchClasses } from "./scaleBasics";

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
  basis: "key" | "next";
  components: HarmonicFitComponents;
  reasons: string[];
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
  return Array.from(
    new Set(
      parseNotes(chord.entry)
        .map(pitchClassOf)
        .filter((pitchClass) => pitchClass >= 0),
    ),
  );
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
