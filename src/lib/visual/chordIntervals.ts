export interface ChordIntervalPresentation {
  readonly interval: number;
  readonly degree: string;
  readonly name: string;
}

export const CHORD_INTERVAL_PRESENTATIONS: readonly ChordIntervalPresentation[] = Object.freeze([
  { interval: 0, degree: "1", name: "Root" },
  { interval: 1, degree: "b2", name: "Flat second" },
  { interval: 2, degree: "2", name: "Major second" },
  { interval: 3, degree: "b3", name: "Minor third" },
  { interval: 4, degree: "3", name: "Major third" },
  { interval: 5, degree: "4", name: "Perfect fourth" },
  { interval: 6, degree: "#4/b5", name: "Tritone" },
  { interval: 7, degree: "5", name: "Perfect fifth" },
  { interval: 8, degree: "b6", name: "Minor sixth" },
  { interval: 9, degree: "6", name: "Major sixth" },
  { interval: 10, degree: "b7", name: "Flat seventh" },
  { interval: 11, degree: "7", name: "Major seventh" },
]);

export function chordIntervalPresentation(
  interval: number,
): ChordIntervalPresentation | null {
  if (!Number.isInteger(interval) || interval < 0 || interval > 11) return null;
  return CHORD_INTERVAL_PRESENTATIONS[interval] ?? null;
}
