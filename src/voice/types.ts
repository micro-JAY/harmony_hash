/**
 * Harmony Hash — Voice Agent integration types.
 *
 * The voice module never touches the progression-builder store directly.
 * The host app implements `ProgressionBridge` (see exampleAdapter.ts) and
 * passes it to <VoiceAgentProvider/>. Every client tool the agent calls is
 * routed through this interface, so the voice feature stays decoupled from
 * whatever state library the builder happens to use.
 */

export type SuggestionMode = "diatonic" | "jazz";

/** A live read of the progression builder. */
export interface ProgressionSnapshot {
  /** Working key, e.g. "E major". null when the builder has not set/derived one. */
  key: string | null;
  /** Which suggestion engine the builder is currently showing. */
  mode: SuggestionMode;
  /** Ordered chord symbols on the timeline, e.g. ["C#m", "C#9", "F#m6"]. */
  chords: string[];
}

export interface CompatibleScale {
  /** e.g. "A natural_minor". */
  name: string;
  /** 0-100 fit score, as shown in the Progression Analyzer. */
  fit: number;
  /** e.g. ["diatonic"] or ["mode"]. */
  tags: string[];
}

/** The builder's own analysis of the current progression (the source of truth). */
export interface ProgressionAnalysis {
  detectedKey: string | null;
  /** Roman numeral per chord, parallel to ProgressionSnapshot.chords. */
  romanNumerals: string[];
  motion: string; // e.g. "smooth"
  tension: string; // e.g. "rises through"
  palette: string; // e.g. "diatonic only"
  style: string; // e.g. "modal"
  compatibleScales: CompatibleScale[];
}

/** Identifies one chord on the timeline, by position or by symbol. */
export interface ChordRef {
  index?: number;
  symbol?: string;
}

/**
 * Adapter the host app implements over its progression-builder store.
 * Methods may be sync or async; the tool layer awaits all of them.
 */
export interface ProgressionBridge {
  /** Current timeline contents. */
  getSnapshot(): ProgressionSnapshot | Promise<ProgressionSnapshot>;
  /** The builder's theory analysis — keys, numerals, scales. */
  analyze(): ProgressionAnalysis | Promise<ProgressionAnalysis>;
  /** Chord symbols the builder currently suggests as the next move. */
  getSuggestions(): string[] | Promise<string[]>;

  /** Append chords to the end of the timeline, in order. */
  addChords(symbols: string[]): void | Promise<void>;
  /** Remove one chord by index or symbol. */
  removeChord(ref: ChordRef): void | Promise<void>;
  /** Replace the whole timeline (empty array clears it). */
  replaceProgression(symbols: string[]): void | Promise<void>;
  /** Remove every chord from the timeline. */
  clear(): void | Promise<void>;
  /** Set the working key, e.g. "E major" / "C minor". */
  setKey(key: string): void | Promise<void>;
  /** Switch the suggestion engine. */
  setMode(mode: SuggestionMode): void | Promise<void>;
  /** Play the current progression. */
  play(): void | Promise<void>;
  /** Generate a fresh set of chords that work together (the "roll" dice). */
  randomize(): void | Promise<void>;
  /** Visually highlight a chord while the agent talks about it; null clears it. */
  highlightChord(ref: ChordRef | null): void | Promise<void>;
}
