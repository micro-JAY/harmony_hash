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

const SCALE_INTERVALS: Readonly<Record<ScaleType, ReadonlyArray<number>>> = Object.freeze({
  major: Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  natural_minor: Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  harmonic_minor: Object.freeze([0, 2, 3, 5, 7, 8, 11]),
  dorian: Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  mixolydian: Object.freeze([0, 2, 4, 5, 7, 9, 10]),
  lydian: Object.freeze([0, 2, 4, 6, 7, 9, 11]),
  phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
});

export function scaleIntervalsFor(scaleType: ScaleType): ReadonlyArray<number> {
  return SCALE_INTERVALS[scaleType];
}

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
    scaleIntervalsFor(scaleType).map((interval) => (keyPitchClass + interval) % 12),
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
  const index = scaleIntervalsFor(scaleType).indexOf(interval);
  return index >= 0 ? index + 1 : null;
}
