import { describe, it, expect } from "vitest";
import {
  parseChordInput,
  transposeProgression,
  computeVoicing,
  computeVoiceLedProgression,
  computeVoicingForStyle,
  computeVoicingComparisons,
  enumerateVoicingCandidatesForStyle,
  EXPLICIT_VOICING_STYLES,
  isStyleApplicable,
  isVoicingStyleAvailable,
  noteToPitchClass,
} from "./harmonyBrain";
import type { VoicedChord, VoicedNote, VoicingStyle } from "./types";

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

  it("does not duplicate minor quality for lowercase numerals with m-suffix extensions", () => {
    const result = transposeProgression(["im", "im7", "iim9"], "A", "natural_minor");
    expect(result).toEqual(["Am", "Am7", "Bm9"]);
  });

  it("preserves maj extensions when lower-case numeral suffix starts with maj", () => {
    const result = transposeProgression(["iimaj7"], "A", "natural_minor");
    expect(result).toEqual(["Bmmaj7"]);
  });

  it("resolves slash numerals using the primary numeral token", () => {
    const result = transposeProgression(["I/III", "V/ii", "ii"], "F", "major");
    expect(result).toEqual(["F", "C", "Gm"]);
  });
});

// ─── 4.3: Drop 2 Voicing ────────────────────────────────────────────

