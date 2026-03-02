import type {
  ParseResult,
  ResolvedChord,
  ParseError,
  VoicedChord,
  VoicedNote,
  PresetProgression,
  ScaleType,
} from "./types";
import { lookupChord, normalizeRoot, NOTE_NAMES } from "./chordData";

// ─── 3.1 / 3.2: Chord Symbol Parser ─────────────────────────────────

/**
 * Parse a space-separated chord input string into resolved chords.
 * Handles parenthetical stripping, alias normalization, and error collection.
 */
export function parseChordInput(input: string): ParseResult {
  const tokens = input.trim().split(/\s+/).filter(Boolean);
  const chords: ResolvedChord[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const chord = lookupChord(token);

    if (chord) {
      chords.push({ index: i, input: token, chord });
    } else {
      errors.push({ index: i, input: token, message: `Unrecognized chord: "${token}"` });
    }
  }

  return { chords, errors };
}

// ─── 3.6: Note-to-Pitch-Class Mapping ───────────────────────────────

/** Map internal note name (e.g. "C", "Ef", "Gs") to pitch class 0-11 */
const NOTE_TO_PITCH: Record<string, number> = {};
for (let i = 0; i < NOTE_NAMES.length; i++) {
  NOTE_TO_PITCH[NOTE_NAMES[i]] = i;
}
// Also handle common alternate forms for robustness
NOTE_TO_PITCH["Df"] = 1;  // same as Cs
NOTE_TO_PITCH["Ef"] = 3;  // same as Ds
NOTE_TO_PITCH["Gf"] = 6;  // same as Fs
NOTE_TO_PITCH["Af"] = 8;  // same as Gs
NOTE_TO_PITCH["Bf"] = 10; // same as As

export function noteToPitchClass(note: string): number {
  const pc = NOTE_TO_PITCH[note];
  return pc !== undefined ? pc : -1;
}

// ─── 3.5: Drop 2 Voicing Engine ─────────────────────────────────────

/**
 * Compute a voiced chord from raw note names.
 * - Triads: root position starting at C4
 * - 4+ note chords: Drop 2 voicing (2nd-highest note drops one octave)
 */
export function computeVoicing(noteNames: string[]): VoicedChord {
  if (noteNames.length === 0) {
    return { notes: [], voicingType: "root" };
  }

  const pitchClasses = noteNames.map((n) => noteToPitchClass(n));

  if (noteNames.length <= 3) {
    // Triads: root position, all in octave 4
    const notes: VoicedNote[] = noteNames.map((name, i) => {
      const pc = pitchClasses[i];
      // If a note is lower than the root in pitch class, bump it up
      const octave = pc < pitchClasses[0] ? 5 : 4;
      return {
        name,
        pitchClass: pc,
        octave,
        midi: pc + (octave + 1) * 12,
        hand: "right" as const,
      };
    });
    return { notes, voicingType: "root" };
  }

  // 4+ notes: Drop 2 voicing
  // Start with closed voicing in octave 4 (ascending from root)
  const closed: VoicedNote[] = [];

  for (let i = 0; i < noteNames.length; i++) {
    const pc = pitchClasses[i];
    // Ensure ascending order from root
    let octave = 4;
    if (i > 0) {
      // If this pc is <= the previous note's effective pitch, bump octave
      const prevMidi = closed[i - 1].midi;
      let midi = pc + (octave + 1) * 12;
      while (midi <= prevMidi) {
        octave++;
        midi = pc + (octave + 1) * 12;
      }
    }
    closed.push({
      name: noteNames[i],
      pitchClass: pc,
      octave,
      midi: pc + (octave + 1) * 12,
      hand: "right",
    });
  }

  // Drop 2: take the 2nd-highest note and drop it down an octave
  // For extended chords (5+ notes), apply Drop 2 to first 4 notes only
  const dropIndex = Math.min(noteNames.length, 4) - 2; // 2nd from top of first 4
  const droppedNote = { ...closed[dropIndex] };
  droppedNote.octave -= 1;
  droppedNote.midi = droppedNote.pitchClass + (droppedNote.octave + 1) * 12;
  droppedNote.hand = "left";

  // Build final voicing: dropped note first (lowest), then remaining in order
  const remaining = closed.filter((_, i) => i !== dropIndex);
  remaining.forEach((n) => (n.hand = "right"));

  const notes = [droppedNote, ...remaining].sort((a, b) => a.midi - b.midi);

  return { notes, voicingType: "drop2" };
}

