import { describe, expect, it, vi } from "vitest";
import { lookupChord } from "../lib/chordData";
import type { VoicedChord } from "../lib/types";
import {
  createProgressionBridge,
  type BridgeChord,
  type ProgressionBridgeDeps,
} from "./progressionBridge";
import {
  MAX_VOICE_CHORD_SYMBOL_LENGTH,
  MAX_VOICE_PROGRESSION_CHORDS,
} from "./toolSchemas";

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
  const appendChords = vi.fn<(chords: BridgeChord[]) => void>();
  const setProgression = vi.fn<(chords: BridgeChord[]) => void>();
  const noVoicings: VoicedChord[] = [];
  const deps: ProgressionBridgeDeps = {
    getChords: () => timeline,
    getInstrument: () => instrument,
    getVoicings: () => noVoicings,
    setProgression,
    appendChords,
    removeChordAt: vi.fn(),
    startPlayback,
    randomizeVoicings: vi.fn(),
    setHighlight,
  };
  return {
    bridge: createProgressionBridge(deps),
    appendChords,
    setProgression,
    setHighlight,
    startPlayback,
  };
}

describe("progression bridge mutation bounds", () => {
  it("accepts additions up to the total timeline limit", async () => {
    const timeline = [timelineChord("C")];
    const { bridge, appendChords } = bridgeFixture({ timeline });

    await bridge.addChords(
      Array.from({ length: MAX_VOICE_PROGRESSION_CHORDS - timeline.length }, () => "C"),
    );

    expect(appendChords).toHaveBeenCalledOnce();
    expect(appendChords.mock.calls[0]?.[0]).toHaveLength(
      MAX_VOICE_PROGRESSION_CHORDS - timeline.length,
    );
  });

  it("rejects additions whose resulting timeline exceeds the limit", () => {
    const timeline = Array.from(
      { length: MAX_VOICE_PROGRESSION_CHORDS },
      () => timelineChord("C"),
    );
    const { bridge, appendChords } = bridgeFixture({ timeline });

    expect(() => bridge.addChords(["G7"])).toThrow(
      `at most ${MAX_VOICE_PROGRESSION_CHORDS} chords`,
    );
    expect(appendChords).not.toHaveBeenCalled();
  });

  it("rejects oversized replacements and symbols before mutation", () => {
    const { bridge, setProgression } = bridgeFixture();

    expect(() =>
      bridge.replaceProgression(
        Array.from({ length: MAX_VOICE_PROGRESSION_CHORDS + 1 }, () => "C"),
      ),
    ).toThrow(`more than ${MAX_VOICE_PROGRESSION_CHORDS}`);
    expect(() =>
      bridge.replaceProgression([
        "C".repeat(MAX_VOICE_CHORD_SYMBOL_LENGTH + 1),
      ]),
    ).toThrow(`at most ${MAX_VOICE_CHORD_SYMBOL_LENGTH} characters`);
    expect(setProgression).not.toHaveBeenCalled();
  });
});

describe("progression bridge playback", () => {
  it("starts idle guitar playback and reports that exact outcome", async () => {
    const { bridge, startPlayback } = bridgeFixture({ instrument: "guitar" });

    await expect(bridge.play()).resolves.toEqual({
      ok: true,
      status: "started",
      message: "Progression playback started.",
    });
    expect(startPlayback).toHaveBeenCalledTimes(1);
  });

  it("does not restart playback that is already running", async () => {
    const { bridge, startPlayback } = bridgeFixture({
      instrument: "guitar",
      playbackOutcome: "already_active",
    });

    await expect(bridge.play()).resolves.toEqual({
      ok: true,
      status: "already_playing",
      message: "The progression is already starting or playing; playback was not restarted.",
    });
    expect(startPlayback).toHaveBeenCalledTimes(1);
  });

  it("reports an empty guitar timeline without starting playback", async () => {
    const { bridge, startPlayback } = bridgeFixture({ instrument: "guitar", timeline: [] });

    await expect(bridge.play()).resolves.toEqual({
      ok: false,
      status: "empty",
      message: "There are no chords on the timeline to play yet.",
    });
    expect(startPlayback).not.toHaveBeenCalled();
  });

  it("reports unavailable browser audio instead of claiming playback started", async () => {
    const { bridge, startPlayback } = bridgeFixture({
      instrument: "guitar",
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
      instrument: "guitar",
      playbackOutcome: "cancelled",
    });

    await expect(bridge.play()).resolves.toEqual({
      ok: false,
      status: "cancelled",
      message: "Playback start was cancelled before audio began.",
    });
  });

  it("retains piano playback parity", async () => {
    const { bridge, startPlayback } = bridgeFixture({ instrument: "piano" });

    await expect(bridge.play()).resolves.toMatchObject({ ok: true, status: "started" });
    expect(startPlayback).toHaveBeenCalledTimes(1);
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
