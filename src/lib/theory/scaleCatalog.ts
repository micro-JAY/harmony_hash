import scaleDataset from "../../data/moods.json";
import type { PlaybackEvent } from "../audioEngine";
import {
  pitchClassOf,
  scaleIntervalsFor,
  spellScaleNotes,
  type ScaleFormulaType,
} from "./scaleBasics";

export const SCALE_FAMILIES = Object.freeze([
  Object.freeze({ id: "major_modes", label: "Major modes" } as const),
  Object.freeze({ id: "harmonic_minor_modes", label: "Harmonic minor modes" } as const),
  Object.freeze({ id: "melodic_minor_modes", label: "Melodic minor modes" } as const),
  Object.freeze({ id: "pentatonic", label: "Pentatonic" } as const),
  Object.freeze({ id: "blues", label: "Blues" } as const),
  Object.freeze({ id: "exotic", label: "Exotic and symmetrical" } as const),
] as const);

export type ScaleFamilyId = typeof SCALE_FAMILIES[number]["id"];
export type PracticeDirection = "ascending" | "descending";
export type PracticeMaterial = "scale" | "arpeggio";

export const ARPEGGIO_PATTERNS = Object.freeze([
  Object.freeze({ id: "triad", label: "Triad", degrees: Object.freeze([1, 3, 5]) }),
  Object.freeze({ id: "seventh", label: "Seventh", degrees: Object.freeze([1, 3, 5, 7]) }),
  Object.freeze({ id: "sixth", label: "Sixth", degrees: Object.freeze([1, 3, 5, 6]) }),
  Object.freeze({ id: "sus2", label: "Sus2", degrees: Object.freeze([1, 2, 5]) }),
  Object.freeze({ id: "sus4", label: "Sus4", degrees: Object.freeze([1, 4, 5]) }),
] as const);

export const PRACTICE_NOTE_LENGTHS = Object.freeze([
  Object.freeze({ id: "sixteenth", label: "1/16", beats: 0.25 }),
  Object.freeze({ id: "eighth", label: "1/8", beats: 0.5 }),
  Object.freeze({ id: "quarter", label: "1/4", beats: 1 }),
  Object.freeze({ id: "half", label: "1/2", beats: 2 }),
  Object.freeze({ id: "whole", label: "1", beats: 4 }),
] as const);

export const SCALE_PRACTICE_BPM = 120;
export const SCALE_PRACTICE_BEATS_PER_BAR = 4;

export type ArpeggioType = typeof ARPEGGIO_PATTERNS[number]["id"];
export type PracticeNoteLength = typeof PRACTICE_NOTE_LENGTHS[number]["id"];

export interface ScaleLearningDefinition {
  readonly id: ScaleFormulaType;
  readonly label: string;
  readonly family: ScaleFamilyId;
  readonly useItFor: string;
  readonly useItOver: string;
  readonly hearItIn: string;
}

export interface ScalePracticeNote {
  readonly label: string;
  readonly interval: number;
  readonly degree: number;
  readonly midi: number;
  readonly octaveRoot: boolean;
}

