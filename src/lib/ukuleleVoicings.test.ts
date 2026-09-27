import { describe, expect, it } from "vitest";
import { ALL_ROOTS, getIndexedChordsForRoot, lookupChord } from "./chordData";
import { deriveChordTones } from "./theory/chordTones";
import { pitchClassOf } from "./theory/scaleBasics";
import {
  getInstrumentVariantCount,
  getUkuleleVoicing,
  getUkuleleVoicings,
  ukuleleVoicingToVoicedChord,
  UKULELE_MAX_FRET,
  UKULELE_MAX_FRET_SPAN,
  UKULELE_MAX_VARIANTS,
  UKULELE_OPEN_MIDIS,
} from "./ukuleleVoicings";

function chord(name: string) {
  const result = lookupChord(name);
  if (!result) throw new Error(`Missing test chord ${name}`);
  return result;
}

describe("standard high-G ukulele voicings", () => {
  it("uses re-entrant G4 C4 E4 A4 and familiar open chord shapes", () => {
    expect(UKULELE_OPEN_MIDIS).toEqual([67, 60, 64, 69]);
    expect(getUkuleleVoicing(chord("C"), 1)?.frets).toEqual([0, 0, 0, 3]);
    expect(getUkuleleVoicing(chord("Am"), 1)?.frets).toEqual([2, 0, 0, 0]);
    expect(getUkuleleVoicing(chord("F"), 1)?.frets).toEqual([2, 0, 1, 0]);
    expect(getUkuleleVoicing(chord("G7"), 1)?.frets).toEqual([0, 2, 1, 2]);
    expect(ukuleleVoicingToVoicedChord(getUkuleleVoicing(chord("C"), 1)).notes.map((note) => note.midi))
      .toEqual([67, 60, 64, 72]);
  });

  it("keeps guide tones and the named extension while explicitly omitting fifths", () => {
    const ninth = getUkuleleVoicing(chord("C9"), 1);
    expect(ninth?.notes.map((note) => note.pitchClass).sort((a, b) => a - b)).toEqual([0, 2, 4, 10]);
    expect(ninth?.omittedTones.map((tone) => tone.degree)).toEqual(["5"]);
    const thirteenth = getUkuleleVoicing(chord("C13"), 1);
    expect(thirteenth?.notes.map((note) => note.pitchClass).sort((a, b) => a - b)).toEqual([0, 4, 9, 10]);
    expect(thirteenth?.omittedTones.map((tone) => tone.degree)).toEqual(["5", "9"]);
  });

  it("checks the actual lowest sounding pitch for slash chords", () => {
    for (const name of ["D/F#", "C/G", "C/Bb", "Am/C", "C/F#"]) {
      const requested = chord(name);
      const variants = getUkuleleVoicings(requested);
      expect(variants.length, name).toBeGreaterThan(0);
      for (const variant of variants) {
        expect(Math.min(...variant.notes.map((note) => note.midi)) % 12, name)
          .toBe(pitchClassOf(requested.bass ?? ""));
      }
    }
  });

  it("reports unsupported identities or basses without changing the requested chord", () => {
    const unsupported = chord("F#maj9");
    expect(getUkuleleVoicings(unsupported)).toEqual([]);
    expect(getUkuleleVoicing(unsupported, 1)).toBeNull();
    expect(getUkuleleVoicings(chord("Dm7/C#"))).toEqual([]);
    expect(unsupported.displayName).toBe("F#maj9");
    expect(ukuleleVoicingToVoicedChord(null).notes).toEqual([]);
  });

  it("provides deterministic immutable variants independent of guitar assets", () => {
    const requested = { ...chord("C"), svgBasePath: "", variationCount: 0 };
    const variants = getUkuleleVoicings(requested);
    expect(variants).toEqual(getUkuleleVoicings(chord("C")));
    expect(getInstrumentVariantCount(requested, "ukulele")).toBe(variants.length);
    expect(getInstrumentVariantCount(requested, "guitar")).toBe(0);
    expect(getUkuleleVoicing(requested, 100)).toBe(variants.at(-1));
    expect(getUkuleleVoicing(requested, NaN)).toBe(variants[0]);
    expect(Object.isFrozen(variants)).toBe(true);
    expect(Object.isFrozen(variants[0])).toBe(true);
    expect(Object.isFrozen(variants[0].frets)).toBe(true);
  });

  it("does not reuse cached note spellings across enharmonic display roots", () => {
    const sharp = chord("C#");
    const flat = { ...sharp, root: "Df", displayName: "Db" };
    expect(getUkuleleVoicing(sharp, 1)?.notes.some((note) => note.noteLabel === "C#")).toBe(true);
    expect(getUkuleleVoicing(flat, 1)?.notes.some((note) => note.noteLabel === "Db")).toBe(true);
    expect(getUkuleleVoicing(flat, 1)?.frets).toEqual(getUkuleleVoicing(sharp, 1)?.frets);
  });

  it("covers at least 95% of the shared catalog with bounded, honest four-string shapes", () => {
    const catalog = [...ALL_ROOTS].flatMap(getIndexedChordsForRoot);
    let supported = 0;
    for (const requested of catalog) {
      const tones = deriveChordTones(requested);
      const variants = getUkuleleVoicings(requested);
      if (variants.length > 0) supported += 1;
      expect(variants.length).toBeLessThanOrEqual(UKULELE_MAX_VARIANTS);
      expect(new Set(variants.map((variant) => variant.frets.join(","))).size).toBe(variants.length);
      for (const variant of variants) {
        expect(variant.frets).toHaveLength(4);
        const fretted = variant.frets.filter((fret): fret is number => fret !== null && fret > 0);
        if (fretted.length > 0) {
          expect(Math.max(...fretted)).toBeLessThanOrEqual(UKULELE_MAX_FRET);
          expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(UKULELE_MAX_FRET_SPAN);
        }
        const sounding = new Set(variant.notes.map((note) => note.pitchClass));
        for (const note of variant.notes) {
          expect(note.midi).toBe(UKULELE_OPEN_MIDIS[4 - note.stringNumber] + note.fret);
          expect(tones.some((tone) => tone.pitchClass === note.pitchClass)).toBe(true);
        }
        expect(variant.omittedTones.map((tone) => tone.pitchClass))
          .toEqual(tones.filter((tone) => !sounding.has(tone.pitchClass)).map((tone) => tone.pitchClass));
        if (tones.length <= 4) expect(variant.omittedTones).toEqual([]);
      }
    }
    expect(supported / catalog.length).toBeGreaterThanOrEqual(0.95);
  });
});
