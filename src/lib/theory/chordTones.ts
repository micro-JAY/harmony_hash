import {
  formatNoteForDisplay,
  parseNotes,
  prefersFlatNotation,
  splitRootAndQuality,
} from "../chordData";
import type { IndexedChord } from "../types";
import { pitchClassOf } from "./scaleBasics";

export type ChordToneRole = "chord" | "bass";

export interface ChordTone {
  readonly pitchClass: number;
  readonly noteLabel: string;
  readonly degree: string;
  readonly role: ChordToneRole;
}

export function deriveChordTones(chord: IndexedChord): ReadonlyArray<ChordTone> {
  const notes = parseNotes(chord.entry);
  const steps = chord.entry.Steps.split("-").filter(Boolean);
  if (notes.length === 0 || notes.length !== steps.length) {
    throw new Error(`Malformed chord-tone data for ${chord.displayName}`);
  }

  const [displayRoot] = splitRootAndQuality(chord.displayName);
  const preferFlats = prefersFlatNotation(displayRoot)
    || (chord.bass !== undefined && prefersFlatNotation(chord.bass));
  const seen = new Set<number>();
  const tones: ChordTone[] = [];

  notes.forEach((note, index) => {
    const pitchClass = pitchClassOf(note);
    if (pitchClass < 0) {
      throw new Error(`Unrecognized chord tone "${note}" for ${chord.displayName}`);
    }
    if (seen.has(pitchClass)) return;
    seen.add(pitchClass);
    tones.push(Object.freeze({
      pitchClass,
      noteLabel: formatNoteForDisplay(note, preferFlats),
      degree: steps[index],
      role: "chord" as const,
    }));
  });

  if (chord.bass) {
    const bassPitchClass = pitchClassOf(chord.bass);
    if (bassPitchClass < 0) {
      throw new Error(`Unrecognized slash bass "${chord.bass}" for ${chord.displayName}`);
    }
    if (!seen.has(bassPitchClass)) {
      tones.push(Object.freeze({
        pitchClass: bassPitchClass,
        noteLabel: chord.bass,
        degree: "bass",
        role: "bass" as const,
      }));
    }
  }

  return Object.freeze(tones);
}

export function chordPitchClasses(chord: IndexedChord): ReadonlyArray<number> {
  return Object.freeze(deriveChordTones(chord).map((tone) => tone.pitchClass));
}
