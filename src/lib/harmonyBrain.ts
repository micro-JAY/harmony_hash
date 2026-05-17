import type {
  ParseResult,
  ResolvedChord,
  ParseError,
  VoicedChord,
  VoicedNote,
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
 * - Triads: root position
 * - 4+ note chords: Drop 2 unless the dropped note would fall below C3
 * - Starts from the lowest octave that keeps the full voicing visible in C3-B5
 */
const VISIBLE_MIDI_MIN = 48; // C3
const VISIBLE_MIDI_MAX = 83; // B5

function buildClosedVoicing(noteNames: string[], pitchClasses: number[], startOctave: number): VoicedNote[] {
  const closed: VoicedNote[] = [];

  for (let i = 0; i < noteNames.length; i++) {
    const pc = pitchClasses[i];
    let octave = startOctave;
    let midi = pc + (octave + 1) * 12;

    if (i > 0) {
      const prevMidi = closed[i - 1].midi;
      while (midi <= prevMidi) {
        octave++;
        midi = pc + (octave + 1) * 12;
      }
    }

    closed.push({
      name: noteNames[i],
      pitchClass: pc,
      octave,
      midi,
      hand: "right",
    });
  }

  return closed;
}

function isWithinVisibleRange(notes: VoicedNote[]): boolean {
  return notes.every((note) => note.midi >= VISIBLE_MIDI_MIN && note.midi <= VISIBLE_MIDI_MAX);
}

function buildVoicingForStartOctave(
  noteNames: string[],
  pitchClasses: number[],
  startOctave: number
): VoicedChord {
  const closed = buildClosedVoicing(noteNames, pitchClasses, startOctave);

  if (noteNames.length <= 3) {
    return { notes: closed, voicingType: "root" };
  }

  // 4+ notes: Drop 2 (2nd from top of the first 4 notes)
  const dropIndex = Math.min(noteNames.length, 4) - 2;
  const droppedCandidate = { ...closed[dropIndex] };
  droppedCandidate.octave -= 1;
  droppedCandidate.midi = droppedCandidate.pitchClass + (droppedCandidate.octave + 1) * 12;

  // Keep chord tones visible on C3-B5 keyboard by skipping drops that underflow below C3.
  if (droppedCandidate.midi < VISIBLE_MIDI_MIN) {
    return { notes: closed, voicingType: "root" };
  }

  droppedCandidate.hand = "left";
  const remaining = closed.filter((_, i) => i !== dropIndex).map((note) => ({ ...note, hand: "right" as const }));
  const notes = [droppedCandidate, ...remaining].sort((a, b) => a.midi - b.midi);
  return { notes, voicingType: "drop2" };
}

export function computeVoicing(noteNames: string[]): VoicedChord {
  if (noteNames.length === 0) {
    return { notes: [], voicingType: "root" };
  }

  const pitchClasses = noteNames.map((n) => noteToPitchClass(n));
  const octave3Voicing = buildVoicingForStartOctave(noteNames, pitchClasses, 3);
  if (isWithinVisibleRange(octave3Voicing.notes)) {
    return octave3Voicing;
  }

  const octave4Voicing = buildVoicingForStartOctave(noteNames, pitchClasses, 4);
  if (isWithinVisibleRange(octave4Voicing.notes)) {
    return octave4Voicing;
  }

  // Fallback to the lower register so at least the bass side remains visible.
  return octave3Voicing;
}

// ─── 3.7: Voice-Leading Across a Progression ────────────────────────

const VOICE_LED_OCTAVE_STARTS = [3, 4] as const;

function rotateNoteNames(noteNames: string[], offset: number): string[] {
  return [...noteNames.slice(offset), ...noteNames.slice(0, offset)];
}

function voicingSignature(v: VoicedChord): string {
  const midis = v.notes.map((n) => n.midi).slice().sort((a, b) => a - b);
  return `${midis.join(",")}:${v.voicingType}`;
}

/**
 * Enumerate every C3-B5-visible voicing candidate for a single chord:
 * each cyclic rotation (inversion) × each starting octave × {default
 * spacing, alternative spacing for 4+ note chords when both fit}.
 *
 * The set always includes `computeVoicing(noteNames)`'s output when it
 * fits the visible range, so the worst-case voice-leading choice can
 * never be worse than the existing default.
 */
function enumerateVoicingCandidates(noteNames: string[]): VoicedChord[] {
  if (noteNames.length === 0) return [];

  const candidates: VoicedChord[] = [];
  const seen = new Set<string>();

  const addIfVisible = (v: VoicedChord) => {
    if (!isWithinVisibleRange(v.notes)) return;
    const sig = voicingSignature(v);
    if (seen.has(sig)) return;
    seen.add(sig);
    candidates.push(v);
  };

  for (let invIdx = 0; invIdx < noteNames.length; invIdx++) {
    const inv = rotateNoteNames(noteNames, invIdx);
    const pitchClasses = inv.map((n) => noteToPitchClass(n));

    for (const oct of VOICE_LED_OCTAVE_STARTS) {
      const defaultVoicing = buildVoicingForStartOctave(inv, pitchClasses, oct);
      addIfVisible(defaultVoicing);

      // 4+ note chords: if the default at this octave is Drop 2, also
      // consider the closed-position alternative (and vice versa is
      // covered automatically because buildVoicingForStartOctave already
      // falls back to closed when Drop 2 underflows).
      if (inv.length >= 4 && defaultVoicing.voicingType === "drop2") {
        const closedAlt: VoicedChord = {
          notes: buildClosedVoicing(inv, pitchClasses, oct),
          voicingType: "root",
        };
        addIfVisible(closedAlt);
      }
    }
  }

  // Defensive fallback for chords whose every candidate underflows or
  // overflows the visible range — surface `computeVoicing`'s relaxed
  // output rather than returning zero candidates downstream.
  if (candidates.length === 0) {
    candidates.push(computeVoicing(noteNames));
  }

  return candidates;
}

/**
 * Sum of minimum semitone distances: each candidate note's distance
 * to its nearest prior note, summed. Common tones contribute 0; a
 * single-semitone step contributes 1. Empty prior or candidate → 0
 * so the metric stays well-defined for the first chord and edge cases.
 */
function voicingDistance(prior: VoicedNote[], candidate: VoicedNote[]): number {
  if (prior.length === 0 || candidate.length === 0) return 0;
  let total = 0;
  for (const c of candidate) {
    let minDelta = Infinity;
    for (const p of prior) {
      const delta = Math.abs(c.midi - p.midi);
      if (delta < minDelta) minDelta = delta;
    }
    total += minDelta;
  }
  return total;
}

function averageMidi(notes: VoicedNote[]): number {
  if (notes.length === 0) return 0;
  let sum = 0;
  for (const n of notes) sum += n.midi;
  return sum / notes.length;
}

/**
 * Pick the candidate with minimum voicing-distance from `prior`. On
 * ties, prefer the candidate with the lower average MIDI — matches
 * `computeVoicing`'s existing preference for the lower register and
 * keeps the result deterministic.
 */
function pickBestCandidate(prior: VoicedNote[], candidates: VoicedChord[]): VoicedChord {
  let best = candidates[0];
  let bestDistance = voicingDistance(prior, best.notes);
  let bestAvgMidi = averageMidi(best.notes);

  for (let i = 1; i < candidates.length; i++) {
    const cand = candidates[i];
    const dist = voicingDistance(prior, cand.notes);
    if (dist > bestDistance) continue;
    if (dist < bestDistance) {
      best = cand;
      bestDistance = dist;
      bestAvgMidi = averageMidi(cand.notes);
      continue;
    }
    const avg = averageMidi(cand.notes);
    if (avg < bestAvgMidi) {
      best = cand;
      bestAvgMidi = avg;
    }
  }
  return best;
}

/**
 * Compute voicings for an ordered progression with smooth voice
 * leading. The first chord anchors with `computeVoicing`'s default;
 * each subsequent chord is chosen for minimum voice movement from the
 * prior while keeping every note inside C3-B5.
 */
export function computeVoiceLedProgression(progressionNotes: string[][]): VoicedChord[] {
  if (progressionNotes.length === 0) return [];

  const first = computeVoicing(progressionNotes[0]);
  if (progressionNotes.length === 1) return [first];

  const result: VoicedChord[] = [first];
  for (let i = 1; i < progressionNotes.length; i++) {
    const candidates = enumerateVoicingCandidates(progressionNotes[i]);
    const best = pickBestCandidate(result[i - 1].notes, candidates);
    result.push(best);
  }
  return result;
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

// Keys that prefer sharp notation (excludes C — it uses flats for accidentals like Bb, Eb)
const SHARP_KEYS = new Set(["G", "D", "A", "E", "B", "Fs", "Cs"]);

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

  let extraSuffix = remaining;

  // Lowercase numerals already encode minor quality.
  // Normalize iim7/im to avoid duplicated quality output (Amm7/Amm).
  if (isMinor && extraSuffix.startsWith("m")) {
    const nextChar = extraSuffix.charAt(1);
    if (!nextChar || /[0-9]/.test(nextChar)) {
      extraSuffix = extraSuffix.slice(1);
    }
  }

  return {
    degree,
    isMinor,
    accidental,
    suffix,
    extraSuffix,
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
    // Slash-numeral bass notes are currently display-only; resolve the main chord token.
    const primaryNumeral = numeral.split("/")[0].trim();
    const parsed = parseNumeral(primaryNumeral);
    if (!parsed) return numeral; // unparseable, return raw

    const { degree, isMinor, accidental, suffix, extraSuffix } = parsed;

    // Get the scale degree's pitch class
    // Accidentals are applied relative to the MAJOR scale, not the modal scale.
    // e.g. "bVII" always means a whole step below tonic, regardless of mode.
    const basePc = accidental !== 0 ? MAJOR_SCALE[degree] : scale[degree];
    const scalePc = basePc + accidental;
    const chordRootPc = ((keyPc + scalePc) % 12 + 12) % 12;
    const rootName = noteDisplay[chordRootPc];

    // Determine chord quality
    let quality: string;
    if (suffix) {
      // Explicit suffix from the numeral (e.g. ii° → dim)
      quality = suffix;
    } else if (accidental !== 0) {
      // With accidentals (bVII, #IV), the numeral case directly determines quality
      quality = isMinor ? "m" : "";
    } else if (isMinor) {
      quality = "m";
    } else {
      // No accidental, no suffix: use scale's default quality for this degree
      const defaultQ = defaultQualities[degree];
      quality = defaultQ === "m" ? "" : defaultQ;
    }

    return rootName + quality + extraSuffix;
  });
}

/**
 * Transpose an en-dash-separated numeral string (e.g. "I – V – vi – IV")
 * to concrete chord names in a given key.
 */
export function transposeNumeralString(
  numeralString: string,
  key: string,
  scaleType: ScaleType
): string[] {
  const numerals = numeralString.split(" – ").map((s) => s.trim());
  return transposeProgression(numerals, key, scaleType);
}

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
