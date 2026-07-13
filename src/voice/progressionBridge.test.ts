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

function bridgeFixture({
  instrument = "guitar",
  timeline = [timelineChord("Cmaj7"), timelineChord("Am7"), timelineChord("G7")],
  playbackOutcome = "started",
}: {
  instrument?: "guitar" | "piano";
  timeline?: BridgeChord[];
  playbackOutcome?: "started" | "already_active" | "cancelled" | "unavailable";
} = {}) {
  const setHighlight = vi.fn<(index: number | null) => void>();
  const startPlayback = vi.fn(async () => playbackOutcome);
  const noVoicings: VoicedChord[] = [];
  const deps: ProgressionBridgeDeps = {
    getChords: () => timeline,
    getInstrument: () => instrument,
    getVoicings: () => noVoicings,
    setProgression: vi.fn(),
    appendChords: vi.fn(),
    removeChordAt: vi.fn(),
    startPlayback,
    randomizeVoicings: vi.fn(),
    setHighlight,
  };
  return { bridge: createProgressionBridge(deps), setHighlight, startPlayback };
}

describe("progression bridge playback", () => {
  it("starts idle piano playback and reports that exact outcome", async () => {
    const { bridge, startPlayback } = bridgeFixture({ instrument: "piano" });

    await expect(bridge.play()).resolves.toEqual({
      ok: true,
      status: "started",
      message: "Progression playback started.",
    });
    expect(startPlayback).toHaveBeenCalledTimes(1);
  });

  it("does not restart playback that is already running", async () => {
    const { bridge, startPlayback } = bridgeFixture({
      instrument: "piano",
      playbackOutcome: "already_active",
    });

    await expect(bridge.play()).resolves.toEqual({
      ok: true,
      status: "already_playing",
      message: "The progression is already starting or playing; playback was not restarted.",
    });
    expect(startPlayback).toHaveBeenCalledTimes(1);
  });

  it("reports the piano-view requirement without starting playback", async () => {
    const { bridge, startPlayback } = bridgeFixture();

    await expect(bridge.play()).resolves.toEqual({
      ok: false,
      status: "requires_piano",
      message: "Playback works in the piano view. Ask the user to switch to piano, then try again.",
    });
    expect(startPlayback).not.toHaveBeenCalled();
  });

  it("reports an empty piano timeline without starting playback", async () => {
    const { bridge, startPlayback } = bridgeFixture({ instrument: "piano", timeline: [] });

    await expect(bridge.play()).resolves.toEqual({
      ok: false,
      status: "empty",
      message: "There are no chords on the timeline to play yet.",
    });
    expect(startPlayback).not.toHaveBeenCalled();
  });

  it("reports unavailable browser audio instead of claiming playback started", async () => {
    const { bridge, startPlayback } = bridgeFixture({
      instrument: "piano",
      playbackOutcome: "unavailable",
    });

    await expect(bridge.play()).resolves.toEqual({
      ok: false,
      status: "unavailable",
      message: "Audio playback could not start in this browser.",
    });
    expect(startPlayback).toHaveBeenCalledTimes(1);
  });

  it("reports a cancelled start without blaming browser audio support", async () => {
    const { bridge } = bridgeFixture({
      instrument: "piano",
      playbackOutcome: "cancelled",
    });

    await expect(bridge.play()).resolves.toEqual({
      ok: false,
      status: "cancelled",
      message: "Playback start was cancelled before audio began.",
    });
  });
});

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
