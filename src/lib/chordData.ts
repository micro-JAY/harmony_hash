import type { ChordEntry, IndexedChord } from "./types";
import rawChords from "../data/chords_clean.json";

// ─── Note / Root Helpers ─────────────────────────────────────────────

const NOTE_NAMES = ["C", "Cs", "D", "Ds", "E", "F", "Fs", "G", "Gs", "A", "As", "B"] as const;
const FLAT_ROOTS = new Set(["Bb", "Eb", "Ab", "Db", "Gb", "Bf", "Ef", "Af", "Df", "Gf", "As"]);
const INTERNAL_TO_DISPLAY: Record<string, string> = {
  C: "C",
  Cs: "C#",
  D: "D",
  Ds: "D#",
  E: "E",
  F: "F",
  Fs: "F#",
  G: "G",
  Gs: "G#",
  A: "A",
  As: "A#",
  B: "B",
  Cf: "Cb",
  Df: "Db",
  Ef: "Eb",
  Gf: "Gb",
  Af: "Ab",
  Bf: "Bb",
};
const SHARP_TO_FLAT_DISPLAY: Record<string, string> = {
  Cs: "Db",
  Ds: "Eb",
  Fs: "Gb",
  Gs: "Ab",
  As: "Bb",
};
const FLAT_TO_SHARP_DISPLAY: Record<string, string> = {
  Df: "C#",
  Ef: "D#",
  Gf: "F#",
  Af: "G#",
  Bf: "A#",
};

/** Map every common spelling of a root note to the internal canonical form (e.g. "Eb" → "Ef") */
const ROOT_NORMALIZE: Record<string, string> = {};

const CANONICAL_ROOTS = [
  { canon: "C",  alts: ["c"] },
  { canon: "Cs", alts: ["cs", "c#", "C#", "Db", "db", "Df", "df"] },
  { canon: "D",  alts: ["d"] },
  { canon: "Ds", alts: ["ds", "d#", "D#", "Eb", "eb", "Ef", "ef", "E♭"] },
  { canon: "E",  alts: ["e", "Ff", "ff"] },
  { canon: "F",  alts: ["f", "Es", "es", "E#"] },
  { canon: "Fs", alts: ["fs", "f#", "F#", "Gb", "gb", "Gf", "gf"] },
  { canon: "G",  alts: ["g"] },
  { canon: "Gs", alts: ["gs", "g#", "G#", "Ab", "ab", "Af", "af", "A♭"] },
  { canon: "A",  alts: ["a"] },
  { canon: "As", alts: ["as", "a#", "A#", "Bb", "bb", "Bf", "bf", "B♭"] },
  { canon: "B",  alts: ["b", "Cf", "cf"] },
];

for (const { canon, alts } of CANONICAL_ROOTS) {
  ROOT_NORMALIZE[canon] = canon;
  ROOT_NORMALIZE[canon.toLowerCase()] = canon;
  for (const alt of alts) ROOT_NORMALIZE[alt] = canon;
}

/** Normalize any root spelling to canonical form. Returns undefined if unrecognized. */
export function normalizeRoot(raw: string): string | undefined {
  return ROOT_NORMALIZE[raw];
}

/**
 * Parse a user-typed chord string into [root, qualitySuffix].
 * e.g. "Cmaj7" → ["C", "maj7"], "Ebm7" → ["Eb", "m7"], "F#dim" → ["F#", "dim"]
 */
export function splitRootAndQuality(input: string): [string, string] {
  // Internal sharp notation also uses `s` (Cs = C#), but user-facing suspended
  // chords begin with a natural root plus `sus`. Prefer the musical quality in
  // that unambiguous shape; sharp suspended chords use C#sus / Dbsus.
  if (/^[A-Ga-g]sus/.test(input)) {
    return [input.slice(0, 1), input.slice(1)];
  }
  // Try 2-char root first (e.g. "Eb", "F#", "Bb", "C#")
  if (input.length >= 2) {
    const two = input.slice(0, 2);
    if (ROOT_NORMALIZE[two] !== undefined) {
      return [two, input.slice(2)];
    }
  }
  // Single-char root
  const one = input.slice(0, 1);
  if (ROOT_NORMALIZE[one] !== undefined) {
    return [one, input.slice(1)];
  }
  return [input, ""];
}

