import type { VoicedChord } from "./types";

export interface PlaybackEvent {
  /** Seconds from the start of the schedule. */
  startTime: number;
  /** Duration of the chord in seconds. */
  duration: number;
  /** MIDI numbers of every active note in this chord. */
  notes: number[];
  /** Position in the source progression (for UI highlighting). */
  chordIndex: number;
}

export type PlaybackTimbre = "piano" | "guitar";

export interface ProgressionPlaybackRequest {
  readonly timbre: PlaybackTimbre;
  readonly voicings: ReadonlyArray<ReadonlyArray<number>>;
  readonly bpm: number;
  readonly beatsPerChord?: number;
}

export const MAX_PLAYBACK_EVENTS = 24;
export const MAX_PLAYBACK_NOTES_PER_EVENT = 12;
export const MAX_PLAYBACK_NOTES_TOTAL = 144;

function assertPlaybackCardinality(
  events: ReadonlyArray<{ readonly notes: ReadonlyArray<number> }>,
): void {
  if (events.length > MAX_PLAYBACK_EVENTS) {
    throw new RangeError(`Playback is limited to ${MAX_PLAYBACK_EVENTS} events`);
  }
  let noteCount = 0;
  for (const event of events) {
    if (event.notes.length > MAX_PLAYBACK_NOTES_PER_EVENT) {
      throw new RangeError(
        `Playback events are limited to ${MAX_PLAYBACK_NOTES_PER_EVENT} notes`,
      );
    }
    noteCount += event.notes.length;
    if (noteCount > MAX_PLAYBACK_NOTES_TOTAL) {
      throw new RangeError(`Playback is limited to ${MAX_PLAYBACK_NOTES_TOTAL} notes`);
    }
  }
}

export function buildMidiPlaybackSchedule(
  voicings: ReadonlyArray<ReadonlyArray<number>>,
  bpm: number,
  beatsPerChord = 2,
): PlaybackEvent[] {
  if (voicings.length === 0) return [];
  assertPlaybackCardinality(voicings.map((notes) => ({ notes })));
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error("BPM must be a positive finite number");
  }
  if (!Number.isFinite(beatsPerChord) || beatsPerChord <= 0) {
    throw new Error("beatsPerChord must be a positive finite number");
  }
  for (const voicing of voicings) {
    if (voicing.length === 0 || voicing.some((midi) => !Number.isInteger(midi) || midi < 0 || midi > 127)) {
      throw new Error("Every playback voicing must contain valid MIDI notes");
    }
  }

  const secondsPerBeat = 60 / bpm;
  const chordDuration = secondsPerBeat * beatsPerChord;
  return voicings.map((notes, chordIndex) => ({
    startTime: chordIndex * chordDuration,
    duration: chordDuration,
    notes: [...notes],
    chordIndex,
  }));
}

/**
 * Build a deterministic playback schedule for a voiced progression.
 * Each chord plays for `beatsPerChord` beats at the given BPM. Pure
 * function — no AudioContext required, can be tested in node.
 */
export function buildPlaybackSchedule(
  voicings: ReadonlyArray<VoicedChord>,
  bpm: number,
  beatsPerChord = 2,
): PlaybackEvent[] {
  return buildMidiPlaybackSchedule(
    voicings.map((voicing) => voicing.notes.map((note) => note.midi)),
    bpm,
    beatsPerChord,
  );
}

/** A4 (MIDI 69) = 440Hz. Equal temperament. */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export interface PlaybackHandle {
  /** Cancel the in-flight playback and clear the active-chord callback. */
  stop: () => void;
}

interface PlaybackAudioParam {
  value: number;
  setValueAtTime(value: number, startTime: number): AudioParam;
  linearRampToValueAtTime(value: number, endTime: number): AudioParam;
  exponentialRampToValueAtTime(value: number, endTime: number): AudioParam;
}

interface PlaybackGainNode<Destination> {
  gain: PlaybackAudioParam;
  connect(destination: Destination): unknown;
  disconnect(): void;
}

interface PlaybackFilterNode<Gain> {
  type: BiquadFilterType;
  frequency: PlaybackAudioParam;
  Q: { value: number };
  connect(destination: Gain): unknown;
  disconnect(): void;
}

interface PlaybackOscillatorNode<Next> {
  type: OscillatorType;
  frequency: { value: number };
  connect(next: Next): unknown;
  start(when?: number): void;
  stop(when?: number): void;
  disconnect(): void;
}

interface PlaybackAudioContext<Destination, Gain, Oscillator, Filter> {
  currentTime: number;
  destination: Destination;
  createGain(): Gain;
  createOscillator(): Oscillator;
  createBiquadFilter(): Filter;
}

