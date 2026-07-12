import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import type { IndexedChord } from "../types";
import { scoreChordKeyFit } from "./harmonicSuggestions";
import { rankCompatibleScales } from "./improvInsight";
import {
  applyMoodToHarmonicFit,
  filterScaleSuggestionsByMood,
  MOODS,
  MOOD_IDS,
  moodDefinitionFor,
  parseMoodDefinitions,
  scoreChordMoodFit,
} from "./moodEngine";

function chord(name: string): IndexedChord {
  const resolved = lookupChord(name);
  if (!resolved) throw new Error(`Missing test chord ${name}`);
  return resolved;
}

describe("mood and genre engine", () => {
  it("loads the complete immutable minimum vocabulary", () => {
    expect(MOODS.map((mood) => mood.label)).toEqual([
      "Bright", "Dark", "Jazzy", "Bluesy", "Latin", "Film Noir",
      "Ethereal", "Happy", "Melancholy", "Heroic", "Ancient", "Lively",
    ]);
    expect(new Set(MOODS.map((mood) => mood.id)).size).toBe(MOOD_IDS.length);
    expect(MOODS).toHaveLength(MOOD_IDS.length);
    expect(Object.isFrozen(MOODS)).toBe(true);
    for (const mood of MOODS) {
      expect(Object.isFrozen(mood)).toBe(true);
      expect(Object.isFrozen(mood.scales)).toBe(true);
      expect(Object.isFrozen(mood.qualityWeights)).toBe(true);
      expect(mood.scales.length).toBeGreaterThan(0);
      expect(Object.values(mood.qualityWeights).every((weight) => weight >= 0 && weight <= 100))
        .toBe(true);
    }
  });

  it("rejects duplicate records instead of accepting an oversized vocabulary", () => {
    const duplicateBright = [...MOODS, moodDefinitionFor("bright")];
    expect(() => parseMoodDefinitions(duplicateBright)).toThrow(/exactly once/);
  });

  it("uses both chord quality and mood scale membership", () => {
    const context = { key: "C", scaleType: "major" } as const;
    const brightMajor = scoreChordMoodFit(chord("Cmaj7"), context, "bright");
    const darkMajor = scoreChordMoodFit(chord("Cmaj7"), context, "dark");
    const brightMinor = scoreChordMoodFit(chord("Cm7"), context, "bright");
    const darkMinor = scoreChordMoodFit(chord("Cm7"), context, "dark");

    expect(brightMajor.score).toBeGreaterThan(darkMajor.score);
    expect(darkMinor.score).toBeGreaterThan(brightMinor.score);
    expect(brightMajor).toMatchObject({ qualityScore: 100, scaleScore: 100 });
    expect(darkMinor).toMatchObject({ qualityScore: 100, scaleScore: 100 });
  });

  it("blends a mood lens without mutating the base harmonic result", () => {
    const context = { key: "C", scaleType: "major" } as const;
    const candidate = chord("G7");
    const base = scoreChordKeyFit(candidate, context);
    const adjusted = applyMoodToHarmonicFit(base, candidate, context, "bluesy");

    expect(base.components).toEqual({ key: 100, voiceLeading: null, rootMotion: null });
    expect(adjusted.components.mood).toBeGreaterThan(0);
    expect(adjusted.score).toBeGreaterThanOrEqual(0);
    expect(adjusted.score).toBeLessThanOrEqual(100);
    expect(adjusted.reasons.at(-1)).toMatch(/weight/);
    expect(Object.isFrozen(adjusted)).toBe(true);
    expect(Object.isFrozen(adjusted.components)).toBe(true);
  });

  it("filters compatible-scale candidates to the selected mood families", () => {
    const candidates = rankCompatibleScales([chord("C7")], 132);
    const bluesy = filterScaleSuggestionsByMood(candidates, "bluesy", 12);
    const allowed = new Set(moodDefinitionFor("bluesy").scales);

    expect(bluesy).toHaveLength(12);
    expect(bluesy.every((suggestion) => allowed.has(suggestion.scaleType))).toBe(true);
    expect(bluesy.some((suggestion) => suggestion.scaleType === "major_blues")).toBe(true);
    expect(bluesy.some((suggestion) => suggestion.scaleType === "minor_blues")).toBe(true);
    expect(Object.isFrozen(bluesy)).toBe(true);
    expect(() => filterScaleSuggestionsByMood(candidates, "bright", 0)).toThrow(RangeError);
  });

  it.each(MOOD_IDS)("keeps %s scoring deterministic and bounded", (moodId) => {
    const context = { key: "Eb", scaleType: "dorian" } as const;
    const candidate = chord("Bb7#9");
    const first = scoreChordMoodFit(candidate, context, moodId);
    const second = scoreChordMoodFit(candidate, context, moodId);

    expect(second).toEqual(first);
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(moodDefinitionFor(moodId).scales).toContain(first.bestScaleType);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.reasons)).toBe(true);
  });
});
