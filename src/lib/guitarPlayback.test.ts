import { describe, expect, it } from "vitest";
import type { ParsedDot, ParsedGuitarSvg } from "./guitarSvgParser";
import { deriveGuitarMidiVoicing } from "./guitarPlayback";

function dot(
  stringIndex: number,
  fretNumber: number,
  source: ParsedDot["source"] = "circle",
): ParsedDot {
  const openMidis = [64, 59, 55, 50, 45, 40];
  const midi = openMidis[stringIndex] + fretNumber;
  return {
    cx: 195 - stringIndex * 30,
    cy: fretNumber === 0 ? 19 : 56,
    r: 13,
    stringIndex,
    fretNumber,
    pitchClass: midi % 12,
    midi,
    source,
  };
}

function parsed(
  dots: ParsedDot[],
  mutedStringIndexes: number[] = [],
): ParsedGuitarSvg {
  return { svgText: "<svg />", dots, fretOffset: 1, mutedStringIndexes };
}

describe("guitar MIDI voicing derivation", () => {
  it("derives an open C shape in physical low-to-high string order", () => {
    const result = deriveGuitarMidiVoicing(parsed([
      dot(4, 3),
      dot(3, 2),
      dot(2, 0),
      dot(1, 1),
      dot(0, 0),
    ], [5]), "/music_src/chords/c/var_1.svg");

    expect(result.notes.map((note) => note.stringIndex)).toEqual([4, 3, 2, 1, 0]);
    expect(result.notes.map((note) => note.midi)).toEqual([48, 52, 55, 60, 64]);
  });

  it("keeps duplicate pitch classes sounded on distinct strings", () => {
    const result = deriveGuitarMidiVoicing(parsed([
      dot(5, 0),
      dot(3, 2),
      dot(0, 0),
    ]), "/shape.svg");

    expect(result.notes.map((note) => note.midi)).toEqual([40, 52, 64]);
    expect(result.notes.map((note) => note.midi % 12)).toEqual([4, 4, 4]);
  });

  it("uses an explicit finger marker instead of a conflicting barre marker", () => {
    const result = deriveGuitarMidiVoicing(parsed([
      dot(5, 1, "barre"),
      dot(4, 1, "barre"),
      dot(4, 3, "circle"),
      dot(3, 1, "barre"),
    ]), "/barre.svg");

    expect(result.notes.map(({ stringIndex, fretNumber }) => [stringIndex, fretNumber])).toEqual([
      [5, 1],
      [4, 3],
      [3, 1],
    ]);
  });

  it("omits muted strings even when malformed source data includes a marker", () => {
    const result = deriveGuitarMidiVoicing(parsed([dot(5, 3), dot(4, 3)], [5]), "/muted.svg");
    expect(result.notes).toEqual([{ stringIndex: 4, fretNumber: 3, midi: 48 }]);
  });

  it("keeps selected variants distinct through their source path", () => {
    expect(deriveGuitarMidiVoicing(parsed([dot(5, 3)]), "/var_1.svg").sourcePath).toBe(
      "/var_1.svg",
    );
    expect(deriveGuitarMidiVoicing(parsed([dot(5, 8)]), "/var_2.svg").sourcePath).toBe(
      "/var_2.svg",
    );
  });

  it("rejects conflicting direct markers and invalid absolute MIDI data", () => {
    expect(() => deriveGuitarMidiVoicing(parsed([dot(2, 2), dot(2, 4)]), "/bad.svg"))
      .toThrow("Conflicting guitar markers on string 2");

    const invalid = { ...dot(0, 1), midi: 999 };
    expect(() => deriveGuitarMidiVoicing(parsed([invalid]), "/bad.svg"))
      .toThrow("does not match string 0 fret 1");
  });

  it("rejects empty and fully muted diagrams", () => {
    expect(() => deriveGuitarMidiVoicing(parsed([]), "/empty.svg"))
      .toThrow("no playable strings");
    expect(() => deriveGuitarMidiVoicing(parsed([dot(5, 0)], [5]), "/muted.svg"))
      .toThrow("no playable strings");
  });
});
