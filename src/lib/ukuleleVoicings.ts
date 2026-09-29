import type { IndexedChord, Instrument, VoicedChord } from "./types";
import { deriveChordTones, type ChordTone } from "./theory/chordTones";
import { fretboardTuningFor } from "./theory/fretboard";
import { pitchClassOf } from "./theory/scaleBasics";

/** Physical strum order, string 4 to string 1. High G is above the C and E strings. */
export const UKULELE_OPEN_MIDIS: readonly number[] = Object.freeze(
  [...fretboardTuningFor("ukulele")].reverse().map((string) => string.absoluteOpenPitch),
);
export const UKULELE_MAX_FRET = 12;
export const UKULELE_MAX_FRET_SPAN = 3;
export const UKULELE_MAX_VARIANTS = 12;

export interface UkuleleNote {
  readonly stringNumber: number;
  readonly fret: number;
  readonly midi: number;
  readonly pitchClass: number;
  readonly noteLabel: string;
  readonly degree: string;
}

export interface UkuleleVoicing {
  /** Frets in G C E A order; null means mute that string. */
  readonly frets: readonly (number | null)[];
  readonly notes: readonly UkuleleNote[];
  readonly omittedTones: readonly ChordTone[];
  readonly baseFret: number;
}

const voicingCache = new Map<string, readonly UkuleleVoicing[]>();
const MAX_CACHED_CHORDS = 512;

function tonePriority(tone: ChordTone, highestExtension: number, bassPitchClass: number): number {
  if (tone.pitchClass === bassPitchClass) return 1_000;
  if (tone.degree === "3" || tone.degree === "b3") return 100;
  if (/^(?:b{0,2})7$/.test(tone.degree)) return 95;
  if (/^[b#]/.test(tone.degree)) return 90;
  const degree = Number(tone.degree);
  if (degree > 7 && degree === highestExtension) return 85;
  if (tone.degree === "1") return 80;
  if (tone.degree === "5") return 0;
  return 60;
}

function generateVoicings(chord: IndexedChord): readonly UkuleleVoicing[] {
  const tones = deriveChordTones(chord);
  const bassPitchClass = chord.bass ? pitchClassOf(chord.bass) : -1;
  const highestExtension = Math.max(...tones.map((tone) => Number(tone.degree) || 0));
  // Four strings cannot retain every extension. Keep guide tones and characteristic
  // alterations before an unaltered fifth; expose every omission on the card.
  const retained = tones.length <= 4 ? tones : [...tones]
    .sort((left, right) =>
      tonePriority(right, highestExtension, bassPitchClass)
      - tonePriority(left, highestExtension, bassPitchClass))
    .slice(0, 4);
  const retainedClasses = new Set(retained.map((tone) => tone.pitchClass));
  const omittedTones = Object.freeze(tones.filter((tone) => !retainedClasses.has(tone.pitchClass)));
  const toneByClass = new Map(tones.map((tone) => [tone.pitchClass, tone]));
  const options = UKULELE_OPEN_MIDIS.map((openMidi) => [
    null,
    ...Array.from({ length: UKULELE_MAX_FRET + 1 }, (_, fret) => fret)
      .filter((fret) => retainedClasses.has((openMidi + fret) % 12)),
  ]);
  const candidates: Array<{ voicing: UkuleleVoicing; score: number; key: string }> = [];

  function visit(frets: Array<number | null>): void {
    if (frets.length < 4) {
      for (const fret of options[frets.length]) visit([...frets, fret]);
      return;
    }
    const fretted = frets.filter((fret): fret is number => fret !== null && fret > 0);
    const minFret = fretted.length > 0 ? Math.min(...fretted) : 0;
    const maxFret = fretted.length > 0 ? Math.max(...fretted) : 0;
    if (maxFret - minFret > UKULELE_MAX_FRET_SPAN) return;
    const notes = frets.flatMap((fret, index) => {
      if (fret === null) return [];
      const midi = UKULELE_OPEN_MIDIS[index] + fret;
      const pitchClass = midi % 12;
      const tone = toneByClass.get(pitchClass);
      if (!tone) throw new Error(`Unexpected ukulele pitch class ${pitchClass}`);
      return [Object.freeze({
        stringNumber: 4 - index, fret, midi, pitchClass,
        noteLabel: tone.noteLabel, degree: tone.degree,
      })];
    });
    const soundingClasses = new Set(notes.map((note) => note.pitchClass));
    if (retained.some((tone) => !soundingClasses.has(tone.pitchClass))) return;
    if (notes.length < Math.min(3, tones.length)) return;
    // Re-entrant string order is not pitch order: compare actual sounding MIDI.
    if (bassPitchClass >= 0 && Math.min(...notes.map((note) => note.midi)) % 12 !== bassPitchClass) return;
    const score = (4 - notes.length) * 20 + maxFret * 3
      + fretted.reduce((sum, fret) => sum + fret, 0)
      + (maxFret - minFret) * 2;
    candidates.push({
      score,
      key: frets.map((fret) => fret === null ? "x" : String(fret).padStart(2, "0")).join("-"),
      voicing: Object.freeze({
        frets: Object.freeze(frets),
        notes: Object.freeze(notes),
        omittedTones,
        baseFret: maxFret <= 4 ? 1 : minFret,
      }),
    });
  }

  visit([]);
  return Object.freeze(candidates
    .sort((left, right) => left.score - right.score || left.key.localeCompare(right.key))
    .slice(0, UKULELE_MAX_VARIANTS)
    .map(({ voicing }) => voicing));
}

/** Empty results are an honest per-card limitation, never a substitute chord. */
export function getUkuleleVoicings(chord: IndexedChord): readonly UkuleleVoicing[] {
  const key = `${chord.root}|${chord.displayName}|${chord.entry.Notes}|${chord.entry.Steps}|${chord.bass ?? ""}`;
  const cached = voicingCache.get(key);
  if (cached) return cached;
  const voicings = generateVoicings(chord);
  if (voicingCache.size >= MAX_CACHED_CHORDS) voicingCache.clear();
  voicingCache.set(key, voicings);
  return voicings;
}

export function getUkuleleVoicing(chord: IndexedChord, variant: number): UkuleleVoicing | null {
  const voicings = getUkuleleVoicings(chord);
  if (voicings.length === 0) return null;
  const index = Number.isFinite(variant)
    ? Math.min(Math.max(Math.floor(variant) - 1, 0), voicings.length - 1) : 0;
  return voicings[index];
}

export function getInstrumentVariantCount(chord: IndexedChord, instrument: Instrument): number {
  return instrument === "ukulele" ? getUkuleleVoicings(chord).length : chord.variationCount;
}

export function ukuleleVoicingToVoicedChord(voicing: UkuleleVoicing | null): VoicedChord {
  return {
    voicingType: "root",
    notes: voicing?.notes.map((note) => ({
      name: note.noteLabel,
      midi: note.midi,
      pitchClass: note.pitchClass,
      octave: Math.floor(note.midi / 12) - 1,
      hand: "right" as const,
    })) ?? [],
  };
}
