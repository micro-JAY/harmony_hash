import { describe, expect, it } from "vitest";
import { lookupChord } from "./chordData";
import { getChordModifierOptions } from "./chordModifiers";

function requiredChord(name: string) {
  const chord = lookupChord(name);
  if (!chord) throw new Error(`Expected ${name} in the chord catalog`);
  return chord;
}

describe("getChordModifierOptions", () => {
  it("prioritizes major extensions for a major triad", () => {
    const result = getChordModifierOptions(requiredChord("C"), "C");
    expect(result.quick.map((option) => option.label)).toEqual([
      "Cmaj7",
      "C6",
      "Cadd9",
      "C6add9",
      "Cmaj9",
      "Cmaj13",
    ]);
  });

  it("surfaces altered dominant options including G7#9", () => {
    const result = getChordModifierOptions(requiredChord("G7"), "G7");
    expect(result.quick.map((option) => option.label)).toContain("G7#9");
    expect(result.quick.slice(0, 3).map((option) => option.label)).toEqual([
      "G9",
      "G7#9",
      "G7b9",
    ]);
  });

  it("preserves flat spelling and keeps every option dictionary-valid", () => {
    const result = getChordModifierOptions(requiredChord("Bb"), "Bb");
    expect(result.rootLabel).toBe("Bb");
    expect(result.quick.map((option) => option.label)).toContain("Bbmaj7");
    expect(result.all.every((option) => option.label.startsWith("Bb"))).toBe(true);
    expect(result.all.every((option) => lookupChord(option.label)?.entry === option.chord.entry)).toBe(true);
  });

  it("keeps suspended alternatives on the correct natural or accidental root", () => {
    const roots = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    for (const root of roots) {
      const source = requiredChord(root);
      const result = getChordModifierOptions(source, root);
      const suspended = result.all.find((option) => option.label === `${root}sus2`);
      expect(suspended, `${root}sus2 should be offered`).toBeDefined();
      expect(suspended?.chord.root).toBe(source.root);
      expect(lookupChord(`${root}sus2`)?.root).toBe(source.root);
    }
    expect(lookupChord("Csus2")?.entry.Notes).toBe("C-D-G");
    expect(lookupChord("C#sus2")?.entry.Notes).not.toBe("C-D-G");
  });

  it("preserves a real slash bass without confusing 6/9 qualities", () => {
    const result = getChordModifierOptions(requiredChord("D/F#"), "D/F#");
    expect(result.quick.map((option) => option.label)).toContain("Dmaj7/F#");
    expect(result.all.every((option) => option.label.endsWith("/F#"))).toBe(true);

    const sixNine = getChordModifierOptions(requiredChord("C6/9"), "C6/9");
    expect(sixNine.all.some((option) => option.label.endsWith("/9"))).toBe(false);
  });

  it("excludes the current catalog entry and resolves parenthesized qualities", () => {
    const current = requiredChord("Cmaj7");
    const result = getChordModifierOptions(current, "Cmaj7");
    expect(result.all.some((option) => option.chord.entry === current.entry)).toBe(false);
    expect(result.all.map((option) => option.label)).toContain("Cmaj9(#11)");
    expect(lookupChord("Cmaj9(#11)")).toBeDefined();
  });
});
