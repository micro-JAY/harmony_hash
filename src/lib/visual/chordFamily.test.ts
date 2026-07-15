import { describe, expect, it } from "vitest";
import type { ChordEntry, IndexedChord } from "../types";
import { chordFamilyColor, classifyChordFamily } from "./chordFamily";

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
  });

  it("recognizes common display-symbol aliases without dictionary metadata", () => {
    expect(classifyChordFamily("F#sus2")).toBe("suspended");
    expect(classifyChordFamily("Bm7b5")).toBe("diminished");
    expect(classifyChordFamily("G13b9")).toBe("dominant");
    expect(classifyChordFamily("C+7")).toBe("dominant");
    expect(classifyChordFamily("C+")).toBe("augmented");
    expect(classifyChordFamily("Ebm9")).toBe("minor");
    expect(classifyChordFamily("A6")).toBe("major");
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
});
