import type { ChordEntry, IndexedChord } from "../types";

export type ChordFamily =
  | "suspended"
  | "diminished"
  | "dominant"
  | "augmented"
  | "minor"
  | "major";

type IndexedChordVisualSource = Pick<IndexedChord, "entry">
  & Partial<Pick<IndexedChord, "displayName" | "quality">>;
type ChordEntryVisualSource = Pick<ChordEntry, "Chord Name" | "Symbols" | "Type">;
export type ChordFamilySource = string | IndexedChordVisualSource | ChordEntryVisualSource;

export const CHORD_FAMILY_COLOR_TOKENS: Readonly<Record<ChordFamily, string>> = Object.freeze({
  suspended: "var(--music-chord-sus)",
  diminished: "var(--music-chord-diminished)",
  dominant: "var(--music-chord-dominant)",
  augmented: "var(--music-chord-augmented)",
  minor: "var(--music-chord-minor)",
  major: "var(--music-chord-major)",
});

function isIndexedChordSource(source: ChordFamilySource): source is IndexedChordVisualSource {
  return typeof source !== "string" && "entry" in source;
}

function chordTextAndType(source: ChordFamilySource): {
  text: string;
  type: ChordEntry["Type"] | undefined;
} {
  if (typeof source === "string") return { text: source, type: undefined };

  if (isIndexedChordSource(source)) {
    return {
      // Symbols is a comma-separated alias catalog (for example "M, maj").
      // Including every alias makes a major chord look minor because the lone
      // "M" alias normalizes to "m". The matched quality and display name are
      // the structural source of truth for an IndexedChord.
      text: [source.quality, source.displayName, source.entry["Chord Name"]]
        .filter(Boolean)
        .join(" "),
      type: source.entry.Type,
    };
  }

  return {
    text: source["Chord Name"],
    type: source.Type,
  };
}

/**
 * Classifies by audible structure, not the dictionary's broad Type bucket.
 * The ordering is intentional: e.g. 7sus4 is suspended, dim7 is diminished,
 * and 7#5 is dominant before its augmented alteration is considered.
 */
export function classifyChordFamily(source: ChordFamilySource): ChordFamily {
  const { text, type } = chordTextAndType(source);
  const normalized = text.toLowerCase().replaceAll("♭", "b").replaceAll("♯", "#");

  if (/sus/.test(normalized)) return "suspended";
  if (/dim|diminished|°|ø|m7b5|m7-5|half[- ]?dim/.test(normalized)) return "diminished";
  if (
    type === "Dominant"
    || /(?:^|\s|[a-g](?:#|b|s|f)?)(?:(?:7|9|11|13)(?:\b|[#b+(])|\+(?:7|9))/.test(normalized)
  ) return "dominant";
  if (/aug|augmented|\+|#5/.test(normalized)) return "augmented";
  if (type === "Minor" || /(?:^|\s|[a-g](?:#|b|s|f)?)(?:m(?!aj)|min|-)/.test(normalized)) {
    return "minor";
  }
  if (type === "Sustained") return "suspended";
  return "major";
}

export function chordFamilyColor(source: ChordFamilySource | ChordFamily): string {
  const family = typeof source === "string" && source in CHORD_FAMILY_COLOR_TOKENS
    ? source as ChordFamily
    : classifyChordFamily(source as ChordFamilySource);
  return CHORD_FAMILY_COLOR_TOKENS[family];
}
