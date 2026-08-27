import { describe, expect, it } from "vitest";
import { lookupChord } from "../lib/chordData";
import {
  createFloatingChordCard,
  floatingChordCardPosition,
  floatingChordCardsReducer,
} from "./floatingChordCardsState";

function requiredChord(name: string) {
  const chord = lookupChord(name);
  if (!chord) throw new Error(`${name} fixture is missing`);
  return chord;
}

describe("floating chord card state", () => {
  it("captures instrument and clamps initial placement inside the viewport", () => {
    const position = floatingChordCardPosition(
      { x: 1_010, y: 750 },
      "guitar",
      { width: 1_024, height: 768 },
    );
    expect(position.x).toBeGreaterThanOrEqual(12);
    expect(position.y).toBeGreaterThanOrEqual(12);
    expect(position.x).toBeLessThanOrEqual(724);
    expect(position.y).toBeLessThanOrEqual(236);

    const card = createFloatingChordCard(
      1,
      requiredChord("Cmaj7"),
      "Cmaj7",
      "guitar",
      { x: 500, y: 300 },
      { width: 1_024, height: 768 },
    );
    expect(card.instrument).toBe("guitar");
    expect(card.variant).toBe(1);
    expect(card.pianoStyle).toBe("auto");
  });

  it("updates and dismisses one pin without mutating its siblings", () => {
    const viewport = { width: 1_280, height: 800 };
    const first = createFloatingChordCard(
      1,
      requiredChord("C"),
      "C",
      "guitar",
      { x: 100, y: 100 },
      viewport,
    );
    const second = createFloatingChordCard(
      2,
      requiredChord("Am7"),
      "Am7",
      "piano",
      { x: 400, y: 100 },
      viewport,
    );
    const added = floatingChordCardsReducer(
      floatingChordCardsReducer([], { type: "add", card: first }),
      { type: "add", card: second },
    );
    const varied = floatingChordCardsReducer(added, {
      type: "set-variant",
      id: 1,
      variant: requiredChord("C").variationCount,
    });
    expect(varied[0].variant).toBe(requiredChord("C").variationCount);
    expect(varied[1]).toEqual(second);

    const modified = floatingChordCardsReducer(varied, {
      type: "set-chord",
      id: 2,
      chord: requiredChord("G7"),
      displayName: "G7",
    });
    expect(modified[0]).toEqual(varied[0]);
    expect(modified[1].displayName).toBe("G7");
    expect(modified[1].instrument).toBe("piano");

    expect(floatingChordCardsReducer(modified, { type: "dismiss", id: 1 }))
      .toEqual([modified[1]]);
  });
});
