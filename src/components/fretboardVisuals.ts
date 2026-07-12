import type { ScaleFormulaType } from "../lib/theory/scaleBasics";

const INTERVAL_COLORS: Readonly<Record<number, string>> = Object.freeze({
  0: "var(--music-interval-root)",
  1: "var(--music-interval-flat-2)",
  2: "var(--music-interval-2)",
  3: "var(--music-interval-minor-3)",
  4: "var(--music-interval-major-3)",
  5: "var(--music-interval-4)",
  6: "var(--music-interval-tritone)",
  7: "var(--music-interval-5)",
  8: "var(--music-interval-flat-6)",
  9: "var(--music-interval-6)",
  10: "var(--music-interval-flat-7)",
  11: "var(--music-interval-major-7)",
});

const INTERVAL_NAMES: Readonly<Record<number, string>> = Object.freeze({
  0: "Root",
  1: "Flat second",
  2: "Major second",
  3: "Minor third",
  4: "Major third",
  5: "Perfect fourth",
  6: "Flat fifth",
  7: "Perfect fifth",
  8: "Minor sixth",
  9: "Major sixth",
  10: "Flat seventh",
  11: "Major seventh",
});

export function fretboardIntervalColor(interval: number): string {
  return INTERVAL_COLORS[interval] ?? "var(--text-primary)";
}

export function fretboardIntervalName(interval: number, scaleType: ScaleFormulaType): string {
  if (interval === 6 && scaleType === "lydian") return "Raised fourth";
  if (interval === 6 && scaleType === "minor_blues") return "Flat fifth (blue note)";
  if (interval === 9 && scaleType === "dorian") return "Raised sixth";
  if (interval === 3 && scaleType === "major_blues") return "Minor third (blue note)";
  if (interval === 8 && ["natural_minor", "harmonic_minor", "phrygian"].includes(scaleType)) {
    return "Flat sixth";
  }
  if (interval === 11 && scaleType === "harmonic_minor") return "Raised seventh";
  return INTERVAL_NAMES[interval] ?? `Interval ${interval}`;
}