describe("computeVoicing", () => {
  it("keeps triads in root position", () => {
    const voicing = computeVoicing(["C", "E", "G"]);
    expect(voicing.voicingType).toBe("root");
    expect(voicing.notes).toHaveLength(3);
    expect(voicing.notes.map((n) => `${n.name}${n.octave}`)).toEqual(["C3", "E3", "G3"]);
    // All in same hand
    expect(voicing.notes.every((n) => n.hand === "right")).toBe(true);
  });

  it("applies Drop 2 when the dropped note remains within the visible range", () => {
    const voicing = computeVoicing(["B", "D", "Fs", "A"]);
    expect(voicing.voicingType).toBe("drop2");
    expect(voicing.notes).toHaveLength(4);
    const noteNames = voicing.notes.map((n) => `${n.name}${n.octave}`);
    expect(noteNames).toEqual(["Fs3", "B3", "D4", "A4"]);
  });

  it("skips Drop 2 when dropping would underflow below C3", () => {
    const voicing = computeVoicing(["C", "E", "G", "B"]);
    expect(voicing.voicingType).toBe("root");
    expect(voicing.notes.map((n) => `${n.name}${n.octave}`)).toEqual(["C3", "E3", "G3", "B3"]);
  });

  it("marks dropped note as left hand for drop-2 voicings", () => {
    const voicing = computeVoicing(["B", "D", "Fs", "A"]);
    const leftHandNotes = voicing.notes.filter((n) => n.hand === "left");
    expect(leftHandNotes).toHaveLength(1);
    expect(leftHandNotes[0].name).toBe("Fs");
    expect(leftHandNotes[0].octave).toBe(3);
  });

  it("handles extended chords (5+ notes) while keeping notes visible", () => {
    // Cmaj9: C-E-G-B-D (drop would underflow below C3, so root position is used)
    const voicing = computeVoicing(["C", "E", "G", "B", "D"]);
    expect(voicing.voicingType).toBe("root");
    expect(voicing.notes).toHaveLength(5);
    expect(voicing.notes.every((note) => note.midi >= 48 && note.midi <= 83)).toBe(true);
  });

  it("returns empty for no notes", () => {
    const voicing = computeVoicing([]);
    expect(voicing.notes).toHaveLength(0);
    expect(voicing.voicingType).toBe("root");
  });

  it("keeps common triads and sevenths fully visible in C3-B5", () => {
    const chords = [
      ["As", "D", "F"],       // Bb
      ["B", "Ds", "Fs"],      // B
      ["Fs", "As", "Cs"],     // F#
      ["As", "D", "F", "A"],  // Bbmaj7
      ["A", "C", "E", "G"],   // Am7
    ];

    for (const chord of chords) {
      const voicing = computeVoicing(chord);
      expect(voicing.notes).toHaveLength(chord.length);
      expect(voicing.notes.every((note) => note.midi >= 48 && note.midi <= 83)).toBe(true);
    }
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

// ─── 4.5: Voice-Leading Across a Progression ───────────────────────

function midis(v: VoicedChord): number[] {
  return v.notes.map((n) => n.midi);
}

function totalDistance(progression: VoicedChord[]): number {
  // Sum of `voicingDistance(prev, curr)` style metric (re-implemented
  // here to keep the test independent of the engine's private helper).
  let total = 0;
  for (let i = 1; i < progression.length; i++) {
    const prev = progression[i - 1].notes;
    const curr = progression[i].notes;
    for (const c of curr) {
      let min = Infinity;
      for (const p of prev) {
        const d = Math.abs(c.midi - p.midi);
        if (d < min) min = d;
      }
      total += min;
    }
  }
  return total;
}

function naiveProgression(progressionNotes: string[][]): VoicedChord[] {
  return progressionNotes.map((notes) => computeVoicing(notes));
}

function withinVisibleRange(notes: VoicedNote[]): boolean {
  return notes.every((n) => n.midi >= 48 && n.midi <= 83);
}

describe("computeVoiceLedProgression", () => {
  it("returns an empty list for empty input", () => {
    expect(computeVoiceLedProgression([])).toEqual([]);
  });

  it("returns computeVoicing's output unchanged for a single-chord input", () => {
    const single = [["C", "E", "G"]];
    const result = computeVoiceLedProgression(single);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(computeVoicing(single[0]));
  });

  it("anchors the first chord with computeVoicing in multi-chord progressions", () => {
    const result = computeVoiceLedProgression([
      ["D", "F", "A", "C"],
      ["G", "B", "D", "F"],
    ]);
    expect(result[0]).toEqual(computeVoicing(["D", "F", "A", "C"]));
  });

  it("voice-leads ii-V-I in C major with reduced cumulative motion", () => {
    const progression = [
      ["D", "F", "A", "C"], // Dm7
      ["G", "B", "D", "F"], // G7
      ["C", "E", "G", "B"], // Cmaj7
    ];
    const result = computeVoiceLedProgression(progression);

    expect(result).toHaveLength(3);

    // Dm7 anchors at the default (root position, oct 3) — Drop 2
    // underflows because dropping A3 lands at A2 (MIDI 45 < 48).
    expect(midis(result[0])).toEqual([50, 53, 57, 60]);
    expect(result[0].voicingType).toBe("root");

    // G7 picks inversion [D, F, G, B] at oct 3 (3 semitones of motion).
    expect(midis(result[1])).toEqual([50, 53, 55, 59]);
    expect(result[1].voicingType).toBe("root");

    // Cmaj7 picks inversion [E, G, B, C] at oct 3 (2 semitones of motion).
    expect(midis(result[2])).toEqual([52, 55, 59, 60]);
    expect(result[2].voicingType).toBe("root");

    // Voice-led cumulative distance must be strictly less than naive.
    const led = totalDistance(result);
    const naive = totalDistance(naiveProgression(progression));
    expect(led).toBeLessThan(naive);
    expect(led).toBe(5); // 3 (Dm7→G7) + 2 (G7→Cmaj7)
  });

  it("voice-leads I-vi-IV-V triads in C major", () => {
    const progression = [
      ["C", "E", "G"],
      ["A", "C", "E"],
      ["F", "A", "C"],
      ["G", "B", "D"],
    ];
    const result = computeVoiceLedProgression(progression);

    expect(result).toHaveLength(4);

    // C: default closed voicing at oct 3
    expect(midis(result[0])).toEqual([48, 52, 55]);

    // Am: inversion [C, E, A] retains C3 + E3, moves G3→A3 (2 semitones)
    expect(midis(result[1])).toEqual([48, 52, 57]);

    // F: inversion [C, F, A] retains C3 + A3, moves E3→F3 (1 semitone)
    expect(midis(result[2])).toEqual([48, 53, 57]);

    // G: inversion [D, G, B] – D3 G3 B3
    expect(midis(result[3])).toEqual([50, 55, 59]);

    // Each chord uses closed root-position spacing (triads only).
    for (const chord of result) {
      expect(chord.voicingType).toBe("root");
    }

    // Voice-led beats naive.
    expect(totalDistance(result)).toBeLessThan(totalDistance(naiveProgression(progression)));
  });

  it("voice-leads ii°-V-i in A harmonic minor", () => {
    // ii° = Bdim = B-D-F; V = E (major triad) = E-G#-B; i = Am = A-C-E
    const progression = [
      ["B", "D", "F"],
      ["E", "Gs", "B"],
      ["A", "C", "E"],
    ];
    const result = computeVoiceLedProgression(progression);

    expect(result).toHaveLength(3);
    // Bdim anchors at oct 3 closed.
    expect(midis(result[0])).toEqual([59, 62, 65]); // B3, D4, F4

    // E (major) voice-leads with smooth motion.
    // Subsequent voicings stay within the visible range.
    expect(withinVisibleRange(result[1].notes)).toBe(true);
    expect(withinVisibleRange(result[2].notes)).toBe(true);

    // Voice-led beats naive on cumulative motion.
    expect(totalDistance(result)).toBeLessThanOrEqual(totalDistance(naiveProgression(progression)));
  });

  it("stabilizes a repeated-chord vamp (Dm7-G7-Dm7-G7)", () => {
    const progression = [
      ["D", "F", "A", "C"],
      ["G", "B", "D", "F"],
      ["D", "F", "A", "C"],
      ["G", "B", "D", "F"],
    ];
    const result = computeVoiceLedProgression(progression);

    expect(result).toHaveLength(4);
    // Positions 0 and 2 are the same chord and must voice identically.
    expect(midis(result[0])).toEqual(midis(result[2]));
    expect(result[0].voicingType).toBe(result[2].voicingType);
    // Likewise positions 1 and 3.
    expect(midis(result[1])).toEqual(midis(result[3]));
    expect(result[1].voicingType).toBe(result[3].voicingType);
  });

  it("keeps every voicing within MIDI 48-83 across many progressions", () => {
    const progressions: string[][][] = [
      // ii-V-I C
      [["D", "F", "A", "C"], ["G", "B", "D", "F"], ["C", "E", "G", "B"]],
      // I-vi-IV-V C
      [["C", "E", "G"], ["A", "C", "E"], ["F", "A", "C"], ["G", "B", "D"]],
      // ii°-V-i in A harmonic minor
      [["B", "D", "F"], ["E", "Gs", "B"], ["A", "C", "E"]],
      // Cmaj9 → Fmaj9 (5-note chords)
      [["C", "E", "G", "B", "D"], ["F", "A", "C", "E", "G"]],
      // High-root triad chain (Bb, B, Fs major)
      [["As", "D", "F"], ["B", "Ds", "Fs"], ["Fs", "As", "Cs"]],
      // Modal vamp: Dm9 → G13
      [["D", "F", "A", "C", "E"], ["G", "B", "D", "F", "A"]],
    ];

    for (const progression of progressions) {
      const result = computeVoiceLedProgression(progression);
      for (const chord of result) {
        expect(withinVisibleRange(chord.notes)).toBe(true);
      }
    }
  });

  it("retains common tones at the same MIDI position when possible", () => {
    // C major → Am: both contain C and E. Voice-led Am should retain
    // C3 (48) and E3 (52) at the same MIDI positions used for C major.
    const progression = [
      ["C", "E", "G"],
      ["A", "C", "E"],
    ];
    const result = computeVoiceLedProgression(progression);
    const firstMidis = new Set(midis(result[0]));
    const secondMidis = midis(result[1]);
    // The shared pitch classes (C=0, E=4) should appear as 48 and 52.
    expect(firstMidis.has(48)).toBe(true);
    expect(firstMidis.has(52)).toBe(true);
    expect(secondMidis).toContain(48);
    expect(secondMidis).toContain(52);
  });
});

// ─── 4.6: Extended Voicing Styles (v3) ─────────────────────────────

describe("isStyleApplicable", () => {
  it("auto is always applicable for non-empty chords", () => {
    expect(isStyleApplicable(["C", "E", "G"], "auto")).toBe(true);
    expect(isStyleApplicable(["C", "E", "G", "B"], "auto")).toBe(true);
    expect(isStyleApplicable([], "auto")).toBe(false);
  });

  it("drop2/drop3/rootless require 4+ notes", () => {
    for (const style of ["drop2", "drop3", "rootless"] as const) {
      expect(isStyleApplicable(["C", "E", "G"], style)).toBe(false);
      expect(isStyleApplicable(["C", "E", "G", "B"], style)).toBe(true);
      expect(isStyleApplicable(["C", "E", "G", "B", "D"], style)).toBe(true);
    }
  });

  it("shell requires 4+ notes AND a true 7th interval", () => {
    expect(isStyleApplicable(["C", "E", "G"], "shell")).toBe(false);
    // Cmaj7 (B is a major 7) — applicable
    expect(isStyleApplicable(["C", "E", "G", "B"], "shell")).toBe(true);
    // C7 (Bf is a minor 7) — applicable
    expect(isStyleApplicable(["C", "E", "G", "Bf"], "shell")).toBe(true);
    // C6 (A is a major 6, not a 7) — NOT applicable
    expect(isStyleApplicable(["C", "E", "G", "A"], "shell")).toBe(false);
    // Cadd9 (D is a 9 in position 3, no 7th in chord) — NOT applicable
    expect(isStyleApplicable(["C", "E", "G", "D"], "shell")).toBe(false);
  });
});

describe("computeVoicingForStyle", () => {
  it("auto matches computeVoicing", () => {
    const noteNames = ["C", "E", "G", "B"];
    expect(computeVoicingForStyle(noteNames, "auto")).toEqual(computeVoicing(noteNames));
  });

  it("returns canonical Drop 2 voicing for Cmaj7", () => {
    // Drop 2 underflows at oct 3 (G2=43 < C3=48); resolves at oct 4.
    // Closed [C4, E4, G4, B4]; drop G4 → G3=55. Sorted: G3-C4-E4-B4.
    const v = computeVoicingForStyle(["C", "E", "G", "B"], "drop2");
    expect(v.notes.map((n) => n.midi)).toEqual([55, 60, 64, 71]);
    expect(v.voicingType).toBe("drop2");
  });

  it("returns canonical Drop 2 voicing for Dm7 (already fits at oct 3 in the v2 default)", () => {
    // Dm7 drop2 underflows at oct 3 (A2=45). At oct 4: closed [D4,F4,A4,C5];
    // drop A4 → A3=57. Sorted: A3-D4-F4-C5.
    const v = computeVoicingForStyle(["D", "F", "A", "C"], "drop2");
    expect(v.notes.map((n) => n.midi)).toEqual([57, 62, 65, 72]);
    expect(v.voicingType).toBe("drop2");
  });

  it("returns canonical Drop 3 voicing for Cmaj7", () => {
    // Drop 3 underflows at oct 3 (E2=40); resolves at oct 4.
    // Closed [C4, E4, G4, B4]; drop E4 → E3=52. Sorted: E3-C4-G4-B4.
    const v = computeVoicingForStyle(["C", "E", "G", "B"], "drop3");
    expect(v.notes.map((n) => n.midi)).toEqual([52, 60, 67, 71]);
    expect(v.voicingType).toBe("drop3");
  });

  it("returns canonical Drop 3 voicing for G7", () => {
    // G7 closed at oct 3: [55, 59, 62, 65]. Drop B3=59 → B2=47 (<48) underflow.
    // Oct 4: closed [67, 71, 74, 77]. Drop B4=71 → B3=59. Sorted: B3-G4-D5-F5.
    const v = computeVoicingForStyle(["G", "B", "D", "F"], "drop3");
    expect(v.notes.map((n) => n.midi)).toEqual([59, 67, 74, 77]);
    expect(v.voicingType).toBe("drop3");
  });

  it("returns rootless voicing for Cmaj7 — [E, G, B]", () => {
    const v = computeVoicingForStyle(["C", "E", "G", "B"], "rootless");
    expect(v.notes.map((n) => n.midi)).toEqual([52, 55, 59]);
    expect(v.voicingType).toBe("rootless");
  });

  it("returns rootless voicing for Cmaj9 — [E, G, B, D]", () => {
    // Cmaj9 = [C, E, G, B, D]. Rootless drops C → [E, G, B, D]. Closed oct 3.
    const v = computeVoicingForStyle(["C", "E", "G", "B", "D"], "rootless");
    expect(v.notes.map((n) => n.midi)).toEqual([52, 55, 59, 62]);
    expect(v.voicingType).toBe("rootless");
  });

  it("returns shell voicing for Cmaj7 — [E, B] (3rd + 7th)", () => {
    const v = computeVoicingForStyle(["C", "E", "G", "B"], "shell");
    expect(v.notes.map((n) => n.midi)).toEqual([52, 59]);
    expect(v.voicingType).toBe("shell");
  });

  it("returns shell voicing for Dm7 — [F, C] (3rd + b7)", () => {
    // Dm7 [D, F, A, C]; index 1 = F, index 3 = C. Closed at oct 3: F3=53,
    // C must go above F3 → C4=60.
    const v = computeVoicingForStyle(["D", "F", "A", "C"], "shell");
    expect(v.notes.map((n) => n.midi)).toEqual([53, 60]);
    expect(v.voicingType).toBe("shell");
  });

  it("returns shell voicing for G7 — [B, F]", () => {
    // G7 [G, B, D, F]; shell = [B, F]. Closed oct 3: B3=59, F=53→65. Sorted: 59-65.
    const v = computeVoicingForStyle(["G", "B", "D", "F"], "shell");
    expect(v.notes.map((n) => n.midi)).toEqual([59, 65]);
    expect(v.voicingType).toBe("shell");
  });

  it("falls back to computeVoicing when style is not applicable (triad + drop2)", () => {
    const v = computeVoicingForStyle(["C", "E", "G"], "drop2");
    expect(v.notes.map((n) => n.midi)).toEqual([48, 52, 55]);
    expect(v.voicingType).toBe("root");
  });

  it("falls back to computeVoicing for C6 shell (no true 7th)", () => {
    const v = computeVoicingForStyle(["C", "E", "G", "A"], "shell");
    // computeVoicing returns the closed root for C6 (drop2 of A would
    // underflow). Notes: C3, E3, G3, A3 = MIDI [48, 52, 55, 57].
    expect(v.notes.map((n) => n.midi)).toEqual([48, 52, 55, 57]);
    expect(v.voicingType).toBe("root");
  });
});

describe("computeVoicingComparisons", () => {
  it("returns every applicable explicit style in canonical order for Cmaj7", () => {
    const comparisons = computeVoicingComparisons(["C", "E", "G", "B"]);

    expect(comparisons.map(({ style }) => style)).toEqual(EXPLICIT_VOICING_STYLES);
    expect(comparisons.map(({ voicing }) => voicing.notes.map(({ midi }) => midi))).toEqual([
      [55, 60, 64, 71],
      [52, 60, 67, 71],
      [52, 55, 59],
      [52, 59],
      [48, 64, 67, 71],
      [48, 55, 64, 71],
    ]);
  });

  it("offers only Spread and Two-Hand for triads", () => {
    expect(computeVoicingComparisons(["C", "E", "G"]).map(({ style }) => style)).toEqual([
      "spread",
      "two-hand",
    ]);
  });

  it("returns no comparisons for empty input", () => {
    expect(computeVoicingComparisons([])).toEqual([]);
  });

  it("is deterministic, range-safe, and does not mutate its input", () => {
    const noteNames = ["G", "B", "D", "F"];
    const original = [...noteNames];
    const first = computeVoicingComparisons(noteNames);
    const second = computeVoicingComparisons(noteNames);

    expect(first).toEqual(second);
    expect(noteNames).toEqual(original);
    for (const { voicing } of first) {
      expect(voicing.notes.every(({ midi }) => midi >= 48 && midi <= 83)).toBe(true);
    }
  });

  it("excludes styles with no in-range candidate for high extended chords", () => {
    const bMajor13 = ["B", "Ds", "Fs", "As", "Cs", "Gs"];

    expect(isStyleApplicable(bMajor13, "spread")).toBe(true);
    expect(isVoicingStyleAvailable(bMajor13, "spread")).toBe(false);
    expect(isVoicingStyleAvailable(bMajor13, "two-hand")).toBe(false);
    expect(computeVoicingComparisons(bMajor13).map(({ style }) => style)).not.toContain("spread");
    expect(computeVoicingComparisons(bMajor13).map(({ style }) => style)).not.toContain("two-hand");
  });

  it("previews the same voice-led candidate a later chord adopts", () => {
    const cMajor7 = ["C", "E", "G", "B"];
    const g7 = ["G", "B", "D", "F"];
    const prior = computeVoiceLedProgression([cMajor7])[0].notes;
    const drop2Preview = computeVoicingComparisons(g7, prior)
      .find(({ style }) => style === "drop2")?.voicing;
    const adopted = computeVoiceLedProgression([cMajor7, g7], ["auto", "drop2"])[1];

    expect(drop2Preview).toEqual(adopted);
  });

  it("falls back to voice-led Auto instead of crashing on an unavailable later style", () => {
    const result = computeVoiceLedProgression(
      [
        ["C", "E", "G", "B"],
        ["B", "Ds", "Fs", "As", "Cs", "Gs"],
      ],
      ["auto", "spread"],
    );

    expect(result).toHaveLength(2);
    expect(result[1].notes.every(({ midi }) => midi >= 48 && midi <= 83)).toBe(true);
    expect(result[1].voicingType).not.toBe("spread");
  });
});

describe("enumerateVoicingCandidatesForStyle", () => {
  it("returns the canonical voicing as candidate 0", () => {
    const candidates = enumerateVoicingCandidatesForStyle(["C", "E", "G", "B"], "drop2");
    expect(candidates[0].notes.map((n) => n.midi)).toEqual([55, 60, 64, 71]);
    expect(candidates[0].voicingType).toBe("drop2");
    expect(candidates.length).toBeGreaterThan(1); // multiple inversions × octaves
  });

  it("returns an empty list for non-applicable styles", () => {
    expect(enumerateVoicingCandidatesForStyle(["C", "E", "G"], "drop2")).toEqual([]);
    expect(enumerateVoicingCandidatesForStyle(["C", "E", "G", "A"], "shell")).toEqual([]);
  });

  it("all candidates stay within MIDI 48-83", () => {
    for (const style of ["auto", "drop2", "drop3", "rootless", "shell"] as VoicingStyle[]) {
      const candidates = enumerateVoicingCandidatesForStyle(["C", "E", "G", "B"], style);
      for (const cand of candidates) {
        expect(cand.notes.every((n) => n.midi >= 48 && n.midi <= 83)).toBe(true);
      }
    }
  });
});

describe("computeVoiceLedProgression with per-chord styles", () => {
  it("ii-V-I in C with all-shell produces a 2-note voice-led chain", () => {
    const result = computeVoiceLedProgression(
      [
        ["D", "F", "A", "C"], // Dm7
        ["G", "B", "D", "F"], // G7
        ["C", "E", "G", "B"], // Cmaj7
      ],
      ["shell", "shell", "shell"],
    );

    expect(result).toHaveLength(3);
    // Dm7 shell: canonical = [F3, C4] = [53, 60]
    expect(result[0].notes.map((n) => n.midi)).toEqual([53, 60]);
    expect(result[0].voicingType).toBe("shell");
    // G7 shell voice-led from [53, 60]: best is [F3, B3] = [53, 59] (1 semitone of motion).
    expect(result[1].notes.map((n) => n.midi)).toEqual([53, 59]);
    expect(result[1].voicingType).toBe("shell");
    // Cmaj7 shell voice-led from [53, 59]: best is [E3, B3] = [52, 59].
    expect(result[2].notes.map((n) => n.midi)).toEqual([52, 59]);
    expect(result[2].voicingType).toBe("shell");
  });

  it("mixed-style progressions (drop2, rootless, auto) voice-lead chord-by-chord", () => {
    const result = computeVoiceLedProgression(
      [
        ["D", "F", "A", "C"], // Dm7
        ["G", "B", "D", "F"], // G7
        ["C", "E", "G", "B"], // Cmaj7
      ],
      ["drop2", "rootless", "auto"],
    );

    expect(result).toHaveLength(3);
    expect(result[0].voicingType).toBe("drop2");
    expect(result[1].voicingType).toBe("rootless");
    // "auto" Cmaj7 from a 3-note rootless prior — engine should pick a smooth Cmaj7.
    expect(result[2].voicingType).toMatch(/root|drop2/);
    for (const chord of result) {
      expect(chord.notes.every((n) => n.midi >= 48 && n.midi <= 83)).toBe(true);
    }
  });

  it("falls back gracefully when a style isn't applicable mid-progression", () => {
    // First chord is a triad — shell isn't applicable. Engine falls back to
    // computeVoicing for that chord without crashing.
    const result = computeVoiceLedProgression(
      [
        ["C", "E", "G"],       // C major triad
        ["G", "B", "D", "F"],  // G7
      ],
      ["shell", "shell"],
    );

    expect(result).toHaveLength(2);
    // First chord: not applicable → computeVoicing default → [48, 52, 55]
    expect(result[0].notes.map((n) => n.midi)).toEqual([48, 52, 55]);
    // Second chord: shell applies → enumerated candidates picked for voice-leading.
    expect(result[1].voicingType).toBe("shell");
  });

  it("explicit styles[] of all 'auto' reproduces the v2 behavior exactly", () => {
    const progression = [
      ["D", "F", "A", "C"],
      ["G", "B", "D", "F"],
      ["C", "E", "G", "B"],
    ];
    const withoutStyles = computeVoiceLedProgression(progression);
    const withAuto = computeVoiceLedProgression(progression, ["auto", "auto", "auto"]);
    expect(withAuto).toEqual(withoutStyles);
  });
});

// ─── 4.7: v4 — Spread + Two-Hand Voicings ──────────────────────────

describe("v4: spread voicing", () => {
  it("Cmaj7 spread places root in LH and stacks the rest a 10th and above", () => {
    const v = computeVoicingForStyle(["C", "E", "G", "B"], "spread");
    // C3 (LH) + E4 / G4 / B4 (RH). E4 is a major 10th above C3 (16 semitones).
    expect(v.notes.map((n) => n.midi)).toEqual([48, 64, 67, 71]);
    expect(v.voicingType).toBe("spread");
    expect(v.notes[0].hand).toBe("left");
    expect(v.notes.slice(1).every((n) => n.hand === "right")).toBe(true);
  });

  it("Dm7 spread — D3 (LH) + F4 A4 C5 (RH)", () => {
    const v = computeVoicingForStyle(["D", "F", "A", "C"], "spread");
    expect(v.notes.map((n) => n.midi)).toEqual([50, 65, 69, 72]);
    expect(v.voicingType).toBe("spread");
  });

  it("G7 spread — G3 (LH) + B4 D5 F5 (RH)", () => {
    const v = computeVoicingForStyle(["G", "B", "D", "F"], "spread");
    expect(v.notes.map((n) => n.midi)).toEqual([55, 71, 74, 77]);
    expect(v.voicingType).toBe("spread");
  });

  it("C major triad spread — C3 (LH) + E4 G4 (RH)", () => {
    const v = computeVoicingForStyle(["C", "E", "G"], "spread");
    expect(v.notes.map((n) => n.midi)).toEqual([48, 64, 67]);
    expect(v.voicingType).toBe("spread");
  });

  it("Bmaj7 spread pushes RH into octave 5 to clear the LH root", () => {
    // B3 = 59. RH must start > 71 (B3 + 12). D#5 = 75, F#5 = 78, A#5 = 82.
    const v = computeVoicingForStyle(["B", "Ds", "Fs", "As"], "spread");
    expect(v.notes.map((n) => n.midi)).toEqual([59, 75, 78, 82]);
    expect(v.voicingType).toBe("spread");
  });

  it("Cmaj9 spread keeps the 9th above the 7th in the upper register", () => {
    // C3 + E4 + G4 + B4 + D5.
    const v = computeVoicingForStyle(["C", "E", "G", "B", "D"], "spread");
    expect(v.notes.map((n) => n.midi)).toEqual([48, 64, 67, 71, 74]);
    expect(v.voicingType).toBe("spread");
  });

  it("isStyleApplicable lets spread run on triads but not empty inputs", () => {
    expect(isStyleApplicable(["C", "E", "G"], "spread")).toBe(true);
    expect(isStyleApplicable(["C", "E", "G", "B"], "spread")).toBe(true);
    expect(isStyleApplicable([], "spread")).toBe(false);
  });
});

describe("v4: two-hand voicing", () => {
  it("Cmaj7 two-hand — LH [C3, G3] RH [E4, B4]", () => {
    const v = computeVoicingForStyle(["C", "E", "G", "B"], "two-hand");
    expect(v.notes.map((n) => n.midi)).toEqual([48, 55, 64, 71]);
    expect(v.notes[0].hand).toBe("left");
    expect(v.notes[1].hand).toBe("left");
    expect(v.notes[2].hand).toBe("right");
    expect(v.notes[3].hand).toBe("right");
    expect(v.voicingType).toBe("two-hand");
  });

  it("Dm7 two-hand — LH [D3, A3] RH [F4, C5]", () => {
    const v = computeVoicingForStyle(["D", "F", "A", "C"], "two-hand");
    expect(v.notes.map((n) => n.midi)).toEqual([50, 57, 65, 72]);
    expect(v.voicingType).toBe("two-hand");
  });

  it("G7 two-hand — LH [G3, D4] RH [B4, F5]", () => {
    // 5th of G7 = D, which is at pc 2. D3 = 50, but D3 < G3 in our chord
    // notes — buildClosedVoicing pushes D up to D4 = 62 (next-above-G3).
    const v = computeVoicingForStyle(["G", "B", "D", "F"], "two-hand");
    expect(v.notes.map((n) => n.midi)).toEqual([55, 62, 71, 77]);
    expect(v.voicingType).toBe("two-hand");
  });

  it("C triad two-hand simplifies to LH [C3] RH [E4, G4]", () => {
    // For 3-note chords, LH gets only the root; the 5th joins the RH.
    const v = computeVoicingForStyle(["C", "E", "G"], "two-hand");
    expect(v.notes.map((n) => n.midi)).toEqual([48, 64, 67]);
    expect(v.notes[0].hand).toBe("left");
    expect(v.notes.slice(1).every((n) => n.hand === "right")).toBe(true);
  });

  it("Cmaj9 two-hand spreads the 9th into the upper RH range", () => {
    // LH [C3, G3]; RH [E4, B4, D5].
    const v = computeVoicingForStyle(["C", "E", "G", "B", "D"], "two-hand");
    expect(v.notes.map((n) => n.midi)).toEqual([48, 55, 64, 71, 74]);
    expect(v.voicingType).toBe("two-hand");
  });

  it("isStyleApplicable two-hand requires 3+ notes", () => {
    expect(isStyleApplicable(["C", "E", "G"], "two-hand")).toBe(true);
    expect(isStyleApplicable(["C", "E", "G", "B"], "two-hand")).toBe(true);
    expect(isStyleApplicable([], "two-hand")).toBe(false);
  });
});

describe("v4 voice-leading", () => {
  it("ii-V-I in C with all-spread keeps the wide R&B/gospel sound throughout", () => {
    const result = computeVoiceLedProgression(
      [
        ["D", "F", "A", "C"],
        ["G", "B", "D", "F"],
        ["C", "E", "G", "B"],
      ],
      ["spread", "spread", "spread"],
    );
    expect(result).toHaveLength(3);
    // First chord uses computeVoicingForStyle's canonical spread.
    expect(result[0].notes.map((n) => n.midi)).toEqual([50, 65, 69, 72]);
    expect(result[0].voicingType).toBe("spread");
    // Subsequent chords pick the oct-3 or oct-4 candidate that minimizes
    // motion. Every chord still preserves the spread shape: root in LH,
    // chord tones a 10th-or-more above.
    for (const chord of result) {
      expect(chord.voicingType).toBe("spread");
      expect(chord.notes.every((n) => n.midi >= 48 && n.midi <= 83)).toBe(true);
    }
  });

  it("two-hand across ii-V-I keeps LH+RH split for every chord", () => {
    const result = computeVoiceLedProgression(
      [
        ["D", "F", "A", "C"],
        ["G", "B", "D", "F"],
        ["C", "E", "G", "B"],
      ],
      ["two-hand", "two-hand", "two-hand"],
    );
    expect(result).toHaveLength(3);
    for (const chord of result) {
      expect(chord.voicingType).toBe("two-hand");
      expect(chord.notes.some((n) => n.hand === "left")).toBe(true);
      expect(chord.notes.some((n) => n.hand === "right")).toBe(true);
    }
  });
});
