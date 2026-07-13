import { describe, expect, it } from "vitest";
import { fretboardIntervalColor, fretboardIntervalName } from "./fretboardVisuals";

describe("fretboardVisuals", () => {
  it("maps easily confused scale roles to separate semantic tokens", () => {
    expect(new Set([
      fretboardIntervalColor(2),
      fretboardIntervalColor(5),
      fretboardIntervalColor(7),
    ]).size).toBe(3);
    expect(fretboardIntervalColor(3)).not.toBe(fretboardIntervalColor(10));
  });

  it("keeps mode-specific learning labels alongside the color mapping", () => {
    expect(fretboardIntervalName(6, "lydian")).toBe("Raised fourth");
    expect(fretboardIntervalName(9, "dorian")).toBe("Raised sixth");
    expect(fretboardIntervalName(11, "harmonic_minor")).toBe("Raised seventh");
  });
});
