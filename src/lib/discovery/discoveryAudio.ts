import { buildMidiPlaybackSchedule, midiToFrequency, playSchedule } from "../audioEngine";
import type { PlaybackEvent, PlaybackHandle, ProgressionPlaybackRequest } from "../audioEngine";

export type DiscoveryPlaybackRequest = ProgressionPlaybackRequest & { readonly allowRests?: boolean };

export function createDiscoverySynth(onError: (error: unknown) => void) {
  let context: AudioContext | null = null;
  let generation = 0;
  let ready: Promise<boolean> | null = null;
  const desired = new Map<string, { midi: number; velocity: number }>();
  const voices = new Map<string, { oscillator: OscillatorNode; gain: GainNode }>();
  const sounding = new Set<{ oscillator: OscillatorNode; gain: GainNode }>();
  const previewTimers = new Set<ReturnType<typeof setTimeout>>();
  let previewId = 0;

  async function prepare(): Promise<boolean> {
    if (ready) return ready;
    try {
      if (!context || context.state === "closed") {
        if (typeof AudioContext === "undefined") throw new Error("Web Audio is unavailable");
        context = new AudioContext();
      }
      if (context.state === "running") return true;
      const current = context;
      ready = current.resume().then(() => current.state === "running");
      return await ready;
    } catch (error) {
      onError(error);
      return false;
    } finally {
      ready = null;
    }
  }

  function release(source: string) {
    desired.delete(source);
    const voice = voices.get(source);
    if (!voice || !context) return;
    voices.delete(source);
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, 0.018);
    voice.oscillator.stop(now + 0.09);
    voice.oscillator.onended = () => {
      voice.oscillator.disconnect();
      voice.gain.disconnect();
      sounding.delete(voice);
    };
  }

  function press(source: string, midi: number, velocity = 0.7) {
    if (desired.has(source)) return;
    desired.set(source, { midi, velocity });
    const attempt = generation;
    void prepare().then((available) => {
      if (!available || attempt !== generation || !desired.has(source) || !context || voices.has(source)) return;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.value = midiToFrequency(midi);
        gain.gain.setValueAtTime(0, context.currentTime);
        gain.gain.linearRampToValueAtTime(0.045 * Math.max(0.05, Math.min(1, velocity)), context.currentTime + 0.008);
        oscillator.connect(gain);
        gain.connect(context.destination);
        const voice = { oscillator, gain };
        voices.set(source, voice);
        sounding.add(voice);
        oscillator.start();
      } catch (error) {
        onError(error);
        release(source);
      }
    });
  }

  function silence() {
    generation++;
    previewTimers.forEach(clearTimeout);
    previewTimers.clear();
    for (const source of desired.keys()) release(source);
  }

  return {
    prepare,
    press,
    release,
    silence,
    preview(midi: number) {
      const source = `preview:${++previewId}`;
      press(source, midi);
      const timer = setTimeout(() => {
        previewTimers.delete(timer);
        release(source);
      }, 550);
      previewTimers.add(timer);
    },
    dispose() {
      silence();
      for (const voice of sounding) {
        voice.oscillator.onended = null;
        voice.oscillator.disconnect();
        voice.gain.disconnect();
      }
      sounding.clear();
      const current = context;
      context = null;
      ready = null;
      if (current && current.state !== "closed") void current.close().catch(onError);
    },
  };
}

export interface DiscoveryLoopContext {
  readonly currentTime: number;
  readonly state: string;
  resume(): Promise<void>;
  close(): Promise<void>;
}

export interface DiscoveryLoopState {
  readonly phase: "idle" | "starting" | "playing";
  readonly chordIndex: number | null;
}

export function createDiscoveryLoop<Context extends DiscoveryLoopContext>(deps: {
  createContext(): Context | null;
  schedule(events: readonly PlaybackEvent[], context: Context, onChord: (index: number | null) => void, request: DiscoveryPlaybackRequest): PlaybackHandle;
  onState(state: DiscoveryLoopState): void;
  onError(error: unknown): void;
}) {
  let context: Context | null = null;
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  const handles = new Set<PlaybackHandle>();

  function stop() {
    generation++;
    active = false;
    if (timer !== null) clearTimeout(timer);
    timer = null;
    // Keep an in-flight resume deadline alive; generation cancels its result.
    for (const handle of handles) handle.stop();
    handles.clear();
    deps.onState({ phase: "idle", chordIndex: null });
  }

  async function start(request: DiscoveryPlaybackRequest): Promise<boolean> {
    stop();
    const attempt = generation;
    if (request.voicings.length === 0) return false;
    let events: PlaybackEvent[];
    let snapshot: DiscoveryPlaybackRequest;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    try {
      snapshot = { ...request, voicings: request.voicings.map((notes) => [...notes]) };
      events = buildMidiPlaybackSchedule(snapshot.voicings, snapshot.bpm, snapshot.beatsPerChord, snapshot.allowRests);
      if (!context || context.state === "closed") context = deps.createContext();
      if (!context) throw new Error("Web Audio is unavailable");
      deps.onState({ phase: "starting", chordIndex: null });
      if (context.state !== "running") {
        const resumed = await Promise.race([
          context.resume().then(() => true),
          new Promise<boolean>((resolve) => { resumeTimer = setTimeout(() => resolve(false), 2_000); }),
        ]);
        if (resumeTimer !== null) clearTimeout(resumeTimer);
        resumeTimer = null;
        if (attempt !== generation) return false;
        if (!resumed || context.state !== "running") throw new Error("Audio did not start; try playing again");
      }
      if (attempt !== generation) return false;
      active = true;
      const last = events[events.length - 1];
      const duration = last.startTime + last.duration;
      const origin = context.currentTime + 0.03;
      let cycle = 0;
      const queueCycle = () => {
        if (!active || attempt !== generation || !context) return;
        const offset = Math.max(0, origin + cycle * duration - context.currentTime);
        let handle: PlaybackHandle | null = null;
        handle = deps.schedule(events.map((event) => ({ ...event, startTime: event.startTime + offset })), context, (index) => {
          if (!active || attempt !== generation) return;
          if (index === null) {
            if (handle) handles.delete(handle);
          } else deps.onState({ phase: "playing", chordIndex: index });
        }, snapshot);
        handles.add(handle);
        cycle++;
      };
      const tick = () => {
        if (!active || attempt !== generation || !context) return;
        try {
          queueCycle();
          // Schedule one full cycle ahead on the audio clock, so cleanup's
          // extra tail and browser timer jitter do not introduce a loop gap.
          const next = origin + (cycle - 1) * duration;
          timer = setTimeout(tick, Math.max(10, (next - context.currentTime) * 1000));
        } catch (error) {
          stop();
          deps.onError(error);
        }
      };
      queueCycle();
      tick();
      deps.onState({ phase: "playing", chordIndex: null });
      return true;
    } catch (error) {
      if (resumeTimer !== null) clearTimeout(resumeTimer);
      resumeTimer = null;
      if (attempt === generation) {
        stop();
        deps.onError(error);
      }
      return false;
    }
  }

  return {
    start,
    stop,
    dispose() {
      stop();
      const current = context;
      context = null;
      if (current && current.state !== "closed") void current.close().catch(deps.onError);
    },
  };
}

export function scheduleDiscoveryLoop(
  events: readonly PlaybackEvent[], context: AudioContext,
  onChord: (index: number | null) => void, request: DiscoveryPlaybackRequest,
): PlaybackHandle {
  return playSchedule(events, context, onChord, request.timbre);
}
