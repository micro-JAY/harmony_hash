import { describe, expect, it } from "vitest";
import { formatNoteForDisplay, lookupChord, prefersFlatNotation } from "./chordData";

describe("formatNoteForDisplay", () => {
  it("formats sharp-encoded notes to # notation", () => {
    expect(formatNoteForDisplay("Cs", false)).toBe("C#");
    expect(formatNoteForDisplay("Fs", false)).toBe("F#");
  });

  it("formats flat-encoded notes to b notation", () => {
    expect(formatNoteForDisplay("Ef", true)).toBe("Eb");
    expect(formatNoteForDisplay("Bf", true)).toBe("Bb");
  });

  it("chooses enharmonic display by preference", () => {
    expect(formatNoteForDisplay("As", true)).toBe("Bb");
    expect(formatNoteForDisplay("Bf", false)).toBe("A#");
  });

  it("keeps natural note names unchanged", () => {
    expect(formatNoteForDisplay("C", true)).toBe("C");
    expect(formatNoteForDisplay("G", false)).toBe("G");
  });
});

describe("prefersFlatNotation", () => {
  it("returns true for flat roots", () => {
    expect(prefersFlatNotation("Bb")).toBe(true);
    expect(prefersFlatNotation("Eb")).toBe(true);
    expect(prefersFlatNotation("As")).toBe(true);
  });

  it("returns false for natural and sharp roots", () => {
    expect(prefersFlatNotation("C")).toBe(false);
    expect(prefersFlatNotation("F#")).toBe(false);
  });
});

describe("lookupChord slash chords", () => {
  it("resolves a slash chord and bakes bass into displayName", () => {
    const result = lookupChord("D/F#");
    expect(result).toBeDefined();
    expect(result?.bass).toBe("F#");
    expect(result?.displayName).toBe("D/F#");
    expect(result?.svgBasePath).toBe(lookupChord("D")?.svgBasePath);
  });

  it("preserves the upper chord quality through the slash", () => {
    const result = lookupChord("Am7/E");
    expect(result).toBeDefined();
    expect(result?.bass).toBe("E");
    expect(result?.displayName).toBe("Am7/E");
    expect(result?.quality).toBe(lookupChord("Am7")?.quality);
  });

  it("rejects an unknown bass note", () => {
    expect(lookupChord("D/Z")).toBeUndefined();
  });

  it("rejects nested slashes", () => {
    expect(lookupChord("D/F#/A")).toBeUndefined();
  });

  it("resolves dictionary chords whose quality contains a slash (e.g. 6/9)", () => {
    const result = lookupChord("C6/9");
    expect(result).toBeDefined();
    // Dictionary alias, not a slash chord — no bass should be attached.
    expect(result?.bass).toBeUndefined();
    expect(result?.displayName).not.toContain("/9");
  });

  it("does not mutate the cached upper chord entry", () => {
    const plainD = lookupChord("D");
    const slashed = lookupChord("D/A");
    expect(slashed?.displayName).toBe("D/A");
    expect(plainD?.displayName).toBe("D");
    expect(plainD?.bass).toBeUndefined();
  });
});