function normalizeInternalNoteName(raw: string): string {
  const value = raw.trim();
  const match = value.match(/^([A-Ga-g])([#bsf♯♭])?$/);
  if (!match) return value;

  const letter = match[1].toUpperCase();
  const accidental = match[2];
  if (!accidental) return letter;

  if (accidental === "#" || accidental === "♯" || accidental.toLowerCase() === "s") {
    return `${letter}s`;
  }
  if (accidental.toLowerCase() === "b" || accidental === "♭" || accidental.toLowerCase() === "f") {
    return `${letter}f`;
  }
  return letter;
}

export function prefersFlatNotation(root: string): boolean {
  const normalizedRoot = normalizeInternalNoteName(root);
  return FLAT_ROOTS.has(root) || FLAT_ROOTS.has(normalizedRoot);
}

export function formatNoteForDisplay(internalName: string, preferFlats: boolean): string {
  const normalized = normalizeInternalNoteName(internalName);

  if (preferFlats && SHARP_TO_FLAT_DISPLAY[normalized]) {
    return SHARP_TO_FLAT_DISPLAY[normalized];
  }
  if (!preferFlats && FLAT_TO_SHARP_DISPLAY[normalized]) {
    return FLAT_TO_SHARP_DISPLAY[normalized];
  }
  return INTERNAL_TO_DISPLAY[normalized] ?? internalName;
}

// ─── SVG Folder Mapping ──────────────────────────────────────────────

/** Map canonical root to SVG key folder name */
const ROOT_TO_FOLDER: Record<string, string> = {
  C: "c", Cs: "c_sharp-d_flat", D: "d", Ds: "d_sharp-e_flat",
  E: "e", F: "f", Fs: "f_sharp-g_flat", G: "g",
  Gs: "g_sharp-a_flat", A: "a", As: "a_sharp-b_flat", B: "b",
};

/**
 * Map the *first* symbol of each chord entry to its SVG folder name.
 * Built by examining the actual filesystem structure.
 */
const SYMBOL_TO_FOLDER: Record<string, string> = {
  // Major / Minor basics
  "M": "major", "maj": "major",
  "m": "minor", "min": "minor", "-": "minor",
  // Power chord
  "5": "5",
  // 6ths
  "6": "6", "M6": "6", "maj6": "6", "add6": "6",
  "6add9": "6add9", "add6/9": "6add9", "6/9": "6add9",
  // Suspended
  "sus2": "sus2", "sus": "sus4", "sus4": "sus4",
  "sus2sus4": "sus2sus4",
  // Diminished / Augmented
  "dim": "dim", "°": "dim",
  "dim7": "dim7", "o7": "dim7", "7dim": "dim7",
  "aug": "aug", "\"+\"": "aug", "+": "aug",
  // 7ths
  "7": "7",
  "7sus4": "7sus4", "7sus": "7sus4",
  "maj7": "maj7", "M7": "maj7",
  "m7": "m7", "min7": "m7", "-7": "m7",
  "mmaj7": "mmaj7", "min(maj7)": "mmaj7", "-(maj7)": "mmaj7", "mM7": "mmaj7", "m+7": "mmaj7",
  // 7th modifications
  "7b5": "7_flat_5", "7-5": "7_flat_5",
  "7#5": "7_sharp_5", "7maj5": "7_sharp_5", "7+5": "7_sharp_5", "+7": "7_sharp_5",
  "7b9": "7_flat_9", "7-9": "7_flat_9",
  "7#9": "7_sharp_9", "7+9": "7_sharp_9", "7b10": "7_sharp_9",
  "7(b5,b9)": "7_flat_5_flat_9", "7(-5,-9)": "7_flat_5_flat_9",
  "7(b5,#9)": "7_flat_5_sharp_9", "7(-5,+9)": "7_flat_5_sharp_9",
  "7(#5,b9)": "7_sharp_5_flat_9", "7(+5,-9)": "7_sharp_5_flat_9", "+7b9": "7_sharp_5_flat_9",
  "7(#5,#9)": "7_sharp_5_sharp_9", "7(+5,+9)": "7_sharp_5_sharp_9", "+7#9": "7_sharp_5_sharp_9",
  // 9ths
  "9": "9",
  "maj9": "maj9", "M9": "maj9", "maj7(9)": "maj9",
  "m9": "m9", "min9": "m9", "-9": "m9",
  "mmaj9": "mmaj9", "min(maj9)": "mmaj9", "m9(maj7)": "mmaj9", "mM9": "mmaj9",
  "9b5": "9_flat_5", "7(b5,9)": "9_flat_5", "9-5": "9_flat_5",
  "9#5": "9_sharp_5", "7(#5,9)": "9_sharp_5", "9+5": "9_sharp_5", "+9": "9_sharp_5",
  "add9": "add9",
  "m(add9)": "madd9", "m9(no 7th)": "madd9",
  "m6add9": "m6add9", "m6/9": "m6add9", "min6/9": "m6add9", "m(add6,9)": "m6add9", "-6/9": "m6add9",
  "maj9(#11)": "maj9_sharp_11", "maj7(9,#11)": "maj9_sharp_11",
  // 11ths
  "11": "11",
  "maj11": "maj11", "M11": "maj11",
  "m11": "m11", "min11": "m11", "-11": "m11",
  "11b9": "11_flat_9", "7sus4(b9)": "11_flat_9",
  // 13ths
  "13": "13",
  "maj13": "maj13", "M13": "maj13", "maj7(9,13)": "maj13", "maj7(6/9)": "maj13",
  "m13": "m13", "min13": "m13", "-13": "m13",
  "13#11": "13_sharp_11", "13+11": "13_sharp_11", "7(9,#11,13)": "13_sharp_11",
  "13b9": "13_flat_9", "13-9": "13_flat_9", "7(b9,13)": "13_flat_9",
  "maj13(#11)": "maj13_sharp_11", "maj7(13,#11)": "maj13_sharp_11", "maj9(#11,13)": "maj13_sharp_11",
  // Half-diminished / altered minor 7ths
  "m7b5": "m7_flat_5", "m7-5": "m7_flat_5", "ø": "m7_flat_5",
  "m7#5": "m7_sharp_5", "m7+": "m7_sharp_5",
  // 6ths (minor)
  "m6": "m6", "min6": "m6", "m(add6)": "m6", "-6": "m6",
  // Flat 5 (no 7th)
  "-5": "flat_5",
  // Major 7 alterations
  "maj7(b5)": "maj7_flat_5",
  "maj7(#5)": "maj7_sharp_5", "maj7+": "maj7_sharp_5", "+7+5": "maj7_sharp_5",
};

// ─── Index Building ──────────────────────────────────────────────────

const chordEntries: ChordEntry[] = (rawChords as ChordEntry[]).filter(
  (e) => e.Notes && e.Notes.length > 0
);

/**
 * Master chord index: keys are lowercase normalized lookup strings like "cmaj7", "cmin7", "c-7".
 * Values are IndexedChord objects.
 */
const chordIndex = new Map<string, IndexedChord>();

/** All unique root notes found in the data, for iteration */
const ALL_ROOTS = new Set<string>();

function extractRootFromChordName(chordName: string): string {
  // "C (C Major)" → "C", "Cm (C Minor)" → "C", "C#m7 (...)" → "C#"
  const short = chordName.split("(")[0].trim();
  const match = short.match(/^([A-G][#b]?)/);
  if (!match) return "";
  const raw = match[1];
  // Normalize the internal 's'/'f' notation
  return raw.replace("#", "s").replace("b", "f");
}

function splitSymbols(symbols: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < symbols.length; i += 1) {
    const char = symbols[i];
    if (char === "(") depth += 1;
    else if (char === ")") depth = Math.max(0, depth - 1);
    else if (char === "," && depth === 0) {
      const symbol = symbols.slice(start, i).trim();
      if (symbol) result.push(symbol);
      start = i + 1;
    }
  }
  const finalSymbol = symbols.slice(start).trim();
  if (finalSymbol) result.push(finalSymbol);
  return result;
}

function getFirstSymbol(entry: ChordEntry): string {
  return splitSymbols(entry.Symbols)[0] || "";
}

function getAllSymbols(entry: ChordEntry): string[] {
  return splitSymbols(entry.Symbols);
}

function normalizeLookupQuality(quality: string): string {
  return quality.replace(/[()]/g, "");
}

const indexedChordsByRoot = new Map<string, IndexedChord[]>();

// Build the index
for (const entry of chordEntries) {
  const root = extractRootFromChordName(entry["Chord Name"]);
  if (!root) continue;

  ALL_ROOTS.add(root);

  const firstSymbol = getFirstSymbol(entry);
  const folder = SYMBOL_TO_FOLDER[firstSymbol];
  const keyFolder = ROOT_TO_FOLDER[root] || root.toLowerCase();

  const svgBasePath = folder
    ? `/music_src/chords/${keyFolder}/${folder}`
    : "";

  // Short display name: root + first symbol (or just root for major)
  const displayRoot = root.replace("s", "#").replace("f", "b");
  const displayQuality = firstSymbol === "M" || firstSymbol === "maj" ? "" : firstSymbol;
  const displayName = displayRoot + displayQuality;

  const indexed: IndexedChord = {
    entry,
    root,
    quality: firstSymbol,
    displayName,
    svgBasePath,
    variationCount: entry["Variation Count"],
  };

  const rootChords = indexedChordsByRoot.get(root);
  if (rootChords) {
    rootChords.push(indexed);
  } else {
    indexedChordsByRoot.set(root, [indexed]);
  }

  // Register all symbol aliases for this entry
  for (const sym of getAllSymbols(entry)) {
    // Key format: root (lowercased) + symbol (case-preserved).
    // Case matters for quality: "M7" (major 7th) ≠ "m7" (minor 7th)
    const lookupKey = root.toLowerCase() + normalizeLookupQuality(sym);
    // Don't overwrite — first entry wins (avoids collisions from duplicate chord names)
    if (!chordIndex.has(lookupKey)) {
      chordIndex.set(lookupKey, indexed);
    }
  }

  // For major chords, also register bare root
  if (entry.Type === "Major" && (firstSymbol === "M" || firstSymbol === "maj")) {
    const bareKey = root.toLowerCase();
    if (!chordIndex.has(bareKey)) {
      chordIndex.set(bareKey, indexed);
    }
  }
}

// ─── Public API ──────────────────────────────────────────────────────

/**
 * Look up a chord by user-typed string. Handles normalization.
 * Returns the IndexedChord or undefined if not found.
 */
export function lookupChord(input: string): IndexedChord | undefined {
  // Strip parentheses: "E7(#9)" → "E7#9"
  const cleaned = input.replace(/[()]/g, "");

  // Try the dictionary first so quality suffixes that contain "/" (e.g. "6/9",
  // "m6/9", "add6/9") resolve via their registered aliases before we treat
  // "/" as a bass-note separator.
  const [rawRoot, quality] = splitRootAndQuality(cleaned);
  const canonRoot = normalizeRoot(rawRoot);
  if (canonRoot) {
    const lookupKey = canonRoot.toLowerCase() + quality;
    const direct = chordIndex.get(lookupKey);
    if (direct) return direct;
  }

  // Fall through: parse "D/F#" as upper chord + bass note. Single slash only;
  // nested slashes (e.g. "D/F#/A") are rejected.
  const slashIdx = cleaned.indexOf("/");
  if (slashIdx > 0) {
    const upperRaw = cleaned.slice(0, slashIdx);
    const bassRaw = cleaned.slice(slashIdx + 1);
    if (bassRaw.includes("/")) return undefined;
    const upperChord = lookupChord(upperRaw);
    if (!upperChord) return undefined;
    const canonBass = normalizeRoot(bassRaw);
    if (!canonBass) return undefined;
    const displayBass = formatNoteForDisplay(canonBass, prefersFlatNotation(bassRaw));
    return {
      ...upperChord,
      bass: displayBass,
      displayName: `${upperChord.displayName}/${displayBass}`,
    };
  }

  return undefined;
}

/** Get SVG path for a specific variant */
export function getSvgPath(chord: IndexedChord, variant: number): string {
  if (!chord.svgBasePath || chord.variationCount === 0) return "";
  return `${chord.svgBasePath}/var_${variant}.svg`;
}

/** Get all chord entries (for debugging/exploration) */
export function getAllChordEntries(): ChordEntry[] {
  return chordEntries;
}

/** Get each unique catalog chord for one canonical or display root. */
export function getIndexedChordsForRoot(root: string): ReadonlyArray<IndexedChord> {
  const canonicalRoot = normalizeRoot(root) ?? root;
  return indexedChordsByRoot.get(canonicalRoot) ?? [];
}

/** Get the note names array from a chord entry */
export function parseNotes(entry: ChordEntry): string[] {
  return entry.Notes.split("-").filter(Boolean);
}

export { NOTE_NAMES, ROOT_TO_FOLDER, chordIndex, ALL_ROOTS };
