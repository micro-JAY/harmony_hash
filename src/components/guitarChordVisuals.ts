import { intervalColor } from "../lib/visual/musicVisuals";

export interface GuitarDegreePresentation {
  readonly interval: number | null;
  readonly color: string;
  readonly labelColor: string;
}

export function guitarDegreePresentation(
  pitchClass: number,
  rootPitchClass: number,
): GuitarDegreePresentation {
  if (
    !Number.isInteger(pitchClass)
    || pitchClass < 0
    || pitchClass > 11
    || !Number.isInteger(rootPitchClass)
    || rootPitchClass < 0
    || rootPitchClass > 11
  ) {
    return {
      interval: null,
      color: "var(--instrument-key-white)",
      labelColor: "var(--instrument-key-white-text)",
    };
  }

  const interval = (pitchClass - rootPitchClass + 12) % 12;
  return {
    interval,
    color: intervalColor(interval),
    labelColor: "var(--text-inverse)",
  };
}
