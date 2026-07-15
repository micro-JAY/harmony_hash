import { afterEach, describe, it, expect, vi } from "vitest";
import {
  buildMidiPlaybackSchedule,
  buildPlaybackSchedule,
  midiToFrequency,
  playSchedule,
} from "./audioEngine";
import type { VoicedChord } from "./types";

function voicing(midis: number[]): VoicedChord {
  return {
    notes: midis.map((midi) => ({
      name: "C",
      pitchClass: midi % 12,
      octave: Math.floor(midi / 12) - 1,
      midi,
      hand: "right" as const,
    })),
    voicingType: "root",
  };
}

describe("buildPlaybackSchedule", () => {
  it("returns an empty schedule for empty input", () => {
    expect(buildPlaybackSchedule([], 120)).toEqual([]);
  });

  it("schedules each chord back-to-back at 120 BPM with 2-beat chord length", () => {
    const result = buildPlaybackSchedule(
      [voicing([60, 64, 67]), voicing([62, 65, 69]), voicing([60, 64, 67])],
      120, // 0.5 sec per beat → 1 sec per chord
      2,
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      startTime: 0,
      duration: 1,
      notes: [60, 64, 67],
      chordIndex: 0,
    });
    expect(result[1]).toEqual({
      startTime: 1,
      duration: 1,
      notes: [62, 65, 69],
      chordIndex: 1,
    });
    expect(result[2]).toEqual({
      startTime: 2,
      duration: 1,
      notes: [60, 64, 67],
      chordIndex: 2,
    });
  });

  it("honors a custom beatsPerChord value", () => {
    const result = buildPlaybackSchedule(
      [voicing([60]), voicing([62])],
      60, // 1 sec per beat
      4, // 4 beats per chord → 4 sec per chord
    );
    expect(result[0].startTime).toBe(0);
    expect(result[0].duration).toBe(4);
    expect(result[1].startTime).toBe(4);
    expect(result[1].duration).toBe(4);
  });

  it("preserves chord indices for UI highlighting", () => {
    const result = buildPlaybackSchedule(
      [voicing([60]), voicing([62]), voicing([64]), voicing([65])],
      120,
    );
    expect(result.map((e) => e.chordIndex)).toEqual([0, 1, 2, 3]);
  });

  it("rejects non-positive BPM", () => {
    expect(() => buildPlaybackSchedule([voicing([60])], 0)).toThrow(/positive/);
    expect(() => buildPlaybackSchedule([voicing([60])], -120)).toThrow(/positive/);
    expect(() => buildPlaybackSchedule([voicing([60])], NaN)).toThrow(/finite/);
  });

  it("rejects non-positive beatsPerChord", () => {
    expect(() => buildPlaybackSchedule([voicing([60])], 120, 0)).toThrow(/positive/);
    expect(() => buildPlaybackSchedule([voicing([60])], 120, -1)).toThrow(/positive/);
  });
});

describe("buildMidiPlaybackSchedule", () => {
  it("preserves physical guitar note order and duplicate pitch classes", () => {
    expect(buildMidiPlaybackSchedule([[40, 47, 52, 55, 60, 64]], 120)).toEqual([{
      startTime: 0,
      duration: 1,
      notes: [40, 47, 52, 55, 60, 64],
      chordIndex: 0,
    }]);
  });

  it("rejects empty and out-of-range MIDI voicings", () => {
    expect(() => buildMidiPlaybackSchedule([[]], 120)).toThrow(/valid MIDI/);
    expect(() => buildMidiPlaybackSchedule([[60, 128]], 120)).toThrow(/valid MIDI/);
  });

  it("rejects schedules that exceed event, per-event, or total-note bounds", () => {
    expect(() => buildMidiPlaybackSchedule(
      Array.from({ length: 25 }, () => [60]),
      120,
    )).toThrow(/24 events/);
    expect(() => buildMidiPlaybackSchedule(
      [Array.from({ length: 13 }, (_, index) => 48 + index)],
      120,
    )).toThrow(/12 notes/);
    expect(() => buildMidiPlaybackSchedule(
      Array.from({ length: 13 }, () => Array.from({ length: 12 }, (_, index) => 48 + index)),
      120,
    )).toThrow(/144 notes/);
  });
});

describe("midiToFrequency", () => {
  it("maps A4 (MIDI 69) to 440Hz exactly", () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 5);
  });

  it("maps C4 (MIDI 60) to ~261.63Hz (middle C)", () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });

  it("doubles frequency per octave", () => {
    expect(midiToFrequency(81) / midiToFrequency(69)).toBeCloseTo(2, 5);
  });

  it("halves frequency per octave below A4", () => {
    expect(midiToFrequency(57) / midiToFrequency(69)).toBeCloseTo(0.5, 5);
  });

  it("matches the standard A2 = 110Hz reference", () => {
    expect(midiToFrequency(45)).toBeCloseTo(110, 3);
  });
});

