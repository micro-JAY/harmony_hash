import { describe, expect, it } from "vitest";
import { formatNoteForDisplay, prefersFlatNotation } from "./chordData";

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
