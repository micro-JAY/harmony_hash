import { describe, it, expect } from "vitest";
import { parseChordInput, transposeProgression, computeVoicing, noteToPitchClass } from "./harmonyBrain";

// ─── 4.1: Chord Symbol Normalization ─────────────────────────────────

describe("parseChordInput — alias resolution", () => {
  it("resolves standard major chord", () => {
    const result = parseChordInput("Cmaj7");
    expect(result.errors).toHaveLength(0);
    expect(result.chords).toHaveLength(1);
    expect(result.chords[0].chord.entry.Notes).toBe("C-E-G-B");
  });

  it("resolves Cm7 / Cmin7 / C-7 to the same chord", () => {
    const r1 = parseChordInput("Cm7");
    const r2 = parseChordInput("Cmin7");
    const r3 = parseChordInput("C-7");

    expect(r1.chords[0].chord.entry["Chord Name"]).toBe(r2.chords[0].chord.entry["Chord Name"]);
    expect(r2.chords[0].chord.entry["Chord Name"]).toBe(r3.chords[0].chord.entry["Chord Name"]);
    expect(r1.chords[0].chord.entry.Notes).toBe("C-Ef-G-Bf");
  });

  it("resolves bare root 'C' to major chord", () => {
    const result = parseChordInput("C");
    expect(result.errors).toHaveLength(0);
    expect(result.chords[0].chord.entry.Notes).toBe("C-E-G");
  });

  it("handles multiple chords in sequence", () => {
    const result = parseChordInput("Cmaj7 Dm7 G7 C");
    expect(result.errors).toHaveLength(0);
    expect(result.chords).toHaveLength(4);
    expect(result.chords[0].chord.entry.Notes).toBe("C-E-G-B");
    expect(result.chords[3].chord.entry.Notes).toBe("C-E-G");
  });

  it("resolves flat root notes (Eb, Bb)", () => {
    const result = parseChordInput("Ebm7");
    expect(result.errors).toHaveLength(0);
    expect(result.chords[0].chord.entry.Notes).toBe("Ds-Gf-As-Df");
  });

  it("resolves sharp root notes (F#, C#)", () => {
    const result = parseChordInput("F#m7");
    expect(result.errors).toHaveLength(0);
    expect(result.chords).toHaveLength(1);
  });
});

// ─── 4.2: Transposition Across All 12 Keys ──────────────────────────

describe("transposeProgression", () => {
  it("transposes I V vi IV in C major", () => {
    const result = transposeProgression(["I", "V", "vi", "IV"], "C", "major");
    expect(result).toEqual(["C", "G", "Am", "F"]);
  });

  it("transposes ii V I in D major", () => {
    const result = transposeProgression(["ii", "V", "I"], "D", "major");
    expect(result).toEqual(["Em", "A", "D"]);
  });

  it("transposes I V vi IV in G major", () => {
    const result = transposeProgression(["I", "V", "vi", "IV"], "G", "major");
    expect(result).toEqual(["G", "D", "Em", "C"]);
  });

  it("transposes i V in A harmonic minor", () => {
    const result = transposeProgression(["i", "V"], "A", "harmonic_minor");
    expect(result).toEqual(["Am", "E"]);
  });

  it("transposes bVII in C major", () => {
    const result = transposeProgression(["bVII"], "C", "major");
    expect(result).toEqual(["Bb"]);
  });

  it("transposes ii° V i in harmonic minor", () => {
    const result = transposeProgression(["ii°", "V", "i"], "A", "harmonic_minor");
    expect(result[0]).toBe("Bdim");
    expect(result[1]).toBe("E");
    expect(result[2]).toBe("Am");
  });

  it("transposes through all 12 major keys for I IV V", () => {
    const keys = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
    for (const key of keys) {
      const result = transposeProgression(["I", "IV", "V"], key, "major");
      expect(result).toHaveLength(3);
      // Each result should be a non-empty string
      for (const chord of result) {
        expect(chord.length).toBeGreaterThan(0);
      }
    }
  });

  it("transposes Dorian modal progression", () => {
    const result = transposeProgression(["i", "IV"], "D", "dorian");
    expect(result).toEqual(["Dm", "G"]);
  });

  it("transposes Mixolydian modal progression", () => {
    const result = transposeProgression(["I", "bVII", "IV"], "G", "mixolydian");
    expect(result[0]).toBe("G");
    expect(result[1]).toBe("F");
    expect(result[2]).toBe("C");
  });
});

