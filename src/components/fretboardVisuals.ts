import type { ScaleFormulaType } from "../lib/theory/scaleBasics";
export { intervalColor as fretboardIntervalColor } from "../lib/visual/musicVisuals";

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
