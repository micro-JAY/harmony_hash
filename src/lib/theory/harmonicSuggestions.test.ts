import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import type { IndexedChord } from "../types";
import {
  findLastResolvedChord,
  harmonicFitTier,
  scoreChordKeyFit,
  scoreJazzChordFit,
  scoreJazzVocabularyFit,
  scoreNextChordFit,
  scoreRootMotionFit,
  scoreVoiceLeadingFit,
} from "./harmonicSuggestions";

function chord(name: string): IndexedChord {
  const resolved = lookupChord(name);
  if (!resolved) throw new Error(`Missing test chord: ${name}`);
  return resolved;
}

const C_MAJOR = { key: "C", scaleType: "major" } as const;

describe("scoreChordKeyFit", () => {
  it("scores a fully diatonic seventh chord at 100", () => {
    const result = scoreChordKeyFit(chord("Dm7"), C_MAJOR);

    expect(result).toMatchObject({
      score: 100,
      tier: "strong",
      basis: "key",
      components: { key: 100, voiceLeading: null, rootMotion: null },
    });
    expect(result.reasons).toEqual(["4/4 tones in C major"]);
  });

  it("scores C7 at 75 in C major because Bb is outside", () => {
    const result = scoreChordKeyFit(chord("C7"), C_MAJOR);

    expect(result.score).toBe(75);
    expect(result.tier).toBe("good");
    expect(result.reasons).toEqual(["3/4 tones in C major"]);
  });

  it("treats enharmonic spellings as the same pitch classes", () => {
    const context = { key: "D", scaleType: "major" } as const;

    expect(scoreChordKeyFit(chord("F#"), context).score).toBe(
      scoreChordKeyFit(chord("Gb"), context).score,
    );
  });
});

describe("transition components", () => {
  it("prioritizes fourth/fifth root motion", () => {
    expect(scoreRootMotionFit(chord("C"), chord("F"))).toBe(100);
    expect(scoreRootMotionFit(chord("C"), chord("G"))).toBe(100);
    expect(scoreRootMotionFit(chord("C"), chord("D"))).toBe(80);
    expect(scoreRootMotionFit(chord("C"), chord("F#"))).toBe(25);
    expect(scoreRootMotionFit(chord("C"), chord("Cmaj7"))).toBe(45);
  });

  it("rewards shared tones and small voice-leading motion", () => {
    expect(scoreVoiceLeadingFit(chord("Cmaj7"), chord("Am7"))).toBeGreaterThanOrEqual(85);
    expect(scoreVoiceLeadingFit(chord("Cmaj7"), chord("F#"))).toBeLessThan(80);
  });
});

describe("scoreNextChordFit", () => {
  it("combines fixed weights and identifies dominant resolution", () => {
    const result = scoreNextChordFit(chord("Cmaj7"), C_MAJOR, chord("G7"));

    expect(result).toMatchObject({
      score: 96,
      tier: "strong",
      basis: "next",
      components: { key: 100, voiceLeading: 88, rootMotion: 100 },
    });
    expect(result.reasons).toContain("dominant resolution");
  });

  it("falls back to key fit when no previous chord is available", () => {
    const result = scoreNextChordFit(chord("C7"), C_MAJOR);

    expect(result).toMatchObject({
      score: 75,
      tier: "good",
      basis: "key",
      components: { key: 75, voiceLeading: null, rootMotion: null },
    });
    expect(result.reasons.at(-1)).toBe("Add a chord to rank what follows");
  });

  it("is deterministic across repeated calculations", () => {
    const first = scoreNextChordFit(chord("Am7"), C_MAJOR, chord("Cmaj7"));
    const second = scoreNextChordFit(chord("Am7"), C_MAJOR, chord("Cmaj7"));

    expect(second).toEqual(first);
  });
});