describe("playSchedule", () => {
  afterEach(() => vi.useRealTimers());

  function createAudioFixture() {
    const destination = {};
    const oscillators: Array<{
      type: OscillatorType;
      frequency: { value: number };
      connect: ReturnType<typeof vi.fn>;
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const gains: Array<{
      gain: ReturnType<typeof createParam>;
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];
    const filters: Array<{
      type: BiquadFilterType;
      frequency: ReturnType<typeof createParam>;
      Q: { value: number };
      connect: ReturnType<typeof vi.fn>;
      disconnect: ReturnType<typeof vi.fn>;
    }> = [];

    function createParam() {
      return {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      };
    }

    const context = {
      currentTime: 0,
      destination,
      createOscillator: vi.fn(() => {
        const oscillator = {
          type: "triangle" as OscillatorType,
          frequency: { value: 0 },
          connect: vi.fn((next: unknown) => next),
          start: vi.fn(),
          stop: vi.fn(),
          disconnect: vi.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
      }),
      createGain: vi.fn(() => {
        const gain = {
          gain: createParam(),
          connect: vi.fn((next: unknown) => next),
          disconnect: vi.fn(),
        };
        gains.push(gain);
        return gain;
      }),
      createBiquadFilter: vi.fn(() => {
        const filter = {
          type: "lowpass" as BiquadFilterType,
          frequency: createParam(),
          Q: { value: 0 },
          connect: vi.fn((next: unknown) => next),
          disconnect: vi.fn(),
        };
        filters.push(filter);
        return filter;
      }),
    };

    return { context, filters, gains, oscillators };
  }

  it("uses a simultaneous triangle envelope for piano playback", () => {
    vi.useFakeTimers();
    const fixture = createAudioFixture();

    playSchedule(
      [{ startTime: 0, duration: 1, notes: [60, 64, 67], chordIndex: 0 }],
      fixture.context,
      undefined,
      "piano",
    );

    expect(fixture.oscillators.map((oscillator) => oscillator.type)).toEqual([
      "triangle", "triangle", "triangle",
    ]);
    expect(fixture.oscillators.map((oscillator) => oscillator.start.mock.calls[0]?.[0])).toEqual([
      0, 0, 0,
    ]);
    expect(fixture.filters).toHaveLength(0);
  });

  it("uses a bounded low-pass sawtooth strum for guitar playback", () => {
    vi.useFakeTimers();
    const fixture = createAudioFixture();
    const onChordChange = vi.fn<(index: number | null) => void>();

    const handle = playSchedule(
      [{ startTime: 0, duration: 1, notes: [40, 47, 52], chordIndex: 0 }],
      fixture.context,
      onChordChange,
      "guitar",
    );

    expect(fixture.oscillators.map((oscillator) => oscillator.type)).toEqual([
      "sawtooth", "sawtooth", "sawtooth",
    ]);
    expect(fixture.oscillators.map((oscillator) => oscillator.start.mock.calls[0]?.[0])).toEqual([
      0, 0.045, 0.09,
    ]);
    expect(fixture.filters).toHaveLength(3);
    expect(fixture.filters.every((filter) => filter.type === "lowpass")).toBe(true);
    expect(fixture.gains.every((gain) => (
      gain.gain.exponentialRampToValueAtTime.mock.calls.length === 1
    ))).toBe(true);

    handle.stop();
    expect(fixture.oscillators.every((oscillator) => (
      oscillator.stop.mock.calls.length === 2
      && oscillator.disconnect.mock.calls.length === 1
    ))).toBe(true);
    expect(fixture.filters.every((filter) => filter.disconnect.mock.calls.length === 1)).toBe(true);
    expect(fixture.gains.every((gain) => gain.disconnect.mock.calls.length === 1)).toBe(true);
    expect(onChordChange).toHaveBeenLastCalledWith(null);
  });

  it("cleans partially created audio nodes and timers when scheduling throws", () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const destination = {};
    const gain = {
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(() => destination),
      disconnect: vi.fn(),
    };
    const oscillator = {
      type: "triangle",
      frequency: { value: 0 },
      connect: vi.fn(() => gain),
      start: vi.fn(),
      stop,
      disconnect: vi.fn(),
    } satisfies {
      type: OscillatorType;
      frequency: { value: number };
      connect: (next: typeof gain) => typeof gain;
      start: (when?: number) => void;
      stop: (when?: number) => void;
      disconnect: () => void;
    };
    const context = {
      currentTime: 0,
      destination,
      createOscillator: vi.fn(() => oscillator),
      createGain: vi.fn((): typeof gain => {
        throw new Error("gain creation failed");
      }),
      createBiquadFilter: vi.fn(),
    };
    const onChordChange = vi.fn<(index: number | null) => void>();

    expect(() => playSchedule(
      [{ startTime: 0, duration: 1, notes: [60], chordIndex: 0 }],
      context,
      onChordChange,
    )).toThrow("gain creation failed");

    expect(stop).toHaveBeenCalledTimes(1);
    vi.runAllTimers();
    expect(onChordChange).toHaveBeenCalledOnce();
    expect(onChordChange).toHaveBeenCalledWith(null);
  });
});
