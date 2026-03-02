export interface ChordEntry {
  "Chord Name": string;
  Notes: string;       // e.g. "C-E-G-Bf" (uses 's' for sharp, 'f' for flat)
  Steps: string;       // e.g. "1-3-5-b7"
  Symbols: string;     // comma-separated aliases e.g. "m7, min7, -7"
  Type: "Major" | "Minor" | "Dominant" | "Other" | "Sustained";
  "Variation Count": number;
  "Usage Notes": string;
}

export interface IndexedChord {
  entry: ChordEntry;
  root: string;          // Canonical root e.g. "C", "Cs", "Ef"
  quality: string;       // The symbol that matched e.g. "maj7", "m7"
  displayName: string;   // Short display name e.g. "Cmaj7"
  svgBasePath: string;   // e.g. "/music_src/chords/c/maj7"
  variationCount: number;
}

export interface ParseResult {
  chords: ResolvedChord[];
  errors: ParseError[];
}

export interface ResolvedChord {
  index: number;         // Position in the input string
  input: string;         // Original user input e.g. "Cmin7"
  chord: IndexedChord;
}

export interface ParseError {
  index: number;
  input: string;
  message: string;
}

export interface VoicedNote {
  name: string;          // e.g. "C", "Ef", "Gs"
  pitchClass: number;    // 0-11 (C=0, Cs=1, D=2, ...)
  octave: number;        // e.g. 3, 4
  midi: number;          // pitchClass + (octave + 1) * 12
  hand: "left" | "right";
}

export interface VoicedChord {
  notes: VoicedNote[];
  voicingType: "root" | "drop2";
}

export type ScaleType = "major" | "natural_minor" | "harmonic_minor" | "dorian" | "mixolydian" | "lydian" | "phrygian";

export interface PresetProgression {
  name: string;          // e.g. "I V vi IV"
  numerals: string[];    // e.g. ["I", "V", "vi", "IV"]
  category: string;      // e.g. "Major"
  scaleType: ScaleType;
}

export type Instrument = "guitar" | "piano";
