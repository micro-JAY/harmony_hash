/**
 * The real ProgressionBridge for Harmony Hash.
 *
 * The voice tool layer calls these methods from ElevenLabs callbacks that fire
 * OUTSIDE React's render cycle, so the bridge must never close over a snapshot
 * of state. App.tsx supplies `deps` built over refs + stable callbacks (a
 * ref-mirror) so every call reads the live timeline. See progressionBridge in
 * App.tsx and the design note in the openspec change.
 *
 * This adapter is the structural successor to the package's exampleAdapter.ts,
 * rewritten against the real builder: chords are resolved through the shipped
 * `lookupChord`, analysis is computed from `parseNotes` + the voice-leading
 * engine, and playback honors the app's piano-only constraint.
 */
import type { IndexedChord, Instrument } from "../lib/types";
import {
  formatNoteForDisplay,
  lookupChord,
  parseNotes,
  prefersFlatNotation,
} from "../lib/chordData";
import { computeVoiceLedProgression } from "../lib/harmonyBrain";
import type {
  ChordRef,
  PlaybackResult,
  ProgressionAnalysis,
  ProgressionBridge,
  ProgressionSnapshot,
} from "./types";

/** One chord on the builder timeline. Structurally matches App.tsx's DisplayChord. */
export interface BridgeChord {
  input: string;
  chord: IndexedChord;
}

/**
 * Stable accessors/actions the bridge needs from the host. App.tsx wires these
 * over refs + stable callbacks so the bridge (built once) always reads fresh
 * state and never captures a stale `chords` array.
 */
export interface ProgressionBridgeDeps {
  /** The current timeline (reads a ref mirror of `chords`). */
  getChords(): BridgeChord[];
  /** The current instrument/view ("guitar" | "piano"). */
  getInstrument(): Instrument;
  /** Replace the whole timeline (resets per-card variant/lock/style state). */
  setProgression(chords: BridgeChord[]): void;
  /** Append to the timeline, preserving existing per-card state. */
  appendChords(chords: BridgeChord[]): void;
  /** Start playback if it is not already running (no-op when playing). */
  startPlayback(): void;
  /** Reshuffle the variants/voicings of the existing chords. */
  randomizeVoicings(): void;
  /** Highlight a timeline chord by index, or clear with null. */
  setHighlight(index: number | null): void;
}

/** Resolve a chord-name string into a BridgeChord, or throw a clear, speakable error. */
function resolveChord(symbol: string): BridgeChord {
  const trimmed = typeof symbol === "string" ? symbol.trim() : "";
  if (!trimmed) {
    throw new Error("A chord name was empty — give me a chord like 'Am7' or 'Cmaj7'.");
  }
  const chord = lookupChord(trimmed);
  if (!chord) {
    throw new Error(`I couldn't find a chord called "${trimmed}". Try a different name.`);
  }
  return { input: trimmed, chord };
}

/** Resolve a ChordRef to a concrete timeline index, or throw. */
function resolveIndex(chords: BridgeChord[], ref: ChordRef): number {
  if (typeof ref.index === "number") {
    if (!Number.isInteger(ref.index) || ref.index < 0 || ref.index >= chords.length) {
      const upper = chords.length - 1;
      throw new Error(
        chords.length === 0
          ? "The timeline is empty — there's no chord at that position."
          : `Chord index ${ref.index} is outside the timeline (0–${upper}).`,
      );
    }
    return ref.index;
  }
  if (ref.symbol) {
    const needle = ref.symbol.trim().toLowerCase();
    const i = chords.findIndex(
      (c) =>
        c.chord.displayName.toLowerCase() === needle || c.input.toLowerCase() === needle,
    );
    if (i >= 0) return i;
    throw new Error(`There's no "${ref.symbol}" chord on the timeline.`);
  }
  throw new Error("Provide an index or a symbol to identify the chord.");
}

/** Format a chord's tones for the agent in display notation (e.g. "Eb", "F#"). */
function chordToneNames(chord: IndexedChord): string[] {
  const preferFlats = prefersFlatNotation(chord.root);
  return parseNotes(chord.entry).map((n) => formatNoteForDisplay(n, preferFlats));
}

export function createProgressionBridge(deps: ProgressionBridgeDeps): ProgressionBridge {
  const symbolsOf = (chords: BridgeChord[]): string[] =>
    chords.map((c) => c.chord.displayName);

  const snapshot = (): ProgressionSnapshot => ({ chords: symbolsOf(deps.getChords()) });

  const analyze = (): ProgressionAnalysis => {
    const chords = deps.getChords();
    const noteSets = chords.map((c) => parseNotes(c.chord.entry));
    const voiced = computeVoiceLedProgression(noteSets);
    return {
      chords: symbolsOf(chords),
      chordCount: chords.length,
      chordTones: chords.map((c) => chordToneNames(c.chord)),
      voicing: voiced.map((v, i) => {
        const preferFlats = prefersFlatNotation(chords[i].chord.root);
        return v.notes.map((n) => `${formatNoteForDisplay(n.name, preferFlats)}${n.octave}`);
      }),
    };
  };

  return {
    getSnapshot: snapshot,
    analyze,

    addChords: (incoming) => {
      // Resolve every name BEFORE mutating, so a bad name throws and the
      // timeline is left untouched (the agent retries on the thrown error).
      const resolved = incoming.map(resolveChord);
      deps.appendChords(resolved);
    },
    replaceProgression: (incoming) => {
      const resolved = incoming.map(resolveChord);
      deps.setProgression(resolved);
    },
    clear: () => deps.setProgression([]),
    removeChord: (ref) => {
      const chords = deps.getChords();
      const i = resolveIndex(chords, ref);
      deps.setProgression(chords.filter((_, idx) => idx !== i));
    },

    play: (): PlaybackResult => {
      if (deps.getInstrument() !== "piano") {
        return {
          ok: false,
          message:
            "Playback works in the piano view. Ask the user to switch to piano, then try again.",
        };
      }
      if (deps.getChords().length === 0) {
        return { ok: false, message: "There are no chords on the timeline to play yet." };
      }
      deps.startPlayback();
      return { ok: true };
    },

    randomize: () => deps.randomizeVoicings(),

    highlightChord: (ref) => {
      if (ref === null) {
        deps.setHighlight(null);
        return;
      }
      deps.setHighlight(resolveIndex(deps.getChords(), ref));
    },
  };
}
