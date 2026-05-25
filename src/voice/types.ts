/**
 * Harmony Hash — Voice Agent integration types.
 *
 * The voice module never touches the progression-builder state directly.
 * The host app implements `ProgressionBridge` (see progressionBridge.ts) and
 * passes it to <VoiceAgentProvider/>. Every client tool the agent calls is
 * routed through this interface, so the voice feature stays decoupled from how
 * the builder happens to store its state.
 *
 * This interface is reconciled against the SHIPPED app, which is simpler than
 * the package's idealized "Chords Explorer": Harmony Hash has no builder-level
 * key state, no diatonic/jazz suggestion mode, and no next-chord engine, and
 * `harmonyBrain.ts` does not detect keys, derive roman numerals, or rank
 * compatible scales. So `key`/`mode`/`getSuggestions`/`setKey`/`setMode` are
 * gone and `ProgressionAnalysis` carries only what the app genuinely computes.
 */

/** A live read of the progression builder timeline. */
export interface ProgressionSnapshot {
  /** Ordered chord symbols on the timeline, e.g. ["Cmaj7", "Am9", "Dm7", "G7"]. */
  chords: string[];
}

/**
 * What the app can actually compute for a set of chords. Backed by
 * `parseNotes` + `computeVoiceLedProgression` (harmonyBrain.ts). There is no
 * key detection, roman-numeral analysis, or compatible-scale ranking in the
 * engine, so none of those appear here — the agent may add general theory it
 * knows, but the tool result reflects only what Harmony Hash computed.
 */
export interface ProgressionAnalysis {
  /** Chord symbols on the timeline, in order. */
  chords: string[];
  /** How many chords are on the timeline. */
  chordCount: number;
  /** The chord tones (note names) of each chord, parallel to `chords`. */
  chordTones: string[][];
  /** The voice-led piano voicing (note names with octave, low→high) of each chord, parallel to `chords`. */
  voicing: string[][];
}

/** Identifies one chord on the timeline, by position or by symbol. */
export interface ChordRef {
  index?: number;
  symbol?: string;
}

/** Outcome of a playback request, so the agent can relay a constraint to the user. */
export interface PlaybackResult {
  ok: boolean;
  /** When `ok` is false, a short reason the agent can speak (e.g. playback needs the piano view). */
  message?: string;
}

/**
 * Adapter the host app implements over its progression-builder state.
 * Methods may be sync or async; the tool layer awaits all of them.
 */
export interface ProgressionBridge {
  /** Current timeline contents. */
  getSnapshot(): ProgressionSnapshot | Promise<ProgressionSnapshot>;
  /** What the app computes for the current progression (chords, tones, voicing). */
  analyze(): ProgressionAnalysis | Promise<ProgressionAnalysis>;

  /** Append chords to the end of the timeline, in order. Throws on an unresolvable name. */
  addChords(symbols: string[]): void | Promise<void>;
  /** Remove one chord by index or symbol. */
  removeChord(ref: ChordRef): void | Promise<void>;
  /** Replace the whole timeline (empty array clears it). Throws on an unresolvable name. */
  replaceProgression(symbols: string[]): void | Promise<void>;
  /** Remove every chord from the timeline. */
  clear(): void | Promise<void>;
  /** Play the current progression. Piano-only — reports a constraint rather than switching view. */
  play(): PlaybackResult | Promise<PlaybackResult>;
  /** Reshuffle the guitar variants / piano voicings of the current chords (does NOT generate chords). */
  randomize(): void | Promise<void>;
  /** Visually highlight a chord while the agent talks about it; null clears it. */
  highlightChord(ref: ChordRef | null): void | Promise<void>;
}
