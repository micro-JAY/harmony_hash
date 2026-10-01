import { describe, expect, it } from "vitest";
import { discoveryKeyLabel, identifyChords } from "./chordIdentification";

describe("Discovery chord identification", () => {
  it("follows the user's minor triad, seventh, and moved-bass examples", () => {
    expect(identifyChords([60, 63, 67])[0].symbol).toBe("Cmin");
    expect(identifyChords([60, 63, 67, 70])[0].symbol).toBe("Cmin7");
    expect(identifyChords([60, 63, 67, 70]).map((chord) => chord.symbol)).toContain("Eb/C");
    const inverted = identifyChords([58, 60, 63, 67]);
    expect(inverted[0].symbol).toBe("Eb6/Bb");
    expect(inverted.map((chord) => chord.symbol)).toEqual(expect.arrayContaining(["Cmin7/Bb", "Cmin/Bb"]));
  });

  it.each([
    [[60, 64, 67], "C"], [[64, 67, 72], "C/E"], [[55, 60, 64], "C/G"],
    [[60, 63, 66], "Cdim"], [[60, 64, 68], "Caug"], [[60, 65, 67], "Csus4"],
    [[60, 62, 67], "Csus2"], [[60, 63, 66, 70], "Cmin7b5"], [[60, 63, 66, 69], "Cdim7"],
    [[60, 64, 67, 71], "Cmaj7"], [[60, 63, 67, 71], "Cmin(maj7)"],
    [[60, 62, 64, 67, 70], "C9"], [[60, 62, 63, 65, 67, 70], "Cmin11"],
    [[60, 62, 64, 67, 69, 70], "C13"], [[60, 61, 64, 67, 70], "C7b9"],
    [[60, 64, 70], "C7(no5)"], [[60, 67], "C5"],
  ])("identifies %j as %s", (notes, symbol) => {
    expect(identifyChords(notes)[0].symbol).toBe(symbol);
  });

  it("handles every transposition and ignores duplicated octaves", () => {
    for (let root = 0; root < 12; root++) {
      const notes = [48 + root, 52 + root, 55 + root];
      const result = identifyChords(notes)[0];
      expect(result.root).toBe(root);
      expect(result.quality).toBe("Major triad");
      expect(identifyChords([...notes, ...notes.map((midi) => midi + 12)])[0]).toEqual(result);
    }
  });

  it("does not invent matches for silence, one pitch, or arbitrary clusters", () => {
    expect(identifyChords([])).toEqual([]);
    expect(identifyChords([60, 72])).toEqual([]);
    expect(identifyChords([60, 61, 62])).toEqual([]);
    expect(identifyChords(Array.from({ length: 12 }, (_, index) => 60 + index))).toEqual([]);
    expect(() => identifyChords([128])).toThrow(RangeError);
    expect(() => identifyChords([60.5])).toThrow(RangeError);
  });

  it("shows enharmonic names and unambiguous octave labels", () => {
    expect(discoveryKeyLabel(63)).toBe("Eb4 / D#4");
    expect(discoveryKeyLabel(60)).toBe("C4");
  });
});
