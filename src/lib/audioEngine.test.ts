import { describe, it, expect } from "vitest";
import { buildPlaybackSchedule, midiToFrequency } from "./audioEngine";
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
