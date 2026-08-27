import { describe, expect, it } from "vitest";
import { lookupChord } from "../lib/chordData";
import {
  createFloatingChordCard,
  floatingChordCardClampOffset,
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
      { width: 1_024, height: 768, offsetLeft: 0, offsetTop: 0 },
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
      { width: 1_024, height: 768, offsetLeft: 0, offsetTop: 0 },
    );
    expect(card.instrument).toBe("guitar");
    expect(card.variant).toBe(1);
    expect(card.pianoStyle).toBe("auto");
  });

  it("returns the offset needed to recover a pin after the viewport shrinks", () => {
    expect(floatingChordCardClampOffset(
      { left: 900, right: 1_188, top: 500, bottom: 760 },
      { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 },
    )).toEqual({ x: -400, y: -172 });

    expect(floatingChordCardClampOffset(
      { left: -20, right: 268, top: -8, bottom: 492 },
      { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 },
    )).toEqual({ x: 32, y: 20 });

    expect(floatingChordCardClampOffset(
      { left: 12, right: 300, top: 12, bottom: 512 },
      { width: 800, height: 600, offsetLeft: 0, offsetTop: 0 },
    )).toEqual({ x: 0, y: 0 });
  });

  it("uses visual viewport offsets for placement and resize recovery", () => {
    const visualViewport = {
      width: 800,
      height: 600,
      offsetLeft: 200,
      offsetTop: 100,
    };
    expect(floatingChordCardPosition(
      { x: 990, y: 690 },
      "guitar",
      visualViewport,
    )).toEqual({ x: 686, y: 154 });

    expect(floatingChordCardClampOffset(
      { left: 100, right: 388, top: 50, bottom: 350 },
      visualViewport,
    )).toEqual({ x: 112, y: 62 });
    expect(floatingChordCardClampOffset(
      { left: 800, right: 1_088, top: 500, bottom: 700 },
      visualViewport,
    )).toEqual({ x: -100, y: -12 });
  });

  it("cascades new pins so an existing toolbar remains reachable", () => {
    const viewport = {
      width: 1_280,
      height: 800,
      offsetLeft: 0,
      offsetTop: 0,
    };
    const point = { x: 500, y: 300 };
    const first = floatingChordCardPosition(point, "guitar", viewport);
    const second = floatingChordCardPosition(point, "guitar", viewport, [first]);
    const third = floatingChordCardPosition(point, "guitar", viewport, [first, second]);

    expect(second).not.toEqual(first);
    expect(third).not.toEqual(first);
    expect(third).not.toEqual(second);
    expect(Math.abs(second.x - first.x) >= 40 || Math.abs(second.y - first.y) >= 40)
      .toBe(true);

    const edgeFirst = floatingChordCardPosition(
      { x: 1_270, y: 790 },
      "guitar",
      viewport,
    );
    const edgeSecond = floatingChordCardPosition(
      { x: 1_270, y: 790 },
      "guitar",
      viewport,
      [edgeFirst],
    );
    expect(Math.abs(edgeSecond.x - edgeFirst.x) >= 40
      || Math.abs(edgeSecond.y - edgeFirst.y) >= 40).toBe(true);
  });

  it("updates and dismisses one pin without mutating its siblings", () => {
    const viewport = {
      width: 1_280,
      height: 800,
      offsetLeft: 0,
      offsetTop: 0,
    };
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
