import { describe, expect, it } from "vitest";
import { lookupChord } from "../chordData";
import type { IndexedChord } from "../types";
import {
  buildDiscoveryScaleMembership,
  DISCOVERY_SCALE_RECOMMENDATION_LIMIT,
  discoveryScaleSuggestionId,
  rankDiscoveryScaleSuggestions,
  resolveDiscoveryScaleSelection,
  type DiscoveryProgressionChord,
} from "./scaleOverlay";

function progression(...names: string[]): DiscoveryProgressionChord[] {
  return names.map((input) => {
    const chord: IndexedChord | undefined = lookupChord(input);
    if (!chord) throw new Error(`Missing test chord ${input}`);
    return { input, chord };
  });
}

describe("Discovery scale overlay", () => {
  it("returns the canonical top six recommendations", () => {
    const suggestions = rankDiscoveryScaleSuggestions(
      progression("Cmaj7", "Am7", "Dm7", "G7"),
    );

    expect(suggestions).toHaveLength(DISCOVERY_SCALE_RECOMMENDATION_LIMIT);
    expect(suggestions[0]).toMatchObject({ label: "C Major", match: 100 });
    expect(Object.isFrozen(suggestions)).toBe(true);
  });

  it("mirrors Improv Insight's flat spelling preference", () => {
    const suggestions = rankDiscoveryScaleSuggestions(
      progression("Bbmaj7", "Ebmaj7", "F7"),
    );

    expect(suggestions[0]).toMatchObject({ label: "Bb Major", key: "As" });
    expect(suggestions[0].notes).toEqual(["Bb", "C", "D", "Eb", "F", "G", "A"]);
  });

  it("preserves a valid selection and falls back after progression mutation", () => {
    const first = rankDiscoveryScaleSuggestions(progression("Cmaj7", "Am7", "Dm7", "G7"));
    const selected = first[2];
    expect(resolveDiscoveryScaleSelection(first, discoveryScaleSuggestionId(selected))).toBe(selected);

    const next = rankDiscoveryScaleSuggestions(progression("F#maj7", "Bmaj7", "C#7"));
    const staleId = first
      .map(discoveryScaleSuggestionId)
      .find((id) => !next.some((suggestion) => discoveryScaleSuggestionId(suggestion) === id));
    expect(staleId).toBeDefined();
    expect(resolveDiscoveryScaleSelection(next, staleId ?? null)).toBe(next[0]);
  });

  it("returns an honest empty result without chords", () => {
    expect(rankDiscoveryScaleSuggestions([])).toEqual([]);
    expect(resolveDiscoveryScaleSelection([], null)).toBeNull();
  });

  it("builds repeated pitch membership with scale-aware note spelling", () => {
    const suggestion = rankDiscoveryScaleSuggestions(
      progression("Bbmaj7", "Ebmaj7", "F7"),
    )[0];
    const membership = buildDiscoveryScaleMembership(suggestion);

    expect(membership.rootPitchClass).toBe(10);
    expect(membership.pitchClasses).toEqual(new Set([10, 0, 2, 3, 5, 7, 9]));
    expect(membership.noteLabels.get(10)).toBe("Bb");
    expect(membership.noteLabels.get(3)).toBe("Eb");
  });
});
