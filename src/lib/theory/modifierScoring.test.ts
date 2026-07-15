import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import { getChordModifierOptions } from "../chordModifiers";
import type { IndexedChord, ScaleType } from "../types";
import { rankContextualChordModifiers } from "./modifierScoring";

function chord(name: string): IndexedChord {
  const result = lookupChord(name);
  if (!result) throw new Error(`Expected ${name} in the chord dictionary`);
  return result;
}

function option(
  names: ReadonlyArray<string>,
  selectedIndex: number,
  key: string,
  scaleType: ScaleType,
  limit = 12,
) {
  const timeline = names.map(chord);
  return rankContextualChordModifiers({
    selectedChord: timeline[selectedIndex],
    displayName: names[selectedIndex],
    selectedIndex,
    timeline,
    context: { key, scaleType },
    limit,
  });
}

function position(labels: ReadonlyArray<string>, label: string): number {
  const index = labels.indexOf(label);
  expect(index, `${label} should be ranked`).toBeGreaterThanOrEqual(0);
  return index;
}

describe("rankContextualChordModifiers", () => {
  it("ranks minor and minor-seven variants for major-key ii in a ii-V-I", () => {
    const result = option(["D", "G7", "Cmaj7"], 0, "C", "major", 64);
    const labels = result.quick.map((candidate) => candidate.label);

    expect(result.contextSupported).toBe(true);
    expect(labels).toContain("Dm7");
    expect(labels).toContain("Dm");
    expect(position(labels, "Dm7")).toBeLessThan(position(labels, "Dmaj7"));
    const minorSeven = result.quick.find((candidate) => candidate.label === "Dm7");
    expect(minorSeven?.fit).toMatchObject({
      degree: 2,
      function: "predominant",
      components: {
        scaleCoverage: 100,
        functionFit: 100,
        qualityExtensionFit: 100,
      },
    });
  });

  it("ranks functional dominant variants for major-key V in a ii-V-I", () => {
    const result = option(["Dm7", "G", "Cmaj7"], 1, "C", "major", 64);
    const labels = result.quick.map((candidate) => candidate.label);

    expect(labels[0]).toBe("G7");
    expect(position(labels, "G9")).toBeLessThan(position(labels, "Gmaj7"));
    expect(result.quick[0].fit).toMatchObject({ degree: 5, function: "dominant" });
    expect(result.quick[0].fit?.components.voiceLeading).not.toBeNull();
    expect(result.quick[0].fit?.reasons.some(
      (reason) => reason.key === "modifier.reason.voiceLeading",
    )).toBe(true);
  });

  it.each(["natural_minor", "harmonic_minor"] as const)(
    "prefers half-diminished ii over minor-seven in A %s",
    (scaleType) => {
      const result = option(["B", "E7", "Am"], 0, "A", scaleType);
      const labels = result.quick.map((candidate) => candidate.label);

      expect(position(labels, "Bm7b5")).toBeLessThan(position(labels, "Bm7"));
      const halfDiminished = result.quick.find((candidate) => candidate.label === "Bm7b5");
      expect(halfDiminished?.fit).toMatchObject({
        degree: 2,
        function: "predominant",
        components: { scaleCoverage: 100, functionFit: 100, qualityExtensionFit: 100 },
      });
    },
  );

  it("keeps the raised-leading-tone dominant ahead of diatonic minor V in natural minor", () => {
    const natural = option(["Bm7b5", "E", "Am"], 1, "A", "natural_minor", 64);
    const harmonic = option(["Bm7b5", "E", "Am"], 1, "A", "harmonic_minor", 64);
    const naturalLabels = natural.quick.map((candidate) => candidate.label);
    const harmonicLabels = harmonic.quick.map((candidate) => candidate.label);

    expect(position(naturalLabels, "E7")).toBeLessThan(position(naturalLabels, "Em7"));
    expect(position(harmonicLabels, "E7")).toBeLessThan(position(harmonicLabels, "Em7"));
    const naturalDominant = natural.quick.find((candidate) => candidate.label === "E7");
    const harmonicDominant = harmonic.quick.find((candidate) => candidate.label === "E7");
    expect(naturalDominant?.fit?.components.scaleCoverage).toBe(75);
    expect(naturalDominant?.fit?.components.functionFit).toBe(100);
    expect(harmonicDominant?.fit?.components.scaleCoverage).toBe(100);
    expect(harmonicDominant?.fit?.score).toBeGreaterThan(naturalDominant?.fit?.score ?? 0);
  });

  it("keeps altered dominants eligible with explicit function evidence", () => {
    const result = option(["Dm7", "G7", "Cmaj7"], 1, "C", "major", 16);
    const altered = result.quick.find((candidate) => candidate.label === "G7#9");

    expect(altered).toBeDefined();
    expect(altered?.fit?.score).toBeGreaterThanOrEqual(70);
    expect(altered?.fit?.components.functionFit).toBe(100);
    expect(altered?.fit?.components.complexityPenalty).toBeGreaterThan(0);
    expect(altered?.fit?.reasons).toContainEqual({
      key: "modifier.reason.qualityExtension",
      data: { evidence: "altered-dominant" },
    });
  });

  it("rewards diatonic tonic extensions without letting complexity escape its bound", () => {
    const result = option(["G7", "C", "Fmaj7"], 1, "C", "major", 16);
    const labels = result.quick.map((candidate) => candidate.label);
    const majorSeven = result.quick.find((candidate) => candidate.label === "Cmaj7");
    const majorThirteen = result.quick.find((candidate) => candidate.label === "Cmaj13");

    expect(labels[0]).toBe("Cmaj7");
    expect(majorSeven?.fit?.components.qualityExtensionFit).toBe(100);
    expect(majorThirteen?.fit?.components.complexityPenalty).toBeGreaterThan(0);
    expect(majorThirteen?.fit?.components.complexityPenalty).toBeLessThanOrEqual(10);
    expect((majorSeven?.fit?.score ?? 0)).toBeGreaterThan(majorThirteen?.fit?.score ?? 100);
  });

  it("preserves flat display spelling while ranking a flat-key dominant", () => {
    const result = option(["Fm7", "Bb", "Ebmaj7"], 1, "Eb", "major", 12);

    expect(result.rootLabel).toBe("Bb");
    expect(result.quick[0].label).toBe("Bb7");
    expect(result.quick.every((candidate) => candidate.label.startsWith("Bb"))).toBe(true);
    expect(result.all.every((candidate) => candidate.label.startsWith("Bb"))).toBe(true);
  });

  it("preserves a true slash bass through contextual ranking", () => {
    const result = option(["Am7", "D/F#", "Gmaj7"], 1, "G", "major", 12);
    const dominant = result.quick.find((candidate) => candidate.label === "D7/F#");

    expect(dominant).toBeDefined();
    expect(dominant?.chord.bass).toBe("F#");
    expect(result.quick.every((candidate) => candidate.label.endsWith("/F#"))).toBe(true);
    expect(result.all.every((candidate) => candidate.label.endsWith("/F#"))).toBe(true);
    expect(lookupChord(dominant?.label ?? "")?.entry).toBe(dominant?.chord.entry);
  });

  it.each([
    null,
    {},
    { key: "C" },
    { key: "C", scaleType: "unsupported_mode" },
    { key: "H", scaleType: "major" },
  ])("uses the exact generic quick ordering without fit for unknown context %#", (context) => {
    const selectedChord = chord("G7");
    const generic = getChordModifierOptions(selectedChord, "G7");
    const result = rankContextualChordModifiers({
      selectedChord,
      selectedIndex: 0,
      timeline: [selectedChord],
      context,
    });

    expect(result.contextSupported).toBe(false);
    expect(result.quick.map((candidate) => candidate.label)).toEqual(
      generic.quick.map((candidate) => candidate.label),
    );
    expect(result.quick.every((candidate) => candidate.fit === undefined)).toBe(true);
  });

  it("uses generic candidate order to break equal contextual scores", () => {
    const selectedChord = chord("C");
    const generic = getChordModifierOptions(selectedChord, "C");
    const result = rankContextualChordModifiers({
      selectedChord,
      selectedIndex: 0,
      timeline: [selectedChord],
      context: { key: "C", scaleType: "major" },
      limit: 64,
    });
    const flatFive = result.quick.find((candidate) => candidate.label === "Cmaj7(b5)");
    const sharpFive = result.quick.find((candidate) => candidate.label === "Cmaj7(#5)");
    const genericLabels = [
      ...generic.quick.map((candidate) => candidate.label),
      ...generic.all.map((candidate) => candidate.label),
    ].filter((label, index, labels) => labels.indexOf(label) === index);

    expect(flatFive?.fit?.score).toBe(sharpFive?.fit?.score);
    const scoredDifference = position(
      result.quick.map((candidate) => candidate.label),
      "Cmaj7(b5)",
    ) - position(result.quick.map((candidate) => candidate.label), "Cmaj7(#5)");
    const genericDifference = position(genericLabels, "Cmaj7(b5)")
      - position(genericLabels, "Cmaj7(#5)");
    expect(Math.sign(scoredDifference)).toBe(Math.sign(genericDifference));
  });

  it("uses adjacent voice leading to break otherwise equal harmonic fits", () => {
    const result = option(["D7", "C"], 1, "C", "major", 64);
    const flatFive = result.quick.find((candidate) => candidate.label === "Cmaj7(b5)");
    const sharpFive = result.quick.find((candidate) => candidate.label === "Cmaj7(#5)");

    expect(flatFive?.fit?.components).toMatchObject({
      scaleCoverage: sharpFive?.fit?.components.scaleCoverage,
      functionFit: sharpFive?.fit?.components.functionFit,
      qualityExtensionFit: sharpFive?.fit?.components.qualityExtensionFit,
      complexityPenalty: sharpFive?.fit?.components.complexityPenalty,
    });
    expect(flatFive?.fit?.components.voiceLeading ?? 0)
      .toBeGreaterThan(sharpFive?.fit?.components.voiceLeading ?? 100);
    expect(flatFive?.fit?.score ?? 0).toBeGreaterThan(sharpFive?.fit?.score ?? 100);
  });

  it("is deterministic, dictionary-valid, same-root, localized-ready, and bounded", () => {
    const cases: ReadonlyArray<readonly [ReadonlyArray<string>, number, string, ScaleType]> = [
      [["Dm7", "G", "Cmaj7"], 1, "C", "major"],
      [["Bm7b5", "E", "Am"], 1, "A", "harmonic_minor"],
      [["Fm7", "Bb", "Ebmaj7"], 1, "Eb", "major"],
      [["Am7", "D/F#", "Gmaj7"], 1, "G", "major"],
    ];

    for (const [names, selectedIndex, key, scaleType] of cases) {
      const first = option(names, selectedIndex, key, scaleType, 24);
      const second = option(names, selectedIndex, key, scaleType, 24);
      expect(first.quick.map(({ label, fit }) => ({ label, fit }))).toEqual(
        second.quick.map(({ label, fit }) => ({ label, fit })),
      );

      const selectedRoot = chord(names[selectedIndex]).root;
      for (const candidate of first.quick) {
        expect(candidate.chord.root).toBe(selectedRoot);
        expect(lookupChord(candidate.label)?.entry).toBe(candidate.chord.entry);
        expect(candidate.fit?.score).toBeGreaterThanOrEqual(0);
        expect(candidate.fit?.score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(candidate.fit?.score)).toBe(true);
        expect(candidate.fit?.components.complexityPenalty).toBeGreaterThanOrEqual(0);
        expect(candidate.fit?.components.complexityPenalty).toBeLessThanOrEqual(10);
        expect(candidate.fit?.components.scaleCoverage).toBeGreaterThanOrEqual(0);
        expect(candidate.fit?.components.scaleCoverage).toBeLessThanOrEqual(100);
        expect(candidate.fit?.components.functionFit).toBeGreaterThanOrEqual(0);
        expect(candidate.fit?.components.functionFit).toBeLessThanOrEqual(100);
        expect(candidate.fit?.components.qualityExtensionFit).toBeGreaterThanOrEqual(0);
        expect(candidate.fit?.components.qualityExtensionFit).toBeLessThanOrEqual(100);
        if (candidate.fit?.components.voiceLeading !== null) {
          expect(candidate.fit?.components.voiceLeading).toBeGreaterThanOrEqual(0);
          expect(candidate.fit?.components.voiceLeading).toBeLessThanOrEqual(100);
        }
        expect(candidate.fit?.reasons.length).toBeGreaterThan(0);
        expect(candidate.fit?.reasons.every((reason) =>
          reason.key.startsWith("modifier.reason.") && typeof reason.data === "object",
        )).toBe(true);
      }
    }
  });

  it("validates the bounded quick-list limit", () => {
    const selectedChord = chord("C");
    const input = {
      selectedChord,
      selectedIndex: 0,
      timeline: [selectedChord],
      context: { key: "C", scaleType: "major" },
    } as const;

    expect(() => rankContextualChordModifiers({ ...input, limit: 0 })).toThrow(RangeError);
    expect(() => rankContextualChordModifiers({ ...input, limit: 65 })).toThrow(RangeError);
    expect(() => rankContextualChordModifiers({ ...input, limit: 1.5 })).toThrow(RangeError);
  });
});
