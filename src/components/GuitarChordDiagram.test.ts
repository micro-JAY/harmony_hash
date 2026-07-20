import { describe, expect, it } from "vitest";
import { intervalColor } from "../lib/visual/musicVisuals";
import { guitarDegreePresentation } from "./guitarChordVisuals";

describe("guitarDegreePresentation", () => {
  it("maps every played pitch class to the shared chord-relative palette", () => {
    for (let interval = 0; interval < 12; interval += 1) {
      const pitchClass = (4 + interval) % 12;
      expect(guitarDegreePresentation(pitchClass, 4)).toEqual({
        interval,
        color: intervalColor(interval),
        labelColor: "var(--text-inverse)",
      });
    }
  });

  it("wraps below-root pitches consistently for open, high-fret, and barre positions", () => {
    expect(guitarDegreePresentation(4, 4).interval).toBe(0);
    expect(guitarDegreePresentation(11, 4).interval).toBe(7);
    expect(guitarDegreePresentation(2, 4).interval).toBe(10);
  });

  it("falls back safely when a diagram pitch cannot be resolved", () => {
    expect(guitarDegreePresentation(12, 4)).toEqual({
      interval: null,
      color: "var(--palette-white)",
      labelColor: "var(--text-inverse)",
    });
  });
});
