import type { ScaleType } from "../types";
import { normalizeRoot } from "../chordData";

const NOTE_PCS: Record<string, number> = {
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

const SCALE_INTERVALS: Record<ScaleType, ReadonlyArray<number>> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  natural_minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

/**
 * Pitch class (0-11) for a note name in either canonical internal
 * form ("Cs", "Ef") or user-facing form ("C#", "Eb"). Returns -1 for
 * unknown spellings.
 */
export function pitchClassOf(rootName: string): number {
  const canonical = normalizeRoot(rootName);
  if (!canonical) return -1;
  const pc = NOTE_PCS[canonical];
  return pc !== undefined ? pc : -1;
}

/**
 * Set of pitch classes belonging to the given key + scale. e.g.
 * `scalePitchClasses("C", "major")` → {0, 2, 4, 5, 7, 9, 11}.
 * Returns an empty set for unknown keys.
 */
export function scalePitchClasses(keyName: string, scaleType: ScaleType): Set<number> {
  const keyPc = pitchClassOf(keyName);
  if (keyPc < 0) return new Set();
  const intervals = SCALE_INTERVALS[scaleType];
  return new Set(intervals.map((interval) => (keyPc + interval) % 12));
}

/**
 * Whether a chord root sits inside the given key's scale. This is the
 * coarsest possible "diatonic" gate — a root match means the chord
 * is BUILT ON a scale degree, not that every chord tone is diatonic.
 * Sufficient for the suggestion overlay's primary visual cue.
 */
export function isRootDiatonic(rootName: string, keyName: string, scaleType: ScaleType): boolean {
  const rootPc = pitchClassOf(rootName);
  if (rootPc < 0) return false;
  return scalePitchClasses(keyName, scaleType).has(rootPc);
}

/**
 * 1-indexed scale degree (1..7) of a chord root within a key, or null
 * when the root is non-diatonic. Used by the overlay to color cells
 * by harmonic function (I / ii / iii / IV / V / vi / vii).
 */
export function scaleDegreeOf(
  rootName: string,
  keyName: string,
  scaleType: ScaleType,
): number | null {
  const rootPc = pitchClassOf(rootName);
  const keyPc = pitchClassOf(keyName);
  if (rootPc < 0 || keyPc < 0) return null;
  const interval = (rootPc - keyPc + 12) % 12;
  const idx = SCALE_INTERVALS[scaleType].indexOf(interval);
  return idx >= 0 ? idx + 1 : null;
}
