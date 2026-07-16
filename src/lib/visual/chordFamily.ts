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

export interface ChordFamilyPresentation {
  readonly family: ChordFamily;
  readonly color: string;
  readonly backgroundColor: string;
  readonly borderColor: string;
}

function isIndexedChordSource(source: ChordFamilySource): source is IndexedChordVisualSource {
  return typeof source !== "string" && "entry" in source;
}

function qualityFromDisplaySymbol(symbol: string): string {
  const identity = symbol.trim().replaceAll("♭", "b").replaceAll("♯", "#");
  const rootMatch = identity.match(/^[A-G](?:#|b|s|f)?(.*)$/);
  if (!rootMatch) return identity;
  const quality = rootMatch[1] ?? "";
  return /^\/[A-G](?:#|b)?$/.test(quality) ? "" : quality;
}

function chordTextAndType(source: ChordFamilySource): {
  text: string;
  type: ChordEntry["Type"] | undefined;
} {
  if (typeof source === "string") {
    return { text: qualityFromDisplaySymbol(source), type: undefined };
  }

  if (isIndexedChordSource(source)) {
    return {
      // An empty quality is the canonical major triad, so preserve it rather
      // than falling through to the dictionary's prose description.
      text: source.quality !== undefined
        ? source.quality
        : source.displayName ?? source.entry.Symbols.split(",")[0] ?? "",
      type: source.entry.Type,
    };
  }

  return {
    // The first alias is the entry's canonical quality. Reading the full alias
    // catalogue makes uppercase "M" major aliases look like lowercase minor.
    text: source.Symbols.split(",")[0]?.trim() ?? source["Chord Name"],
    type: source.Type,
  };
}

function isMinorQuality(identity: string): boolean {
  if (/^m(?!aj)/.test(identity) || /^min/i.test(identity)) return true;
  // The dictionary's `-5` symbol is a Major chord with a lowered fifth, not a
  // minor alias. Other leading-minus symbols are established minor aliases.
  return identity.startsWith("-") && !/^-5(?:$|[(/])/.test(identity);
}

function isDominantQuality(identity: string): boolean {
  const normalized = identity.toLowerCase();
  return /^(?:7|9|11|13)(?:$|[#b+(-])/.test(normalized)
    || /^\+(?:7|9|11|13)(?:$|[#b+(-])/.test(normalized);
}

/**
 * Classifies by audible structure, not the dictionary's broad Type bucket.
 * The ordering is intentional: e.g. 7sus4 is suspended, dim7 is diminished,
 * and 7#5 is dominant before its augmented alteration is considered.
 */
export function classifyChordFamily(source: ChordFamilySource): ChordFamily {
  const { text, type } = chordTextAndType(source);
  const identity = text.trim().replaceAll("♭", "b").replaceAll("♯", "#");
  const normalized = identity.toLowerCase();

  if (/sus/.test(normalized)) return "suspended";
  if (/dim|diminished|°|ø|m7b5|m7-5|half[- ]?dim/.test(normalized)) return "diminished";
  if (type === "Dominant" || isDominantQuality(identity)) return "dominant";
  if (/aug|augmented|\+|#5/.test(normalized)) return "augmented";
  if (type === "Minor" || isMinorQuality(identity)) return "minor";
  if (type === "Sustained") return "suspended";
  if (type === "Major") return "major";

  return "major";
}

export function chordFamilyColor(source: ChordFamilySource | ChordFamily): string {
  const family = typeof source === "string" && source in CHORD_FAMILY_COLOR_TOKENS
    ? source as ChordFamily
    : classifyChordFamily(source as ChordFamilySource);
  return CHORD_FAMILY_COLOR_TOKENS[family];
}

/**
 * Presentation for compact family labels on dark Harmony Hash surfaces.
 * Dominant is intentionally the one saturated/deep family: it therefore uses
 * a filled chip with contrast-safe text instead of low-contrast red text.
 */
export function chordFamilyPresentation(
  source: ChordFamilySource | ChordFamily,
): ChordFamilyPresentation {
  const family = typeof source === "string" && source in CHORD_FAMILY_COLOR_TOKENS
    ? source as ChordFamily
    : classifyChordFamily(source as ChordFamilySource);
  const familyColor = CHORD_FAMILY_COLOR_TOKENS[family];

  if (family === "dominant") {
    return {
      family,
      color: "var(--music-chord-on-dominant)",
      backgroundColor: familyColor,
      borderColor: familyColor,
    };
  }

  return {
    family,
    color: familyColor,
    backgroundColor: `color-mix(in srgb, ${familyColor} 9%, var(--surface-raised))`,
    borderColor: `color-mix(in srgb, ${familyColor} 42%, var(--border-default))`,
  };
}
