import { describe, expect, it } from "vitest";
import { intervalColor } from "./musicVisuals";

describe("intervalColor", () => {
  it("keeps one semantic mapping for every named chromatic degree", () => {
    const colors = Array.from({ length: 12 }, (_, interval) => intervalColor(interval));

    expect(colors).toHaveLength(12);
    expect(new Set(colors)).toHaveLength(12);
    expect(colors[0]).toBe("var(--music-interval-root)");
  });

  it("normalizes octave-equivalent and negative intervals", () => {
    expect(intervalColor(12)).toBe(intervalColor(0));
    expect(intervalColor(19)).toBe(intervalColor(7));
    expect(intervalColor(-1)).toBe(intervalColor(11));
    expect(intervalColor(Number.NaN)).toBe("var(--text-primary)");
  });
});
