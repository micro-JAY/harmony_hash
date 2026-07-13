import { describe, expect, it, vi } from "vitest";
import { lookupChord } from "../lib/chordData";
import type { VoicedChord } from "../lib/types";
import {
  createProgressionBridge,
  type BridgeChord,
  type ProgressionBridgeDeps,
} from "./progressionBridge";

function timelineChord(symbol: string): BridgeChord {
  const chord = lookupChord(symbol);
  if (!chord) throw new Error(`${symbol} fixture is missing from the chord dictionary`);
  return { input: symbol, chord };
}

function bridgeFixture() {
  const timeline = [timelineChord("Cmaj7"), timelineChord("Am7"), timelineChord("G7")];
  const setHighlight = vi.fn<(index: number | null) => void>();
  const noVoicings: VoicedChord[] = [];
  const deps: ProgressionBridgeDeps = {
    getChords: () => timeline,
    getInstrument: () => "guitar",
    getVoicings: () => noVoicings,
    setProgression: vi.fn(),
    appendChords: vi.fn(),
    removeChordAt: vi.fn(),
    startPlayback: vi.fn(),
    randomizeVoicings: vi.fn(),
    setHighlight,
  };
  return { bridge: createProgressionBridge(deps), setHighlight };
}

describe("progression bridge highlighting", () => {
  it("resolves a zero-based chord index", async () => {
    const { bridge, setHighlight } = bridgeFixture();

    await bridge.highlightChord({ index: 1 });

    expect(setHighlight).toHaveBeenCalledWith(1);
  });

  it("resolves a chord symbol without case sensitivity", async () => {
    const { bridge, setHighlight } = bridgeFixture();

    await bridge.highlightChord({ symbol: "g7" });

    expect(setHighlight).toHaveBeenCalledWith(2);
  });

  it("clears the current highlight", async () => {
    const { bridge, setHighlight } = bridgeFixture();

    await bridge.highlightChord(null);

    expect(setHighlight).toHaveBeenCalledWith(null);
  });

  it("rejects a chord reference that is not on the timeline", () => {
    const { bridge, setHighlight } = bridgeFixture();

    expect(() => bridge.highlightChord({ symbol: "Fmaj7" })).toThrow(
      'There\'s no "Fmaj7" chord on the timeline.',
    );
    expect(setHighlight).not.toHaveBeenCalled();
  });
});