// ─── 3.3 / 3.4: Roman Numeral Parser & Transposition ────────────────

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]; // W-W-H-W-W-W-H
const NATURAL_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];
const HARMONIC_MINOR_SCALE = [0, 2, 3, 5, 7, 8, 11];
const DORIAN_SCALE = [0, 2, 3, 5, 7, 9, 10];
const MIXOLYDIAN_SCALE = [0, 2, 4, 5, 7, 9, 10];
const LYDIAN_SCALE = [0, 2, 4, 6, 7, 9, 11];
const PHRYGIAN_SCALE = [0, 1, 3, 5, 7, 8, 10];

const SCALE_MAP: Record<ScaleType, number[]> = {
  major: MAJOR_SCALE,
  natural_minor: NATURAL_MINOR_SCALE,
  harmonic_minor: HARMONIC_MINOR_SCALE,
  dorian: DORIAN_SCALE,
  mixolydian: MIXOLYDIAN_SCALE,
  lydian: LYDIAN_SCALE,
  phrygian: PHRYGIAN_SCALE,
};

// Major scale chord qualities by degree (1-indexed): I ii iii IV V vi vii°
const MAJOR_QUALITIES = ["", "m", "m", "", "", "m", "dim"];
// Natural minor: i ii° III iv v VI VII
const MINOR_QUALITIES = ["m", "dim", "", "m", "m", "", ""];
// Harmonic minor: i ii° III+ iv V VI vii°
const HARMONIC_MINOR_QUALITIES = ["m", "dim", "aug", "m", "", "", "dim"];

const QUALITY_MAP: Record<ScaleType, string[]> = {
  major: MAJOR_QUALITIES,
  natural_minor: MINOR_QUALITIES,
  harmonic_minor: HARMONIC_MINOR_QUALITIES,
  dorian: ["m", "m", "", "", "m", "dim", ""],
  mixolydian: ["", "m", "dim", "", "m", "m", ""],
  lydian: ["", "", "m", "dim", "", "m", "m"],
  phrygian: ["m", "", "", "m", "dim", "", "m"],
};

const NUMERAL_MAP: Record<string, number> = {
  I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6,
  i: 0, ii: 1, iii: 2, iv: 3, v: 4, vi: 5, vii: 6,
};

