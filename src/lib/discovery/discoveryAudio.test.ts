import { afterEach, describe, expect, it, vi } from "vitest";
import { createDiscoveryLoop, createDiscoverySynth } from "./discoveryAudio";
import type { PlaybackEvent } from "../audioEngine";

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function loopFixture() {
  vi.useFakeTimers();
  const origin = Date.now();
  const context = {
    state: "running",
    get currentTime() { return (Date.now() - origin) / 1000; },
    resume: vi.fn(async () => { context.state = "running"; }),
    close: vi.fn(async () => { context.state = "closed"; }),
  };
  const stops: ReturnType<typeof vi.fn>[] = [];
  const schedule = vi.fn((_events: readonly PlaybackEvent[]) => {
    const stop = vi.fn();
    stops.push(stop);
    return { stop };
  });
  const onState = vi.fn();
  const onError = vi.fn();
  const loop = createDiscoveryLoop({ createContext: () => context, schedule, onState, onError });
  return { loop, context, stops, schedule, onState, onError };
}

describe("Discovery accompaniment", () => {
  it("preserves silent ukulele slots and the full loop duration", async () => {
    const { loop, schedule, onError } = loopFixture();
    expect(await loop.start({ timbre: "ukulele", voicings: [[60], [], [67], []], bpm: 120, allowRests: true })).toBe(true);
    const events = schedule.mock.calls[0][0];
    expect(events.map(({ notes, chordIndex }) => ({ notes, chordIndex }))).toEqual([
      { notes: [60], chordIndex: 0 }, { notes: [], chordIndex: 1 },
      { notes: [67], chordIndex: 2 }, { notes: [], chordIndex: 3 },
    ]);
    expect(events[3].startTime).toBeCloseTo(3.03);
    expect(schedule.mock.calls[1][0][0].startTime).toBeCloseTo(4.03);
    expect(onError).not.toHaveBeenCalled();
    loop.stop();
  });

  it("rejects an entirely silent ukulele loop", async () => {
    const { loop, schedule, onError } = loopFixture();
    expect(await loop.start({ timbre: "ukulele", voicings: [[], []], bpm: 120, allowRests: true })).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "Playback requires at least one playable chord" }));
  });

  it("queues continuous cycles on the audio clock and preserves immutable voicings", async () => {
    const { loop, schedule, stops, onError } = loopFixture();
    const voicings = [[60, 64, 67], [62, 65, 69]];
    expect(await loop.start({ timbre: "piano", voicings, bpm: 120 })).toBe(true);
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule.mock.calls[0][0][0].startTime).toBeCloseTo(0.03);
    expect(schedule.mock.calls[1][0][0].startTime).toBeCloseTo(2.03);
    voicings[0][0] = 80;
    await vi.advanceTimersByTimeAsync(2030);
    expect(schedule).toHaveBeenCalledTimes(3);
    expect(schedule.mock.calls[2][0][0].startTime).toBeCloseTo(2);
    expect(schedule.mock.calls[2][0][0].notes).toEqual([60, 64, 67]);
    loop.stop();
    expect(stops.every((stop) => stop.mock.calls.length === 1)).toBe(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(schedule).toHaveBeenCalledTimes(3);
    expect(onError).not.toHaveBeenCalled();
  });

  it("does not start after stop while audio resumes", async () => {
    const { loop, context, schedule } = loopFixture();
    context.state = "suspended";
    let resume: (() => void) | undefined;
    context.resume.mockImplementation(() => new Promise<void>((resolve) => { resume = resolve; }));
    const pending = loop.start({ timbre: "guitar", voicings: [[48, 55, 60]], bpm: 110 });
    loop.stop();
    resume?.();
    expect(await pending).toBe(false);
    expect(schedule).not.toHaveBeenCalled();
  });

  it("surfaces unavailable audio, invalid data, and stalled resume", async () => {
    const { loop, context, onError } = loopFixture();
    expect(await loop.start({ timbre: "piano", voicings: [[999]], bpm: 120 })).toBe(false);
    expect(onError).toHaveBeenCalledTimes(1);
    context.state = "suspended";
    context.resume.mockImplementation(() => new Promise<void>(() => undefined));
    const pending = loop.start({ timbre: "piano", voicings: [[60]], bpm: 120 });
    await vi.advanceTimersByTimeAsync(2000);
    expect(await pending).toBe(false);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it("closes its own context on disposal and can start after a Strict Mode remount", async () => {
    const { loop, context } = loopFixture();
    await loop.start({ timbre: "piano", voicings: [[60]], bpm: 120 });
    loop.dispose();
    expect(context.close).toHaveBeenCalledTimes(1);
    await loop.start({ timbre: "piano", voicings: [[60]], bpm: 140 });
    expect(context.resume).toHaveBeenCalledTimes(1);
    loop.dispose();
  });
});

describe("Discovery live sound", () => {
  it("cancels notes released before audio resumes and isolates note sources", async () => {
    vi.useFakeTimers();
    const oscillators: Array<{ start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
    let finishResume: (() => void) | undefined;
    class FakeContext {
      state = "suspended";
      currentTime = 0;
      destination = {};
      resume() { return new Promise<void>((resolve) => { finishResume = () => { this.state = "running"; resolve(); }; }); }
      close() { this.state = "closed"; return Promise.resolve(); }
      createOscillator() {
        const oscillator = { type: "", frequency: { value: 0 }, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), onended: null };
        oscillators.push(oscillator);
        return oscillator;
      }
      createGain() {
        return { gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn(), setTargetAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
      }
    }
    vi.stubGlobal("AudioContext", FakeContext);
    const error = vi.fn();
    const synth = createDiscoverySynth(error);
    synth.press("released", 60);
    synth.release("released");
    finishResume?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(oscillators).toHaveLength(0);
    synth.press("keyboard", 60);
    synth.press("midi", 60);
    await vi.advanceTimersByTimeAsync(0);
    expect(oscillators).toHaveLength(2);
    synth.release("keyboard");
    expect(oscillators[0].stop).toHaveBeenCalledTimes(1);
    expect(oscillators[1].stop).not.toHaveBeenCalled();
    synth.dispose();
    expect(oscillators[1].stop).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });
});
