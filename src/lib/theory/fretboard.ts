import { prefersFlatNotation } from "../chordData";
import { pitchClassOf, scaleIntervalsFor } from "./scaleBasics";
import type { ScaleFormulaType } from "./scaleBasics";

export type FretboardInstrument = "guitar" | "bass";
export type FretboardTuningId =
  | "guitar-standard"
  | "guitar-drop-d"
  | "guitar-dadgad"
  | "guitar-open-g"
  | "bass-standard"
  | "bass-drop-d"
  | "bass-bead";

export interface FretboardTuning {
  readonly id: FretboardTuningId;
  readonly instrument: FretboardInstrument;
  readonly label: string;
  readonly pitchSequence: string;
  readonly strings: ReadonlyArray<FretboardString>;
}

export interface FretboardString {
  readonly number: number;
  readonly openNote: string;
  readonly openPitchClass: number;
  readonly absoluteOpenPitch: number;
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

function freezeString(
  number: number,
  openNote: string,
  openPitchClass: number,
  absoluteOpenPitch: number,
  registerLabel: string,
): FretboardString {
  return Object.freeze({ number, openNote, openPitchClass, absoluteOpenPitch, registerLabel });
}

function freezeTuning(
  id: FretboardTuningId,
  instrument: FretboardInstrument,
  label: string,
  pitchSequence: string,
  strings: ReadonlyArray<FretboardString>,
): FretboardTuning {
  return Object.freeze({
    id,
    instrument,
    label,
    pitchSequence,
    strings: Object.freeze([...strings]),
  });
}

const FRETBOARD_TUNINGS: ReadonlyArray<FretboardTuning> = Object.freeze([
  freezeTuning("guitar-standard", "guitar", "Standard", "E A D G B E", [
    freezeString(1, "E", 4, 64, "high E"), freezeString(2, "B", 11, 59, "B"),
    freezeString(3, "G", 7, 55, "G"), freezeString(4, "D", 2, 50, "D"),
    freezeString(5, "A", 9, 45, "A"), freezeString(6, "E", 4, 40, "low E"),
  ]),
  freezeTuning("guitar-drop-d", "guitar", "Drop D", "D A D G B E", [
    freezeString(1, "E", 4, 64, "high E"), freezeString(2, "B", 11, 59, "B"),
    freezeString(3, "G", 7, 55, "G"), freezeString(4, "D", 2, 50, "D"),
    freezeString(5, "A", 9, 45, "A"), freezeString(6, "D", 2, 38, "low D"),
  ]),
  freezeTuning("guitar-dadgad", "guitar", "DADGAD", "D A D G A D", [
    freezeString(1, "D", 2, 62, "high D"), freezeString(2, "A", 9, 57, "high A"),
    freezeString(3, "G", 7, 55, "G"), freezeString(4, "D", 2, 50, "mid D"),
    freezeString(5, "A", 9, 45, "low A"), freezeString(6, "D", 2, 38, "low D"),
  ]),
  freezeTuning("guitar-open-g", "guitar", "Open G", "D G D G B D", [
    freezeString(1, "D", 2, 62, "high D"), freezeString(2, "B", 11, 59, "B"),
    freezeString(3, "G", 7, 55, "high G"), freezeString(4, "D", 2, 50, "mid D"),
    freezeString(5, "G", 7, 43, "low G"), freezeString(6, "D", 2, 38, "low D"),
  ]),
  freezeTuning("bass-standard", "bass", "Standard", "E A D G", [
    freezeString(1, "G", 7, 43, "G"), freezeString(2, "D", 2, 38, "D"),
    freezeString(3, "A", 9, 33, "A"), freezeString(4, "E", 4, 28, "E"),
  ]),
  freezeTuning("bass-drop-d", "bass", "Drop D", "D A D G", [
    freezeString(1, "G", 7, 43, "G"), freezeString(2, "D", 2, 38, "high D"),
    freezeString(3, "A", 9, 33, "A"), freezeString(4, "D", 2, 26, "low D"),
  ]),
  freezeTuning("bass-bead", "bass", "BEAD", "B E A D", [
    freezeString(1, "D", 2, 38, "D"), freezeString(2, "A", 9, 33, "A"),
    freezeString(3, "E", 4, 28, "E"), freezeString(4, "B", 11, 23, "B"),
  ]),
]);

const DEFAULT_TUNING_IDS: Readonly<Record<FretboardInstrument, FretboardTuningId>> = Object.freeze({
  guitar: "guitar-standard",
  bass: "bass-standard",
});

const TUNING_BY_ID = new Map(FRETBOARD_TUNINGS.map((tuning) => [tuning.id, tuning]));
const TUNINGS_BY_INSTRUMENT: Readonly<Record<FretboardInstrument, ReadonlyArray<FretboardTuning>>> =
  Object.freeze({
    guitar: Object.freeze(FRETBOARD_TUNINGS.filter((tuning) => tuning.instrument === "guitar")),
    bass: Object.freeze(FRETBOARD_TUNINGS.filter((tuning) => tuning.instrument === "bass")),
  });

const SHARP_NOTE_LABELS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLAT_NOTE_LABELS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;
const INTERVAL_LABELS = ["1", "b2", "2", "b3", "3", "4", "#4", "5", "b6", "6", "b7", "7"] as const;

export function fretboardTuningFor(
  instrument: FretboardInstrument,
  tuningId: FretboardTuningId = DEFAULT_TUNING_IDS[instrument],
): ReadonlyArray<FretboardString> {
  return fretboardTuningDefinitionFor(instrument, tuningId).strings;
}

export function defaultFretboardTuningId(
  instrument: FretboardInstrument,
): FretboardTuningId {
  return DEFAULT_TUNING_IDS[instrument];
}

export function fretboardTuningsFor(
  instrument: FretboardInstrument,
): ReadonlyArray<FretboardTuning> {
  return TUNINGS_BY_INSTRUMENT[instrument];
}

export function fretboardTuningDefinitionFor(
  instrument: FretboardInstrument,
  tuningId: FretboardTuningId = DEFAULT_TUNING_IDS[instrument],
): FretboardTuning {
  const tuning = TUNING_BY_ID.get(tuningId);
  if (!tuning) {
    throw new Error(`Unknown fretboard tuning: "${tuningId}"`);
  }
  if (tuning.instrument !== instrument) {
    throw new Error(`Tuning "${tuningId}" is not compatible with ${instrument}`);
  }
  return tuning;
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

function intervalLabelForScale(interval: number, scaleType: ScaleFormulaType): string {
  if (interval === 6 && scaleType === "minor_blues") return "b5";
  return intervalLabelFor(interval);
}

function prefersFlatScaleTone(
  keyName: string,
  scaleType: ScaleFormulaType,
  interval: number,
): boolean {
  if ([1, 3, 8, 10].includes(interval)) return true;
  if (interval === 6) return scaleType === "minor_blues";
  return prefersFlatNotation(keyName);
}

export function buildFretboardRows(
  instrument: FretboardInstrument,
  keyName: string,
  scaleType: ScaleFormulaType,
  maxFret = 15,
  tuningId: FretboardTuningId = DEFAULT_TUNING_IDS[instrument],
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
  return Object.freeze(
    fretboardTuningFor(instrument, tuningId).map((string) => {
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
          noteLabel: noteLabelForPitchClass(pitchClass, isScaleTone
            ? prefersFlatScaleTone(keyName, scaleType, interval)
            : prefersFlatNotation(keyName)),
          isScaleTone,
          isRoot: isScaleTone && interval === 0,
          degree: isScaleTone ? degreeIndex + 1 : null,
          interval: isScaleTone ? interval : null,
          intervalLabel: isScaleTone ? intervalLabelForScale(interval, scaleType) : null,
        });
      });

      return Object.freeze({ string, positions: Object.freeze(positions) });
    }),
  );
}
