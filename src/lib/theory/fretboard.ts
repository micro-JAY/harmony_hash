import { prefersFlatNotation } from "../chordData";
import type { ScaleType } from "../types";
import { pitchClassOf, scaleIntervalsFor } from "./scaleBasics";

export type FretboardInstrument = "guitar" | "bass";

export interface FretboardString {
  readonly number: number;
  readonly openNote: string;
  readonly openPitchClass: number;
  readonly registerLabel: string;
}

export interface FretboardPosition {
  readonly stringNumber: number;
  readonly stringLabel: string;
  readonly fret: number;
  readonly pitchClass: number;
  readonly noteLabel: string;
  readonly isScaleTone: boolean;
  readonly isRoot: boolean;
  readonly degree: number | null;
  readonly interval: number | null;
  readonly intervalLabel: string | null;
}

export interface FretboardStringRow {
  readonly string: FretboardString;
  readonly positions: ReadonlyArray<FretboardPosition>;
}

const GUITAR_STANDARD: ReadonlyArray<FretboardString> = Object.freeze([
  Object.freeze({ number: 1, openNote: "E", openPitchClass: 4, registerLabel: "high E" }),
  Object.freeze({ number: 2, openNote: "B", openPitchClass: 11, registerLabel: "B" }),
  Object.freeze({ number: 3, openNote: "G", openPitchClass: 7, registerLabel: "G" }),
  Object.freeze({ number: 4, openNote: "D", openPitchClass: 2, registerLabel: "D" }),
  Object.freeze({ number: 5, openNote: "A", openPitchClass: 9, registerLabel: "A" }),
  Object.freeze({ number: 6, openNote: "E", openPitchClass: 4, registerLabel: "low E" }),
]);

const BASS_STANDARD: ReadonlyArray<FretboardString> = Object.freeze([
  Object.freeze({ number: 1, openNote: "G", openPitchClass: 7, registerLabel: "G" }),
  Object.freeze({ number: 2, openNote: "D", openPitchClass: 2, registerLabel: "D" }),
  Object.freeze({ number: 3, openNote: "A", openPitchClass: 9, registerLabel: "A" }),
  Object.freeze({ number: 4, openNote: "E", openPitchClass: 4, registerLabel: "E" }),
]);

const SHARP_NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_NOTE_LABELS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
const INTERVAL_LABELS = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"] as const;

export function fretboardTuningFor(
  instrument: FretboardInstrument,
): ReadonlyArray<FretboardString> {
  return instrument === "guitar" ? GUITAR_STANDARD : BASS_STANDARD;
}

export function noteLabelForPitchClass(pitchClass: number, preferFlats: boolean): string {
  if (!Number.isInteger(pitchClass) || pitchClass < 0 || pitchClass > 11) {
    throw new RangeError(`Pitch class must be an integer from 0 to 11; received ${pitchClass}`);
  }
  return (preferFlats ? FLAT_NOTE_LABELS : SHARP_NOTE_LABELS)[pitchClass];
}

export function intervalLabelFor(interval: number): string {
  if (!Number.isInteger(interval) || interval < 0 || interval > 11) {
    throw new RangeError(`Interval must be an integer from 0 to 11; received ${interval}`);
  }
  return INTERVAL_LABELS[interval];
}

export function buildFretboardRows(
  instrument: FretboardInstrument,
  keyName: string,
  scaleType: ScaleType,
  maxFret = 15,
): ReadonlyArray<FretboardStringRow> {
  if (!Number.isInteger(maxFret) || maxFret < 0 || maxFret > 24) {
    throw new RangeError(`Maximum fret must be an integer from 0 to 24; received ${maxFret}`);
  }

  const rootPitchClass = pitchClassOf(keyName);
  if (rootPitchClass < 0) {
    throw new Error(`Unrecognized fretboard root: "${keyName}"`);
  }

  const intervals = scaleIntervalsFor(scaleType);
  const intervalIndex = new Map(intervals.map((interval, index) => [interval, index]));
  const preferFlats = prefersFlatNotation(keyName);

  return Object.freeze(
    fretboardTuningFor(instrument).map((string) => {
      const positions = Array.from({ length: maxFret + 1 }, (_, fret) => {
        const pitchClass = (string.openPitchClass + fret) % 12;
        const interval = (pitchClass - rootPitchClass + 12) % 12;
        const degreeIndex = intervalIndex.get(interval);
        const isScaleTone = degreeIndex !== undefined;

        return Object.freeze({
          stringNumber: string.number,
          stringLabel: string.registerLabel,
          fret,
          pitchClass,
          noteLabel: noteLabelForPitchClass(pitchClass, preferFlats),
          isScaleTone,
          isRoot: isScaleTone && interval === 0,
          degree: isScaleTone ? degreeIndex + 1 : null,
          interval: isScaleTone ? interval : null,
          intervalLabel: isScaleTone ? intervalLabelFor(interval) : null,
        });
      });

      return Object.freeze({ string, positions: Object.freeze(positions) });
    }),
  );
}