const NOTE_DISPLAY = ["C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
// Sharp keys prefer sharps
const NOTE_DISPLAY_SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// Keys that prefer sharp notation
const SHARP_KEYS = new Set(["C", "G", "D", "A", "E", "B", "Fs", "Cs"]);

interface ParsedNumeral {
  degree: number;      // 0-6
  isMinor: boolean;    // lowercase numeral
  accidental: number;  // -1 for flat, +1 for sharp, 0 for natural
  suffix: string;      // e.g. "°", "m", nothing (from the numeral itself)
  extraSuffix: string; // anything after the numeral e.g. "" or custom quality
}

/**
 * Parse a roman numeral string like "bVII", "ii°", "IV", "im"
 */
function parseNumeral(numeral: string): ParsedNumeral | null {
  let remaining = numeral;
  let accidental = 0;

  // Check for leading accidental
  if (remaining.startsWith("b") || remaining.startsWith("♭")) {
    accidental = -1;
    remaining = remaining.slice(1);
  } else if (remaining.startsWith("#") || remaining.startsWith("♯")) {
    accidental = 1;
    remaining = remaining.slice(1);
  }

  // Extract the roman numeral part
  const numeralMatch = remaining.match(/^(VII|VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/);
  if (!numeralMatch) return null;

  const numeralStr = numeralMatch[1];
  remaining = remaining.slice(numeralStr.length);

  const isMinor = numeralStr === numeralStr.toLowerCase();
  const degree = NUMERAL_MAP[numeralStr];
  if (degree === undefined) return null;

  // Check for suffix modifiers
  let suffix = "";
  if (remaining.startsWith("°") || remaining.startsWith("dim")) {
    suffix = "dim";
    remaining = remaining.replace(/^(°|dim)/, "");
  } else if (remaining.startsWith("+") || remaining.startsWith("aug")) {
    suffix = "aug";
    remaining = remaining.replace(/^(\+|aug)/, "");
  }

  return {
    degree,
    isMinor,
    accidental,
    suffix,
    extraSuffix: remaining,
  };
}

/**
 * Transpose a roman numeral progression to concrete chord names in a given key.
 */
export function transposeProgression(
  numerals: string[],
  key: string,
  scaleType: ScaleType
): string[] {
  const canonKey = normalizeRoot(key);
  if (!canonKey) return numerals; // fallback: return as-is

  const keyPc = NOTE_NAMES.indexOf(canonKey as typeof NOTE_NAMES[number]);
  const scale = SCALE_MAP[scaleType];
  const defaultQualities = QUALITY_MAP[scaleType];
  const useSharp = SHARP_KEYS.has(canonKey);
  const noteDisplay = useSharp ? NOTE_DISPLAY_SHARP : NOTE_DISPLAY;

  return numerals.map((numeral) => {
    const parsed = parseNumeral(numeral);
    if (!parsed) return numeral; // unparseable, return raw

    const { degree, isMinor, accidental, suffix, extraSuffix } = parsed;

    // Get the scale degree's pitch class
    const scalePc = scale[degree] + accidental;
    const chordRootPc = ((keyPc + scalePc) % 12 + 12) % 12;
    const rootName = noteDisplay[chordRootPc];

    // Determine chord quality
    let quality: string;
    if (suffix) {
      // Explicit suffix from the numeral (e.g. ii° → dim)
      quality = suffix;
    } else if (isMinor) {
      quality = "m";
    } else {
      // Use the default quality from scale unless the numeral case disagrees
      const defaultQ = defaultQualities[degree];
      // If numeral is uppercase, it's major (no suffix or the scale default if major)
      // If scale says "m" but numeral is uppercase, override to major
      quality = defaultQ === "m" ? "" : defaultQ;
    }

    return rootName + quality + extraSuffix;
  });
}

// ─── Preset Progressions ─────────────────────────────────────────────

export const PRESET_PROGRESSIONS: PresetProgression[] = [
  // Major
  { name: "I V vi IV", numerals: ["I", "V", "vi", "IV"], category: "Major", scaleType: "major" },
  { name: "ii V I", numerals: ["ii", "V", "I"], category: "Major", scaleType: "major" },
  { name: "I IV V", numerals: ["I", "IV", "V"], category: "Major", scaleType: "major" },
  { name: "I IV ii V", numerals: ["I", "IV", "ii", "V"], category: "Major", scaleType: "major" },
  { name: "I iii IV V", numerals: ["I", "iii", "IV", "V"], category: "Major", scaleType: "major" },

  // Natural Minor (Aeolian)
  { name: "i VI VII", numerals: ["i", "VI", "VII"], category: "Natural Minor (Aeolian)", scaleType: "natural_minor" },
  { name: "i iv v", numerals: ["i", "iv", "v"], category: "Natural Minor (Aeolian)", scaleType: "natural_minor" },
  { name: "i VII VI VII", numerals: ["i", "VII", "VI", "VII"], category: "Natural Minor (Aeolian)", scaleType: "natural_minor" },

  // Harmonic Minor
  { name: "i V", numerals: ["i", "V"], category: "Harmonic Minor", scaleType: "harmonic_minor" },
  { name: "ii° V i", numerals: ["ii°", "V", "i"], category: "Harmonic Minor", scaleType: "harmonic_minor" },
  { name: "i iv V i", numerals: ["i", "iv", "V", "i"], category: "Harmonic Minor", scaleType: "harmonic_minor" },

  // Modal
  { name: "im IV (Dorian)", numerals: ["i", "IV"], category: "Modal", scaleType: "dorian" },
  { name: "I bVII IV (Mixolydian)", numerals: ["I", "bVII", "IV"], category: "Modal", scaleType: "mixolydian" },
  { name: "I II (Lydian)", numerals: ["I", "II"], category: "Modal", scaleType: "lydian" },
  { name: "i bVII bVI bVII (Phrygian)", numerals: ["i", "bVII", "bVI", "bVII"], category: "Modal", scaleType: "phrygian" },
];

/** All 12 chromatic keys for the key selector */
export const ALL_KEYS = [
  { label: "C", value: "C" },
  { label: "C# / Db", value: "C#" },
  { label: "D", value: "D" },
  { label: "D# / Eb", value: "Eb" },
  { label: "E", value: "E" },
  { label: "F", value: "F" },
  { label: "F# / Gb", value: "F#" },
  { label: "G", value: "G" },
  { label: "G# / Ab", value: "Ab" },
  { label: "A", value: "A" },
  { label: "A# / Bb", value: "Bb" },
  { label: "B", value: "B" },
];
