import type { ChordEntry, IndexedChord } from "./types";
import {
  getIndexedChordsForRoot,
  lookupChord,
  splitRootAndQuality,
} from "./chordData";

export interface ChordModifierOption {
  label: string;
  chord: IndexedChord;
}

export interface ChordModifierSet {
  rootLabel: string;
  quick: ChordModifierOption[];
  all: ChordModifierOption[];
}

const QUICK_QUALITIES: Record<ChordEntry["Type"], ReadonlyArray<string>> = {
  Major: ["maj7", "6", "add9", "6add9", "maj9", "maj13"],
  Minor: ["m7", "m6", "m(add9)", "m9", "m11", "m13"],
  Dominant: ["9", "7#9", "7b9", "13", "7#5", "7b5"],
  Sustained: ["sus2", "sus", "7sus4", "sus2sus4", "11", "11b9"],
  Other: ["dim7", "m7b5", "aug", "5", "sus2", "sus"],
};

const TYPE_ORDER: ReadonlyArray<ChordEntry["Type"]> = [
  "Major",
  "Minor",
  "Dominant",
  "Sustained",
  "Other",
];

function extractDisplayRoot(chordName: string): string {
  const match = chordName.trim().match(/^([A-Ga-g](?:#|b|♯|♭)?)/);
  return match ? match[1].replace("♯", "#").replace("♭", "b") : "";
}

function optionForCandidate(
  candidate: IndexedChord,
  displayRoot: string,
  bass: string | undefined,
): ChordModifierOption | null {
  const [, quality] = splitRootAndQuality(candidate.displayName);
  const label = `${displayRoot}${quality}${bass ? `/${bass}` : ""}`;
  const resolved = lookupChord(label);
  if (!resolved || resolved.entry !== candidate.entry) return null;
  return { label, chord: resolved };
}

function compareAllOptions(a: ChordModifierOption, b: ChordModifierOption): number {
  const typeDifference =
    TYPE_ORDER.indexOf(a.chord.entry.Type) - TYPE_ORDER.indexOf(b.chord.entry.Type);
  if (typeDifference !== 0) return typeDifference;
  return a.label.localeCompare(b.label, "en", { numeric: true, sensitivity: "base" });
}

export function getChordModifierOptions(
  chord: IndexedChord,
  currentDisplayName: string,
): ChordModifierSet {
  const rootLabel = extractDisplayRoot(currentDisplayName) || extractDisplayRoot(chord.displayName);
  const all = getIndexedChordsForRoot(chord.root)
    .filter((candidate) => candidate.entry !== chord.entry)
    .map((candidate) => optionForCandidate(candidate, rootLabel, chord.bass))
    .filter((option): option is ChordModifierOption => option !== null)
    .sort(compareAllOptions);

  const quickByQuality = new Map(all.map((option) => [option.chord.quality, option]));
  const quick = QUICK_QUALITIES[chord.entry.Type]
    .map((quality) => quickByQuality.get(quality))
    .filter((option): option is ChordModifierOption => option !== undefined)
    .slice(0, 6);

  return { rootLabel, quick, all };
}