const SCALE_CATALOG_IDS = Object.freeze([
  "major", "dorian", "phrygian", "lydian", "mixolydian", "natural_minor", "locrian",
  "harmonic_minor", "locrian_natural_6", "ionian_sharp_5", "dorian_sharp_4",
  "phrygian_dominant", "lydian_sharp_2", "altered_diminished",
  "melodic_minor", "dorian_flat_2", "lydian_augmented", "lydian_dominant",
  "mixolydian_flat_6", "locrian_natural_2", "altered",
  "major_pentatonic", "minor_pentatonic", "major_blues", "minor_blues",
  "hungarian_minor", "whole_tone", "diminished_whole_half",
] as const satisfies ReadonlyArray<ScaleFormulaType>);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} must be a non-empty string`);
  }
  return value;
}

function isScaleId(value: unknown): value is ScaleFormulaType {
  return typeof value === "string" && SCALE_CATALOG_IDS.some((id) => id === value);
}

function isFamilyId(value: unknown): value is ScaleFamilyId {
  return typeof value === "string" && SCALE_FAMILIES.some((family) => family.id === value);
}

export function parseScaleLearningDefinitions(
  records: ReadonlyArray<unknown>,
): ReadonlyArray<ScaleLearningDefinition> {
  const parsed = records.map((value, index) => {
    const path = `scaleLearning[${index}]`;
    if (!isRecord(value)) throw new TypeError(`${path} must be an object`);
    if (!isScaleId(value.id)) throw new TypeError(`${path}.id is not a supported scale id`);
    if (!isFamilyId(value.family)) throw new TypeError(`${path}.family is not supported`);
    return Object.freeze({
      id: value.id,
      label: requiredString(value.label, `${path}.label`),
      family: value.family,
      useItFor: requiredString(value.useItFor, `${path}.useItFor`),
      useItOver: requiredString(value.useItOver, `${path}.useItOver`),
      hearItIn: requiredString(value.hearItIn, `${path}.hearItIn`),
    });
  });
  const ids = new Set(parsed.map((definition) => definition.id));
  if (
    parsed.length !== SCALE_CATALOG_IDS.length
    || ids.size !== SCALE_CATALOG_IDS.length
    || SCALE_CATALOG_IDS.some((id) => !ids.has(id))
  ) {
    throw new TypeError("moods.json must define every Scale Synthesia scale exactly once");
  }
  return Object.freeze(parsed);
}

export const SCALE_LEARNING = parseScaleLearningDefinitions(scaleDataset.scaleLearning);

export function scaleLearningDefinitionFor(id: ScaleFormulaType): ScaleLearningDefinition {
  const definition = SCALE_LEARNING.find((candidate) => candidate.id === id);
  if (!definition) throw new RangeError(`Unknown Scale Synthesia scale: ${id}`);
  return definition;
}

export function scaleLearningForFamily(
  family: ScaleFamilyId,
): ReadonlyArray<ScaleLearningDefinition> {
  return Object.freeze(SCALE_LEARNING.filter((definition) => definition.family === family));
}

function stepLabel(semitones: number): string {
  if (semitones === 1) return "H";
  if (semitones === 2) return "W";
  if (semitones === 3) return "1½";
  return String(semitones);
}

export function scaleStepLabels(scaleId: ScaleFormulaType): ReadonlyArray<string> {
  const intervals = scaleIntervalsFor(scaleId);
  return Object.freeze(intervals.map((interval, index) => {
    const next = intervals[index + 1] ?? 12;
    return stepLabel(next - interval);
  }));
}

export function scaleDegreeName(interval: number, scaleId: ScaleFormulaType): string {
  if (interval === 0) return "Root";
  if (interval === 1) return "Minor second";
  if (interval === 2) return "Major second";
  if (interval === 3) return "Minor third";
  if (interval === 4) return "Major third";
  if (interval === 5) return "Perfect fourth";
  if (interval === 6) {
    return ["lydian", "dorian_sharp_4", "lydian_augmented", "lydian_dominant", "hungarian_minor"]
      .includes(scaleId) ? "Raised fourth" : "Flat fifth";
  }
  if (interval === 7) return "Perfect fifth";
  if (interval === 8) return "Minor sixth";
  if (interval === 9) {
    return ["dorian", "locrian_natural_6"].includes(scaleId) ? "Raised sixth" : "Major sixth";
  }
  if (interval === 10) return "Minor seventh";
  if (interval === 11) {
    return scaleId === "harmonic_minor" ? "Raised seventh" : "Major seventh";
  }
  throw new RangeError(`Scale interval must be from 0 to 11; received ${interval}`);
}

export function buildScalePracticeSequence(
  root: string,
  scaleId: ScaleFormulaType,
  material: PracticeMaterial,
  arpeggioType: ArpeggioType,
  direction: PracticeDirection,
  startOctave = 3,
): ReadonlyArray<ScalePracticeNote> {
  const rootPitchClass = pitchClassOf(root);
  if (rootPitchClass < 0) throw new Error(`Unrecognized practice root: "${root}"`);
  if (!Number.isInteger(startOctave) || startOctave < 0 || startOctave > 8) {
    throw new RangeError(`Practice octave must be an integer from 0 to 8; received ${startOctave}`);
  }

  const intervals = scaleIntervalsFor(scaleId);
  const labels = spellScaleNotes(root, scaleId);
  const arpeggioPattern = ARPEGGIO_PATTERNS.find((pattern) => pattern.id === arpeggioType);
  if (!arpeggioPattern) throw new RangeError(`Unknown arpeggio type: ${arpeggioType}`);
  const requestedIndices = material === "scale"
    ? intervals.map((_, index) => index)
    : arpeggioPattern.degrees.map((degree) => degree - 1);
  const rootMidi = rootPitchClass + (startOctave + 1) * 12;
  const ascending: ScalePracticeNote[] = requestedIndices
    .filter((index) => index < intervals.length)
    .map((index) => Object.freeze({
      label: labels[index],
      interval: intervals[index],
      degree: index + 1,
      midi: rootMidi + intervals[index],
      octaveRoot: false,
    }));
  ascending.push(Object.freeze({
    label: labels[0],
    interval: 0,
    degree: 1,
    midi: rootMidi + 12,
    octaveRoot: true,
  }));
  return Object.freeze(direction === "ascending" ? ascending : [...ascending].reverse());
}

export function practiceNoteDurationSeconds(noteLength: PracticeNoteLength): number {
  const definition = PRACTICE_NOTE_LENGTHS.find((candidate) => candidate.id === noteLength);
  if (!definition) throw new RangeError(`Unknown practice note length: ${noteLength}`);
  return (60 / SCALE_PRACTICE_BPM) * definition.beats;
}

export function buildScalePlaybackSchedule(
  sequence: ReadonlyArray<ScalePracticeNote>,
  noteDuration = 0.34,
): ReadonlyArray<PlaybackEvent> {
  if (!Number.isFinite(noteDuration) || noteDuration <= 0) {
    throw new RangeError("Scale note duration must be a positive finite number");
  }
  return Object.freeze(sequence.map((note, index) => Object.freeze({
    startTime: index * noteDuration,
    duration: noteDuration * 0.88,
    notes: [note.midi],
    chordIndex: index,
  })));
}
