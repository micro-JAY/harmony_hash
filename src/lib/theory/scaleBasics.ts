import { normalizeRoot } from "../chordData";
import type { ScaleType } from "../types";

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

const SCALE_INTERVALS: Readonly<Record<ScaleType, ReadonlyArray<number>>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

export function pitchClassOf(rootName: string): number {
  const canonical = normalizeRoot(rootName);
  if (!canonical) return -1;
  const pitchClass = NOTE_PCS[canonical];
  return pitchClass !== undefined ? pitchClass : -1;
}

export function scalePitchClasses(keyName: string, scaleType: ScaleType): Set<number> {
  const keyPitchClass = pitchClassOf(keyName);
  if (keyPitchClass < 0) return new Set();
  return new Set(
    SCALE_INTERVALS[scaleType].map((interval) => (keyPitchClass + interval) % 12),
  );
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
  const index = SCALE_INTERVALS[scaleType].indexOf(interval);
  return index >= 0 ? index + 1 : null;
}