/**
 * Play a schedule using the provided AudioContext. Returns a handle
 * with `stop()` that interrupts playback. The `onChordChange` callback
 * fires with the chord index when each chord starts and with `null`
 * when playback ends. Caller owns the AudioContext lifecycle.
 *
 * Each note is a triangle wave with a simple ADSR envelope — soft
 * enough to layer chord tones without the harshness of pure sines.
 */
export function playSchedule<
  Destination,
  Gain extends PlaybackGainNode<Destination>,
  Filter extends PlaybackFilterNode<Gain>,
  Oscillator extends PlaybackOscillatorNode<Gain | Filter>,
>(
  schedule: ReadonlyArray<PlaybackEvent>,
  context: PlaybackAudioContext<Destination, Gain, Oscillator, Filter>,
  onChordChange?: (chordIndex: number | null) => void,
  timbre: PlaybackTimbre = "piano",
): PlaybackHandle {
  assertPlaybackCardinality(schedule);
  const startedAt = context.currentTime;
  const oscillators: Oscillator[] = [];
  const gains: Gain[] = [];
  const filters: Filter[] = [];
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  let stopped = false;

  const stop = () => {
    if (stopped) return;
    stopped = true;
    timeouts.forEach((timeout) => clearTimeout(timeout));
    for (const oscillator of oscillators) {
      try {
        oscillator.stop();
      } catch {
        // Already stopped or never started — cleanup is still complete.
      }
      oscillator.disconnect();
    }
    filters.forEach((filter) => filter.disconnect());
    gains.forEach((gain) => gain.disconnect());
    onChordChange?.(null);
  };

  try {
    for (const event of schedule) {
      const eventStart = startedAt + event.startTime;
      const eventEnd = eventStart + event.duration;

      const msToStart = Math.max(0, event.startTime * 1000);
      timeouts.push(setTimeout(() => onChordChange?.(event.chordIndex), msToStart));

      const strumWindow = timbre === "guitar"
        ? Math.min(0.09, event.duration * 0.2)
        : 0;
      const stringStep = event.notes.length > 1 ? strumWindow / (event.notes.length - 1) : 0;

      event.notes.forEach((midi, noteIndex) => {
        const noteStart = eventStart + stringStep * noteIndex;
        const osc = context.createOscillator();
        oscillators.push(osc);
        osc.type = timbre === "guitar" ? "sawtooth" : "triangle";
        osc.frequency.value = midiToFrequency(midi);

        const gain = context.createGain();
        gains.push(gain);
        const peak = (timbre === "guitar" ? 0.085 : 0.12) / Math.max(1, event.notes.length / 3);

        if (timbre === "guitar") {
          const decayEnd = Math.min(eventEnd - 0.02, noteStart + 0.62);
          gain.gain.setValueAtTime(0.0001, noteStart);
          gain.gain.linearRampToValueAtTime(peak, noteStart + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);
          gain.gain.linearRampToValueAtTime(0, eventEnd);

          const filter = context.createBiquadFilter();
          filters.push(filter);
          filter.type = "lowpass";
          filter.Q.value = 1.4;
          filter.frequency.setValueAtTime(2400, noteStart);
          filter.frequency.exponentialRampToValueAtTime(720, decayEnd);
          osc.connect(filter);
          filter.connect(gain);
        } else {
          gain.gain.setValueAtTime(0, eventStart);
          gain.gain.linearRampToValueAtTime(peak, eventStart + 0.02);
          gain.gain.linearRampToValueAtTime(peak * 0.7, eventStart + 0.15);
          gain.gain.setValueAtTime(peak * 0.7, Math.max(eventStart + 0.16, eventEnd - 0.08));
          gain.gain.linearRampToValueAtTime(0, eventEnd);
          osc.connect(gain);
        }
        gain.connect(context.destination);
        osc.start(noteStart);
        osc.stop(eventEnd + 0.05);
      });
    }

    // Clear the active-chord callback once playback ends.
    const lastEvent = schedule[schedule.length - 1];
    if (lastEvent) {
      const endMs = (lastEvent.startTime + lastEvent.duration) * 1000 + 50;
      timeouts.push(setTimeout(() => {
        oscillators.forEach((oscillator) => oscillator.disconnect());
        filters.forEach((filter) => filter.disconnect());
        gains.forEach((gain) => gain.disconnect());
        onChordChange?.(null);
      }, endMs));
    }
  } catch (error) {
    stop();
    throw error;
  }

  return { stop };
}
