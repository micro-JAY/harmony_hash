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
  if (voicings.length === 0) return [];
  if (!Number.isFinite(bpm) || bpm <= 0) {
    throw new Error("BPM must be a positive finite number");
  }
  if (!Number.isFinite(beatsPerChord) || beatsPerChord <= 0) {
    throw new Error("beatsPerChord must be a positive finite number");
  }

  const secondsPerBeat = 60 / bpm;
  const chordDuration = secondsPerBeat * beatsPerChord;

  return voicings.map((voicing, i) => ({
    startTime: i * chordDuration,
    duration: chordDuration,
    notes: voicing.notes.map((n) => n.midi),
    chordIndex: i,
  }));
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
}

interface PlaybackGainNode<Destination> {
  gain: PlaybackAudioParam;
  connect(destination: Destination): unknown;
}

interface PlaybackOscillatorNode<Gain> {
  type: OscillatorType;
  frequency: { value: number };
  connect(gain: Gain): unknown;
  start(when?: number): void;
  stop(when?: number): void;
}

interface PlaybackAudioContext<Destination, Gain, Oscillator> {
  currentTime: number;
  destination: Destination;
  createGain(): Gain;
  createOscillator(): Oscillator;
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
  Oscillator extends PlaybackOscillatorNode<Gain>,
>(
  schedule: ReadonlyArray<PlaybackEvent>,
  context: PlaybackAudioContext<Destination, Gain, Oscillator>,
  onChordChange?: (chordIndex: number | null) => void,
): PlaybackHandle {
  const startedAt = context.currentTime;
  const oscillators: Oscillator[] = [];
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
    }
    onChordChange?.(null);
  };

  try {
    for (const event of schedule) {
      const eventStart = startedAt + event.startTime;
      const eventEnd = eventStart + event.duration;

      const msToStart = Math.max(0, event.startTime * 1000);
      timeouts.push(setTimeout(() => onChordChange?.(event.chordIndex), msToStart));

      for (const midi of event.notes) {
        const osc = context.createOscillator();
        oscillators.push(osc);
        osc.type = "triangle";
        osc.frequency.value = midiToFrequency(midi);

        const gain = context.createGain();
        const peak = 0.12 / Math.max(1, event.notes.length / 3);

        gain.gain.setValueAtTime(0, eventStart);
        gain.gain.linearRampToValueAtTime(peak, eventStart + 0.02);
        gain.gain.linearRampToValueAtTime(peak * 0.7, eventStart + 0.15);
        gain.gain.setValueAtTime(peak * 0.7, Math.max(eventStart + 0.16, eventEnd - 0.08));
        gain.gain.linearRampToValueAtTime(0, eventEnd);

        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(eventStart);
        osc.stop(eventEnd + 0.05);
      }
    }

    // Clear the active-chord callback once playback ends.
    const lastEvent = schedule[schedule.length - 1];
    if (lastEvent) {
      const endMs = (lastEvent.startTime + lastEvent.duration) * 1000 + 50;
      timeouts.push(setTimeout(() => onChordChange?.(null), endMs));
    }
  } catch (error) {
    stop();
    throw error;
  }

  return { stop };
}
