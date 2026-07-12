import { describe, expect, it } from "vitest";
import { getChordCatalog, lookupChord, searchChordCatalog } from "../chordData";
import { chordPitchClasses, deriveChordTones } from "./chordTones";

function chord(name: string) {
  const resolved = lookupChord(name);
  if (!resolved) throw new Error(`Missing test chord ${name}`);
  return resolved;
}

describe("shared chord tone and catalog helpers", () => {
  it("derives Cmaj7 degrees and G7#9 alteration from dictionary data", () => {
    expect(deriveChordTones(chord("Cmaj7")).map((tone) => [tone.noteLabel, tone.degree])).toEqual([
      ["C", "1"], ["E", "3"], ["G", "5"], ["B", "7"],
    ]);
    expect(deriveChordTones(chord("G7#9")).map((tone) => [tone.noteLabel, tone.degree])).toEqual([
      ["G", "1"], ["B", "3"], ["D", "5"], ["F", "b7"], ["A#", "#9"],
    ]);
  });

  it("adds a distinct slash bass once and deduplicates an existing chord tone", () => {
    expect(deriveChordTones(chord("C/D")).at(-1)).toMatchObject({
      noteLabel: "D", degree: "bass", role: "bass", pitchClass: 2,
    });
    expect(deriveChordTones(chord("D/F#"))).toHaveLength(3);
    expect(chordPitchClasses(chord("D/F#"))).toEqual([2, 6, 9]);
  });

  it("preserves flat display spelling when the selected dictionary identity uses flats", () => {
    expect(deriveChordTones(chord("Bbmaj7")).map((tone) => tone.noteLabel)).toEqual([
      "Bb", "D", "F", "A",
    ]);
  });

  it("publishes a unique frozen catalog and caps name/alias search at 24", () => {
    const catalog = getChordCatalog();
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog[0])).toBe(true);
    expect(new Set(catalog.map((item) => item.longName)).size).toBe(catalog.length);
    expect(searchChordCatalog("G7#9").some((item) => lookupChord(item.label)?.displayName === "G7#9")).toBe(true);
    expect(searchChordCatalog("major")).toHaveLength(24);
    expect(Object.isFrozen(searchChordCatalog("Cmaj7"))).toBe(true);
    expect(() => searchChordCatalog("C", 0)).toThrow(RangeError);
  });
});
