import { prefersFlatNotation, splitRootAndQuality } from "../chordData";
import type { IndexedChord } from "../types";
import {
  rankCompatibleScales,
  type ScaleSuggestion,
} from "../theory/improvInsight";
import { pitchClassOf, scalePitchClasses } from "../theory/scaleBasics";

export const DISCOVERY_SCALE_RECOMMENDATION_LIMIT = 6;

export interface DiscoveryProgressionChord {
  readonly input: string;
  readonly chord: IndexedChord;
}

export interface DiscoveryScaleMembership {
  readonly label: string;
  readonly rootPitchClass: number;
  readonly pitchClasses: ReadonlySet<number>;
  readonly noteLabels: ReadonlyMap<number, string>;
}

export function discoveryScaleSuggestionId(
  suggestion: Pick<ScaleSuggestion, "key" | "scaleType">,
): string {
  return `${suggestion.key}:${suggestion.scaleType}`;
}

export function rankDiscoveryScaleSuggestions(
  progressionChords: ReadonlyArray<DiscoveryProgressionChord>,
): ReadonlyArray<ScaleSuggestion> {
  if (progressionChords.length === 0) return Object.freeze([]);

  const preferFlats = progressionChords.some((item) => {
    const [root] = splitRootAndQuality(item.input.trim());
    return prefersFlatNotation(root);
  });

  return rankCompatibleScales(
    progressionChords.map((item) => item.chord),
    DISCOVERY_SCALE_RECOMMENDATION_LIMIT,
    { preferFlats },
  );
}

export function resolveDiscoveryScaleSelection(
  suggestions: ReadonlyArray<ScaleSuggestion>,
  requestedId: string | null,
): ScaleSuggestion | null {
  if (suggestions.length === 0) return null;
  return suggestions.find((suggestion) => discoveryScaleSuggestionId(suggestion) === requestedId)
    ?? suggestions[0];
}

export function buildDiscoveryScaleMembership(
  suggestion: ScaleSuggestion,
): DiscoveryScaleMembership {
  const noteLabels = new Map<number, string>();
  for (const note of suggestion.notes) {
    const pitchClass = pitchClassOf(note);
    if (pitchClass >= 0) noteLabels.set(pitchClass, note);
  }

  return Object.freeze({
    label: suggestion.label,
    rootPitchClass: pitchClassOf(suggestion.key),
    pitchClasses: scalePitchClasses(suggestion.key, suggestion.scaleType),
    noteLabels,
  });
}
