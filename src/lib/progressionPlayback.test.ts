import { afterEach, describe, expect, it, vi } from "vitest";
import type { PlaybackHandle } from "./audioEngine";
import {
  createProgressionPlaybackController,
  type ResumableAudioContext,
} from "./progressionPlayback";
import type { VoicedChord } from "./types";

const voicings: VoicedChord[] = [{ notes: [], voicingType: "root" }];

function controllerFixture({
  state = "running",
  resume,
  createError,
  scheduleError,
  resumeTimeoutMs = 50,
}: {
  state?: ResumableAudioContext["state"];
  resume?: () => Promise<void>;
  createError?: Error;
  scheduleError?: Error;
  resumeTimeoutMs?: number;
} = {}) {
  const context: ResumableAudioContext = {
    state,
    resume: vi.fn(async () => {
      if (resume) await resume();
      else context.state = "running";
    }),
  };
  const handle: PlaybackHandle = { stop: vi.fn() };
  let publishChord: ((index: number | null) => void) | undefined;
  const createContext = vi.fn(() => {
    if (createError) throw createError;
    return context;
  });
  const schedule = vi.fn((
    _voicings: ReadonlyArray<VoicedChord>,
    _context: ResumableAudioContext,
    onChordChange: (index: number | null) => void,
  ) => {
    if (scheduleError) throw scheduleError;
    publishChord = onChordChange;
    return handle;
  });
  const onChordChange = vi.fn<(index: number | null) => void>();
  const onStateChange = vi.fn<(state: "idle" | "starting" | "playing") => void>();
  const onError = vi.fn<(error: unknown) => void>();
  const controller = createProgressionPlaybackController({
    createContext,
    schedule,
    onChordChange,
    onStateChange,
    onError,
    resumeTimeoutMs,
  });

  return {
    context,
    controller,
    createContext,
    handle,
    onChordChange,
    onStateChange,
    onError,
    publishChord: (index: number | null) => publishChord?.(index),
    schedule,
  };
}

describe("progression playback controller", () => {
  afterEach(() => vi.useRealTimers());

  it("awaits a suspended context before reporting playback started", async () => {
    const fixture = controllerFixture({ state: "suspended" });

    await expect(fixture.controller.start(voicings)).resolves.toBe("started");

    expect(fixture.context.resume).toHaveBeenCalledTimes(1);
    expect(fixture.schedule).toHaveBeenCalledTimes(1);
    expect(fixture.controller.getState()).toBe("playing");
    expect(fixture.onStateChange).toHaveBeenNthCalledWith(1, "starting");
    expect(fixture.onStateChange).toHaveBeenNthCalledWith(2, "playing");
  });

  it("prevents a concurrent start while resume is pending", async () => {
    let releaseResume!: () => void;
    const fixture = controllerFixture({
      state: "suspended",
      resume: () => new Promise<void>((resolve) => {
        releaseResume = () => {
          fixture.context.state = "running";
          resolve();
        };
      }),
    });

    const firstStart = fixture.controller.start(voicings);
    await vi.waitFor(() => expect(fixture.controller.getState()).toBe("starting"));
    await expect(fixture.controller.start(voicings)).resolves.toBe("already_active");
    releaseResume();
    await expect(firstStart).resolves.toBe("started");
    expect(fixture.schedule).toHaveBeenCalledTimes(1);
  });

  it("fails closed when resume rejects", async () => {
    const failure = new Error("resume denied");
    const fixture = controllerFixture({
      state: "suspended",
      resume: () => Promise.reject(failure),
    });

    await expect(fixture.controller.start(voicings)).resolves.toBe("unavailable");

    expect(fixture.schedule).not.toHaveBeenCalled();
    expect(fixture.onError).toHaveBeenCalledWith(failure);
    expect(fixture.controller.getState()).toBe("idle");
  });

  it("times out a resume promise that never settles", async () => {
    vi.useFakeTimers();
    const fixture = controllerFixture({
      state: "suspended",
      resume: () => new Promise<void>(() => undefined),
      resumeTimeoutMs: 100,
    });

    const start = fixture.controller.start(voicings);
    await vi.advanceTimersByTimeAsync(100);

    await expect(start).resolves.toBe("unavailable");
    expect(fixture.schedule).not.toHaveBeenCalled();
    expect(fixture.onError).toHaveBeenCalledWith(expect.objectContaining({
      message: "Audio context resume timed out",
    }));
    expect(fixture.controller.getState()).toBe("idle");
  });

  it("reports cancellation when stop invalidates a pending resume", async () => {
    let releaseResume!: () => void;
    const fixture = controllerFixture({
      state: "suspended",
      resume: () => new Promise<void>((resolve) => {
        releaseResume = () => {
          fixture.context.state = "running";
          resolve();
        };
      }),
    });

    const start = fixture.controller.start(voicings);
    await vi.waitFor(() => expect(fixture.controller.getState()).toBe("starting"));
    fixture.controller.stop();
    releaseResume();

    await expect(start).resolves.toBe("cancelled");
    expect(fixture.schedule).not.toHaveBeenCalled();
    expect(fixture.onError).not.toHaveBeenCalled();
    expect(fixture.onChordChange).toHaveBeenCalledWith(null);
    expect(fixture.controller.getState()).toBe("idle");
  });

  it("fails closed when context construction throws", async () => {
    const failure = new Error("context construction failed");
    const fixture = controllerFixture({ createError: failure });

    await expect(fixture.controller.start(voicings)).resolves.toBe("unavailable");

    expect(fixture.onError).toHaveBeenCalledWith(failure);
    expect(fixture.schedule).not.toHaveBeenCalled();
    expect(fixture.controller.getState()).toBe("idle");
  });

  it("fails closed when scheduling throws", async () => {
    const failure = new Error("oscillator setup failed");
    const fixture = controllerFixture({ scheduleError: failure });

    await expect(fixture.controller.start(voicings)).resolves.toBe("unavailable");

    expect(fixture.onError).toHaveBeenCalledWith(failure);
    expect(fixture.controller.getState()).toBe("idle");
  });

  it("returns to idle after natural completion", async () => {
    const fixture = controllerFixture();
    await fixture.controller.start(voicings);

    fixture.publishChord(0);
    fixture.publishChord(null);

    expect(fixture.onChordChange).toHaveBeenNthCalledWith(1, 0);
    expect(fixture.onChordChange).toHaveBeenNthCalledWith(2, null);
    expect(fixture.controller.getState()).toBe("idle");
  });

  it("stops the active handle and publishes an idle chord state", async () => {
    const fixture = controllerFixture();
    await fixture.controller.start(voicings);

    fixture.controller.stop();

    expect(fixture.handle.stop).toHaveBeenCalledTimes(1);
    expect(fixture.onChordChange).toHaveBeenCalledWith(null);
    expect(fixture.controller.getState()).toBe("idle");
  });
});