describe("scoreJazzChordFit", () => {
  it("rewards altered and extended jazz vocabulary without consulting mutable data", () => {
    expect(scoreJazzVocabularyFit(chord("G7#9"))).toBe(100);
    expect(scoreJazzVocabularyFit(chord("Cmaj9"))).toBe(96);
    expect(scoreJazzVocabularyFit(chord("Bm7b5"))).toBe(94);
    expect(scoreJazzVocabularyFit(chord("Cmaj7"))).toBe(90);
    expect(scoreJazzVocabularyFit(chord("C"))).toBe(58);
    expect(scoreJazzVocabularyFit(chord("C5"))).toBe(35);
  });

  it("recognizes ii–V and the tritone-substitute dominant", () => {
    const iiToV = scoreJazzChordFit(chord("G7"), C_MAJOR, [chord("Dm7")]);
    const iiToSubV = scoreJazzChordFit(chord("Db7"), C_MAJOR, [chord("Dm7")]);

    expect(iiToV).toMatchObject({
      basis: "jazz",
      tier: "strong",
      components: { cadence: 100, rootMotion: 100 },
    });
    expect(iiToV.reasons).toContain("ii–V motion");
    expect(iiToSubV.components.cadence).toBe(92);
    expect(iiToSubV.reasons).toContain("tritone-substitute dominant");
    expect(iiToSubV.score).toBeGreaterThanOrEqual(70);
  });

  it("recognizes direct and completed dominant resolutions", () => {
    const direct = scoreJazzChordFit(chord("Cmaj7"), C_MAJOR, [chord("G7")]);
    const tritone = scoreJazzChordFit(chord("Cmaj7"), C_MAJOR, [chord("Db7")]);
    const completed = scoreJazzChordFit(
      chord("Cmaj7"),
      C_MAJOR,
      [chord("Dm7"), chord("G7")],
    );
    const completedSubstitute = scoreJazzChordFit(
      chord("Cmaj7"),
      C_MAJOR,
      [chord("Dm7"), chord("Db7")],
    );

    expect(direct.reasons).toContain("dominant resolution");
    expect(tritone.reasons).toContain("tritone-sub resolution");
    expect(completed.reasons).toContain("completes ii–V–I");
    expect(completedSubstitute.reasons).toContain("completes ii–subV–I");
    expect(completed.components.cadence).toBe(100);
    expect(completedSubstitute.components.cadence).toBe(98);
  });

  it("reserves tonic-resolution labels for a compatible tonic quality", () => {
    const history = [chord("Dm7"), chord("G7")];

    for (const candidate of ["C5", "Cdim", "Caug", "C7"]) {
      const result = scoreJazzChordFit(chord(candidate), C_MAJOR, history);
      expect(result.components.cadence, candidate).not.toBe(100);
      expect(result.reasons, candidate).not.toContain("completes ii–V–I");
      expect(result.reasons, candidate).not.toContain("dominant resolution");
    }
  });

  it("derives ii quality from the selected scale and avoids false modal labels", () => {
    const harmonicMinor = scoreJazzChordFit(
      chord("G7"),
      { key: "C", scaleType: "harmonic_minor" },
      [chord("Dm7b5")],
    );
    const phrygian = scoreJazzChordFit(
      chord("A7"),
      { key: "D", scaleType: "phrygian" },
      [chord("Em7")],
    );

    expect(harmonicMinor.reasons).toContain("ii–V motion");
    expect(harmonicMinor.components.cadence).toBe(100);
    expect(phrygian.reasons).not.toContain("ii–V motion");
    expect(phrygian.components.cadence).toBe(72);
  });

  it("falls back to key, vocabulary, and functional context without history", () => {
    const result = scoreJazzChordFit(chord("G13"), C_MAJOR);

    expect(result).toMatchObject({
      basis: "jazz",
      components: {
        key: 100,
        voiceLeading: null,
        rootMotion: null,
        jazzVocabulary: 96,
        cadence: 72,
      },
    });
    expect(result.reasons).toContain("primary dominant function");
  });

  it("is deterministic and does not mutate chord history", () => {
    const history = Object.freeze([chord("Dm7"), chord("G7")]);
    const first = scoreJazzChordFit(chord("Cmaj7"), C_MAJOR, history);
    const second = scoreJazzChordFit(chord("Cmaj7"), C_MAJOR, history);

    expect(second).toEqual(first);
    expect(history.map((item) => item.displayName)).toEqual(["Dm7", "G7"]);
  });
});

describe("harmonicFitTier", () => {
  it.each([
    [100, "strong"],
    [85, "strong"],
    [84, "good"],
    [70, "good"],
    [69, "color"],
    [50, "color"],
    [49, "outside"],
    [0, "outside"],
  ] as const)("maps %i to %s", (score, tier) => {
    expect(harmonicFitTier(score)).toBe(tier);
  });
});

describe("findLastResolvedChord", () => {
  it("uses the last valid token and ignores invalid trailing text", () => {
    expect(findLastResolvedChord("Cmaj7 nope G7 still-nope")?.displayName).toBe("G7");
  });

  it("returns undefined when no token resolves", () => {
    expect(findLastResolvedChord("nope still-nope")).toBeUndefined();
    expect(findLastResolvedChord(" ")).toBeUndefined();
  });
});
