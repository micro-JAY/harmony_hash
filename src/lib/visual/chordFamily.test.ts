import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import type { ChordEntry, IndexedChord } from "../types";
import {
  chordFamilyColor,
  chordFamilyPresentation,
  classifyChordFamily,
} from "./chordFamily";

function chord(quality: string, type: ChordEntry["Type"]): IndexedChord {
  return {
    root: "C",
    quality,
    displayName: `C${quality}`,
    svgBasePath: "/music_src/chords/c",
    variationCount: 1,
    entry: {
      "Chord Name": `C${quality}`,
      Notes: "C-E-G",
      Steps: "1-3-5",
      Symbols: quality,
      Type: type,
      "Variation Count": 1,
      "Usage Notes": "",
    },
  };
}

describe("classifyChordFamily", () => {
  it("uses the requested structural priority for overlapping qualities", () => {
    expect(classifyChordFamily(chord("7sus4", "Dominant"))).toBe("suspended");
    expect(classifyChordFamily(chord("dim7", "Dominant"))).toBe("diminished");
    expect(classifyChordFamily(chord("7#5", "Dominant"))).toBe("dominant");
    expect(classifyChordFamily(chord("aug", "Other"))).toBe("augmented");
    expect(classifyChordFamily(chord("mmaj7", "Minor"))).toBe("minor");
    expect(classifyChordFamily(chord("maj7", "Major"))).toBe("major");
    expect(classifyChordFamily(chord("mmaj9", "Major"))).toBe("minor");
    expect(classifyChordFamily(chord("-5", "Major"))).toBe("major");
  });

  it("recognizes common display-symbol aliases without dictionary metadata", () => {
    expect(classifyChordFamily("F#sus2")).toBe("suspended");
    expect(classifyChordFamily("Bm7b5")).toBe("diminished");
    expect(classifyChordFamily("G13b9")).toBe("dominant");
    expect(classifyChordFamily("C+7")).toBe("dominant");
    expect(classifyChordFamily("C+")).toBe("augmented");
    expect(classifyChordFamily("Ebm9")).toBe("minor");
    expect(classifyChordFamily("A6")).toBe("major");
    expect(classifyChordFamily("CM7")).toBe("major");
    expect(classifyChordFamily("C-5")).toBe("major");
    expect(classifyChordFamily("Fsus2")).toBe("suspended");
    expect(classifyChordFamily("C7/E")).toBe("dominant");
    expect(classifyChordFamily("C/E")).toBe("major");
    expect(classifyChordFamily("Cm7#5")).toBe("minor");
  });

  it("returns semantic tokens for both chords and explicit families", () => {
    expect(chordFamilyColor("G7")).toBe("var(--music-chord-dominant)");
    expect(chordFamilyColor("diminished")).toBe("var(--music-chord-diminished)");
    expect(chordFamilyColor(chord("m7", "Minor"))).toBe("var(--music-chord-minor)");
  });

  it("does not misclassify dictionary alias catalogs", () => {
    const major = chord("maj", "Major");
    major.entry.Symbols = "M, maj";
    expect(classifyChordFamily(major)).toBe("major");

    const minorWithBadLegacyType = chord("m", "Sustained");
    minorWithBadLegacyType.entry.Symbols = "m, min, -";
    expect(classifyChordFamily(minorWithBadLegacyType)).toBe("minor");
  });

  it.each([
    ["C", "major"],
    ["C6", "major"],
    ["Cmaj13(#11)", "major"],
    ["Cm", "minor"],
    ["Cm6add9", "minor"],
    ["Cmmaj7", "minor"],
    ["Cm7#5", "minor"],
    ["Cm7+", "minor"],
    ["C7", "dominant"],
    ["C13b9", "dominant"],
    ["C7#5", "dominant"],
    ["Csus2", "suspended"],
    ["Fsus2", "suspended"],
    ["C7sus4", "suspended"],
    ["Cdim", "diminished"],
    ["Cdim7", "diminished"],
    ["Cm7b5", "diminished"],
    ["Caug", "augmented"],
  ] as const)("classifies dictionary chord %s as %s", (name, family) => {
    const resolved = lookupChord(name);
    if (!resolved) throw new Error(`${name} is missing from the chord dictionary`);
    expect(classifyChordFamily(resolved)).toBe(family);
  });

  it("classifies slash chords from the upper structure", () => {
    const dominantInversion = lookupChord("C7/E");
    if (!dominantInversion) throw new Error("C7/E is missing from the chord dictionary");
    expect(classifyChordFamily(dominantInversion)).toBe("dominant");
  });

  it("uses a contrast-safe filled presentation only for deep-red dominants", () => {
    expect(chordFamilyPresentation("dominant")).toEqual({
      family: "dominant",
      color: "var(--music-chord-on-dominant)",
      backgroundColor: "var(--music-chord-dominant)",
      borderColor: "var(--music-chord-dominant)",
    });
    expect(chordFamilyPresentation("major")).toMatchObject({
      family: "major",
      color: "var(--music-chord-major)",
    });
  });
});
