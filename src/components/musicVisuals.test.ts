import { describe, expect, it } from "vitest";
import { matchColorForPercent } from "./musicVisuals";

describe("matchColorForPercent", () => {
  it("uses every semantic score stop at its boundary", () => {
    expect(matchColorForPercent(0)).toBe("var(--music-match-low)");
    expect(matchColorForPercent(50)).toBe("var(--music-match-mid)");
    expect(matchColorForPercent(70)).toBe("var(--music-match-good)");
    expect(matchColorForPercent(100)).toBe("var(--music-match-high)");
  });

  it("interpolates within the surrounding semantic range", () => {
    expect(matchColorForPercent(25)).toBe(
      "color-mix(in srgb, var(--music-match-low) 50%, var(--music-match-mid) 50%)",
    );
    expect(matchColorForPercent(60)).toBe(
      "color-mix(in srgb, var(--music-match-mid) 50%, var(--music-match-good) 50%)",
    );
    expect(matchColorForPercent(85)).toBe(
      "color-mix(in srgb, var(--music-match-good) 50%, var(--music-match-high) 50%)",
    );
  });

  it.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid score of %s",
    (percent) => {
      expect(() => matchColorForPercent(percent)).toThrow(RangeError);
    },
  );
});
