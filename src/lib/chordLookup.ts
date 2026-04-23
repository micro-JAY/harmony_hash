import { lookupChord, splitRootAndQuality, normalizeRoot } from "./chordData";

export interface ChordLookupResult {
  valid: boolean;
  chord_name: string;
  suggestion?: string;
}

export function lookupChordForAgent(chordName: string): ChordLookupResult {
  const trimmed = typeof chordName === "string" ? chordName.trim() : "";
  if (!trimmed) {
    return { valid: false, chord_name: String(chordName ?? "") };
  }

  if (lookupChord(trimmed)) {
    return { valid: true, chord_name: trimmed };
  }

  const suggestion = findSuggestion(trimmed);
  if (suggestion) {
    return { valid: false, chord_name: trimmed, suggestion };
  }

  return { valid: false, chord_name: trimmed };
}

function findSuggestion(chordName: string): string | undefined {
  const cleaned = chordName.replace(/[()]/g, "");
  const [rawRoot, quality] = splitRootAndQuality(cleaned);
  const canonRoot = normalizeRoot(rawRoot);
  if (!canonRoot) return undefined;

  const displayRoot = rawRoot;

  for (let i = quality.length - 1; i >= 0; i--) {
    const candidate = displayRoot + quality.slice(0, i);
    if (candidate === chordName) continue;
    if (lookupChord(candidate)) return candidate;
  }

  if (lookupChord(displayRoot)) return displayRoot;

  return undefined;
}
