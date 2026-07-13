import type { PlaybackHandle } from "./audioEngine";
import type { VoicedChord } from "./types";

export type PlaybackControllerState = "idle" | "starting" | "playing";
export type PlaybackStartOutcome = "started" | "already_active" | "cancelled" | "unavailable";

const DEFAULT_RESUME_TIMEOUT_MS = 2_000;

export interface ResumableAudioContext {
  state: "suspended" | "running" | "closed" | "interrupted";
  resume(): Promise<void>;
}

export interface ProgressionPlaybackControllerDeps<Context extends ResumableAudioContext> {
  createContext(): Context | null;
  schedule(
    voicings: ReadonlyArray<VoicedChord>,
    context: Context,
    onChordChange: (index: number | null) => void,
  ): PlaybackHandle;
  onChordChange(index: number | null): void;
  onStateChange(state: PlaybackControllerState): void;
  onError(error: unknown): void;
  resumeTimeoutMs?: number;
}

export interface ProgressionPlaybackController {
  getState(): PlaybackControllerState;
  start(voicings: ReadonlyArray<VoicedChord>): Promise<PlaybackStartOutcome>;
  stop(): void;
}

function resumeWithin<Context extends ResumableAudioContext>(
  context: Context,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise<boolean>((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(false);
    }, timeoutMs);

    void context.resume().then(
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        resolve(true);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

/** Owns one progression playback lifecycle across UI and voice-tool callers. */
export function createProgressionPlaybackController<Context extends ResumableAudioContext>(
  deps: ProgressionPlaybackControllerDeps<Context>,
): ProgressionPlaybackController {
  let context: Context | null = null;
  let handle: PlaybackHandle | null = null;
  let state: PlaybackControllerState = "idle";
  let generation = 0;

  const setState = (nextState: PlaybackControllerState) => {
    if (state === nextState) return;
    state = nextState;
    deps.onStateChange(nextState);
  };

  const reset = () => {
    handle = null;
    setState("idle");
  };

  return {
    getState: () => state,

    start: async (voicings) => {
      if (state !== "idle") return "already_active";
      if (voicings.length === 0) return "unavailable";

      setState("starting");
      const attempt = ++generation;

      try {
        if (!context || context.state === "closed") {
          context = deps.createContext();
        }
        if (!context) return "unavailable";

        if (context.state !== "running") {
          const resumed = await resumeWithin(
            context,
            deps.resumeTimeoutMs ?? DEFAULT_RESUME_TIMEOUT_MS,
          );
          if (attempt !== generation) return "cancelled";
          if (!resumed) {
            deps.onError(new Error("Audio context resume timed out"));
            return "unavailable";
          }
        }
        if (attempt !== generation) return "cancelled";
        if (context.state !== "running") {
          deps.onError(new Error(`Audio context remained ${context.state} after resume`));
          return "unavailable";
        }

        const nextHandle = deps.schedule(voicings, context, (index) => {
          if (attempt !== generation) return;
          if (index === null) reset();
          else setState("playing");
          deps.onChordChange(index);
        });

        if (attempt !== generation) {
          nextHandle.stop();
          return "cancelled";
        }

        handle = nextHandle;
        setState("playing");
        return "started";
      } catch (error) {
        if (attempt !== generation) return "cancelled";
        deps.onError(error);
        return "unavailable";
      } finally {
        if (attempt === generation && !handle) reset();
      }
    },

    stop: () => {
      if (state === "idle" && !handle) return;
      generation += 1;
      const activeHandle = handle;
      reset();
      activeHandle?.stop();
      // The handle's callback belongs to the previous generation and is ignored.
      deps.onChordChange(null);
    },
  };
}