// ─── 4.3: Drop 2 Voicing ────────────────────────────────────────────

describe("computeVoicing", () => {
  it("keeps triads in root position", () => {
    const voicing = computeVoicing(["C", "E", "G"]);
    expect(voicing.voicingType).toBe("root");
    expect(voicing.notes).toHaveLength(3);
    // All in same hand
    expect(voicing.notes.every((n) => n.hand === "right")).toBe(true);
  });

  it("applies Drop 2 to Cmaj7 (C-E-G-B)", () => {
    const voicing = computeVoicing(["C", "E", "G", "B"]);
    expect(voicing.voicingType).toBe("drop2");
    expect(voicing.notes).toHaveLength(4);

    // In Drop 2, the 2nd-highest note (G) drops down an octave
    // Closed position: C4-E4-G4-B4
    // Drop 2: G3-C4-E4-B4
    const noteNames = voicing.notes.map((n) => `${n.name}${n.octave}`);
    expect(noteNames).toEqual(["G3", "C4", "E4", "B4"]);
  });

  it("marks dropped note as left hand", () => {
    const voicing = computeVoicing(["C", "E", "G", "B"]);
    const leftHandNotes = voicing.notes.filter((n) => n.hand === "left");
    expect(leftHandNotes).toHaveLength(1);
    expect(leftHandNotes[0].name).toBe("G");
    expect(leftHandNotes[0].octave).toBe(3);
  });

  it("handles extended chords (5+ notes)", () => {
    // Cmaj9: C-E-G-B-D
    const voicing = computeVoicing(["C", "E", "G", "B", "D"]);
    expect(voicing.voicingType).toBe("drop2");
    expect(voicing.notes).toHaveLength(5);
  });

  it("returns empty for no notes", () => {
    const voicing = computeVoicing([]);
    expect(voicing.notes).toHaveLength(0);
    expect(voicing.voicingType).toBe("root");
  });
});

// ─── 4.4: Edge Cases ─────────────────────────────────────────────────

describe("parseChordInput — edge cases", () => {
  it("returns empty array for empty input", () => {
    const result = parseChordInput("");
    expect(result.chords).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns empty array for whitespace-only input", () => {
    const result = parseChordInput("   ");
    expect(result.chords).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error for unrecognized chord", () => {
    const result = parseChordInput("Xfoo");
    expect(result.chords).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].input).toBe("Xfoo");
  });

  it("handles mix of valid and invalid chords", () => {
    const result = parseChordInput("Cmaj7 Xfoo G7");
    expect(result.chords).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.chords[0].input).toBe("Cmaj7");
    expect(result.chords[1].input).toBe("G7");
    expect(result.errors[0].input).toBe("Xfoo");
  });

  it("strips parentheses: E7(#9) → E7#9", () => {
    const result = parseChordInput("E7(#9)");
    expect(result.errors).toHaveLength(0);
    expect(result.chords).toHaveLength(1);
  });

  it("strips parentheses: G13(sus4) → G13sus4", () => {
    // G13sus4 may not be in the catalog — check if it resolves
    const result = parseChordInput("G13(sus4)");
    // Either it resolves or shows as error, but shouldn't crash
    expect(result.chords.length + result.errors.length).toBe(1);
  });
});

describe("noteToPitchClass", () => {
  it("maps C to 0", () => expect(noteToPitchClass("C")).toBe(0));
  it("maps Ef (E-flat) to 3", () => expect(noteToPitchClass("Ef")).toBe(3));
  it("maps Gs (G-sharp) to 8", () => expect(noteToPitchClass("Gs")).toBe(8));
  it("maps Bf (B-flat) to 10", () => expect(noteToPitchClass("Bf")).toBe(10));
  it("returns -1 for unknown", () => expect(noteToPitchClass("X")).toBe(-1));
});
