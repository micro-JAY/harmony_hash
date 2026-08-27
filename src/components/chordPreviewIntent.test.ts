import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHORD_PREVIEW_HOVER_DELAY_MS,
  createChordPreviewIntent,
  type ChordPreviewRequest,
} from "./chordPreviewIntent";

afterEach(() => {
  vi.useRealTimers();
});

describe("createChordPreviewIntent", () => {
  it("emits only after 1.5 seconds with the latest pointer position", () => {
    vi.useFakeTimers();
    const requests: ChordPreviewRequest[] = [];
    const intent = createChordPreviewIntent((request) => requests.push(request));

    intent.start("Cmaj7", { x: 100, y: 120 });
    vi.advanceTimersByTime(CHORD_PREVIEW_HOVER_DELAY_MS - 1);
    expect(requests).toEqual([]);

    intent.updatePoint({ x: 140, y: 180 });
    vi.advanceTimersByTime(1);
    expect(requests).toEqual([
      { chordName: "Cmaj7", point: { x: 140, y: 180 } },
    ]);
  });

  it("cancels an early leave and replaces intent when another cell is entered", () => {
    vi.useFakeTimers();
    const requests: ChordPreviewRequest[] = [];
    const intent = createChordPreviewIntent((request) => requests.push(request));

    intent.start("C", { x: 10, y: 20 });
    vi.advanceTimersByTime(900);
    intent.cancel();
    vi.advanceTimersByTime(900);
    expect(requests).toEqual([]);

    intent.start("Dm7", { x: 30, y: 40 });
    intent.start("G7", { x: 50, y: 60 });
    vi.advanceTimersByTime(CHORD_PREVIEW_HOVER_DELAY_MS);
    expect(requests).toEqual([
      { chordName: "G7", point: { x: 50, y: 60 } },
    ]);
  });

  it("rejects invalid delay configuration instead of silently mis-timing previews", () => {
    expect(() => createChordPreviewIntent(() => undefined, -1)).toThrow(RangeError);
    expect(() => createChordPreviewIntent(() => undefined, Number.NaN)).toThrow(RangeError);
  });
});
