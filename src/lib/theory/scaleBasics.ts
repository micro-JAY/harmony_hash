import { normalizeRoot } from "../chordData";
import type { ScaleType } from "../types";

export type ScaleFormulaType = ScaleType
  | "major_pentatonic"
  | "minor_pentatonic"
  | "major_blues"
  | "minor_blues"
  | "locrian"
  | "locrian_natural_6"
  | "ionian_sharp_5"
  | "dorian_sharp_4"
  | "phrygian_dominant"
  | "lydian_sharp_2"
  | "altered_diminished"
  | "melodic_minor"
  | "dorian_flat_2"
  | "lydian_augmented"
  | "lydian_dominant"
  | "mixolydian_flat_6"
  | "locrian_natural_2"
  | "altered"
  | "hungarian_minor"
  | "whole_tone"
  | "diminished_whole_half";

const NOTE_PCS: Readonly<Record<string, number>> = {
  C: 0,
  Cs: 1,
  D: 2,
  Ds: 3,
  E: 4,
  F: 5,
  Fs: 6,
  G: 7,
  Gs: 8,
  A: 9,
  As: 10,
  B: 11,
};

const SCALE_INTERVALS: Readonly<Record<ScaleFormulaType, ReadonlyArray<number>>> = Object.freeze({
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  natural_minor: Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  harmonic_minor: Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  dorian: Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  mixolydian: Object.freeze([0, 2, 4, 5, 7, 9, 10]),
  lydian: Object.freeze([0, 2, 4, 6, 7, 9, 11]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
  major_pentatonic: Object.freeze([0, 2, 4, 7, 9]),
  minor_pentatonic: Object.freeze([0, 3, 5, 7, 10]),
  major_blues: Object.freeze([0, 2, 3, 4, 7, 9]),
  minor_blues: Object.freeze([0, 3, 5, 6, 7, 10]),
  locrian: Object.freeze([0, 1, 3, 5, 6, 8, 10]),
  locrian_natural_6: Object.freeze([0, 1, 3, 5, 6, 9, 10]),
  ionian_sharp_5: Object.freeze([0, 2, 4, 5, 8, 9, 11]),
  dorian_sharp_4: Object.freeze([0, 2, 3, 6, 7, 9, 10]),
  phrygian_dominant: Object.freeze([0, 1, 4, 5, 7, 8, 10]),
  lydian_sharp_2: Object.freeze([0, 3, 4, 6, 7, 9, 11]),
  altered_diminished: Object.freeze([0, 1, 3, 4, 6, 8, 9]),
  melodic_minor: Object.freeze([0, 2, 3, 5, 7, 9, 11]),
  dorian_flat_2: Object.freeze([0, 1, 3, 5, 7, 9, 10]),
  lydian_augmented: Object.freeze([0, 2, 4, 6, 8, 9, 11]),
  lydian_dominant: Object.freeze([0, 2, 4, 6, 7, 9, 10]),
  mixolydian_flat_6: Object.freeze([0, 2, 4, 5, 7, 8, 10]),
  locrian_natural_2: Object.freeze([0, 2, 3, 5, 6, 8, 10]),
  altered: Object.freeze([0, 1, 3, 4, 6, 8, 10]),
  hungarian_minor: Object.freeze([0, 2, 3, 6, 7, 8, 11]),
  whole_tone: Object.freeze([0, 2, 4, 6, 8, 10]),
  diminished_whole_half: Object.freeze([0, 2, 3, 5, 6, 8, 9, 11]),
});

const NATURAL_LETTER_PITCH_CLASSES: Readonly<Record<string, number>> = Object.freeze({
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
});

const SCALE_DEGREE_LETTER_OFFSETS: Readonly<Record<ScaleFormulaType, ReadonlyArray<number>>> = Object.freeze({
  major: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  natural_minor: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  harmonic_minor: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  dorian: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  mixolydian: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  lydian: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  phrygian: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  major_pentatonic: Object.freeze([0, 1, 2, 4, 5]),
  minor_pentatonic: Object.freeze([0, 2, 3, 4, 6]),
  major_blues: Object.freeze([0, 1, 2, 2, 4, 5]),
  minor_blues: Object.freeze([0, 2, 3, 4, 4, 6]),
  locrian: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  locrian_natural_6: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  ionian_sharp_5: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  dorian_sharp_4: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  phrygian_dominant: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  lydian_sharp_2: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  altered_diminished: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  melodic_minor: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  dorian_flat_2: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  lydian_augmented: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  lydian_dominant: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  mixolydian_flat_6: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  locrian_natural_2: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  altered: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  hungarian_minor: Object.freeze([0, 1, 2, 3, 4, 5, 6]),
  whole_tone: Object.freeze([0, 1, 2, 3, 4, 5]),
  diminished_whole_half: Object.freeze([0, 1, 2, 3, 4, 5, 5, 6]),
});

export function scaleIntervalsFor(scaleType: ScaleFormulaType): ReadonlyArray<number> {
  return SCALE_INTERVALS[scaleType];
}

const MAJOR_DEGREE_INTERVALS = Object.freeze([0, 2, 4, 5, 7, 9, 11]);

export function scaleIntervalFormulaFor(
  scaleType: ScaleFormulaType,
): ReadonlyArray<string> {
  const intervals = scaleIntervalsFor(scaleType);
  const degreeOffsets = SCALE_DEGREE_LETTER_OFFSETS[scaleType];
  return Object.freeze(intervals.map((interval, index) => {
    const degree = degreeOffsets[index] + 1;
    const alteration = interval - MAJOR_DEGREE_INTERVALS[degree - 1];
    const accidental = alteration > 0
      ? "#".repeat(alteration)
      : "b".repeat(-alteration);
    return `${accidental}${degree}`;
  }));
}

export function pitchClassOf(rootName: string): number {
  const canonical = normalizeRoot(rootName);
  if (!canonical) return -1;
  const pitchClass = NOTE_PCS[canonical];
  return pitchClass !== undefined ? pitchClass : -1;
}

export function scalePitchClasses(keyName: string, scaleType: ScaleFormulaType): Set<number> {
  const keyPitchClass = pitchClassOf(keyName);
  if (keyPitchClass < 0) return new Set();
  return new Set(
    scaleIntervalsFor(scaleType).map((interval) => (keyPitchClass + interval) % 12),
  );
}

export function spellScaleNotes(
  keyName: string,
  scaleType: ScaleFormulaType,
): ReadonlyArray<string> {
  const rootPitchClass = pitchClassOf(keyName);
  const rootLetterIndex = "CDEFGAB".indexOf(keyName[0]);
  if (rootPitchClass < 0 || rootLetterIndex < 0) {
    throw new Error(`Unrecognized scale root: "${keyName}"`);
  }

  const intervals = scaleIntervalsFor(scaleType);
  const letterOffsets = SCALE_DEGREE_LETTER_OFFSETS[scaleType];
  return Object.freeze(intervals.map((interval, index) => {
    const letter = "CDEFGAB"[(rootLetterIndex + letterOffsets[index]) % 7];
    const naturalPitchClass = NATURAL_LETTER_PITCH_CLASSES[letter];
    const targetPitchClass = (rootPitchClass + interval) % 12;
    const unsignedDifference = (targetPitchClass - naturalPitchClass + 12) % 12;
    const signedDifference = unsignedDifference > 6 ? unsignedDifference - 12 : unsignedDifference;
    const accidental = signedDifference > 0
      ? "#".repeat(signedDifference)
      : "b".repeat(-signedDifference);
    return `${letter}${accidental}`;
  }));
}

export function isRootDiatonic(
  rootName: string,
  keyName: string,
  scaleType: ScaleType,
): boolean {
  const rootPitchClass = pitchClassOf(rootName);
  if (rootPitchClass < 0) return false;
  return scalePitchClasses(keyName, scaleType).has(rootPitchClass);
}

export function scaleDegreeOf(
  rootName: string,
  keyName: string,
  scaleType: ScaleType,
): number | null {
  const rootPitchClass = pitchClassOf(rootName);
  const keyPitchClass = pitchClassOf(keyName);
  if (rootPitchClass < 0 || keyPitchClass < 0) return null;
  const interval = (rootPitchClass - keyPitchClass + 12) % 12;
  const index = scaleIntervalsFor(scaleType).indexOf(interval);
  return index >= 0 ? index + 1 : null;
}
