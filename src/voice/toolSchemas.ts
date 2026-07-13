/**
 * Canonical client-tool schemas for the Harmony Hash voice agent.
 *
 * Single source of truth for tool names and parameter shapes. Imported by:
 *   - scripts/provision-voice-agent.ts        — registers the tools on the ElevenLabs agent
 *   - src/voice/useProgressionAgentTools.ts    — registers the browser-side handlers
 *
 * Change a tool contract here and re-run provision-voice-agent.ts so the
 * platform definition and the browser handlers never drift apart. This file has
 * no browser or React imports, so the Node provisioning script can import it too.
 *
 * Scope note: this is the SHIPPED 9-tool surface. The package shipped 12; the
 * three dropped tools (`get_chord_suggestions`, `set_key`, `set_suggestion_mode`)
 * have no backing in the voice bridge. Free Input's local key/mode and fit
 * scorer are deliberately not timeline authority and are not provider tools.
 */

export interface ClientToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  /** Whether the tool returns data the agent should use in its reply. */
  expectsResponse: boolean;
}

const chordRefProps = {
  index: {
    type: "number",
    description: "Zero-based position of the chord on the timeline.",
  },
  symbol: {
    type: "string",
    description: "Chord symbol, e.g. 'Cmaj7'. Used when index is omitted.",
  },
};

export const TOOL_SCHEMAS: ClientToolSchema[] = [
  {
    name: "get_progression",
    description:
      "Read the chord symbols currently on the builder timeline. Call this before describing, analyzing or editing the current progression — never rely on memory.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "analyze_progression",
    description:
      "Get what the voice bridge computes for the current progression: the chord symbols, each chord's tones (the note names in the chord), and the smooth piano voicing the app renders. Use this for accurate, app-grounded facts about the notes. You may add general music-theory explanation yourself, but never claim this tool detected a key, roman numerals or scales — it does not receive the Free Input harmony context.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "add_chords",
    description:
      "Append one or more chords to the end of the timeline, in order. Use for extending a progression or adding a single chord.",
    parameters: {
      type: "object",
      properties: {
        chords: {
          type: "array",
          items: { type: "string", description: "A chord symbol, e.g. 'Am7'." },
          description: "Chord symbols to append, in order, e.g. ['Am','F','C','G'].",
        },
      },
      required: ["chords"],
    },
    expectsResponse: true,
  },
  {
    name: "replace_progression",
    description:
      "Replace the entire timeline with a new ordered list of chords. Use when generating a fresh progression from scratch — you choose the chord names. An empty list clears the timeline.",
    parameters: {
      type: "object",
      properties: {
        chords: {
          type: "array",
          items: { type: "string", description: "A chord symbol, e.g. 'Cmaj7'." },
          description: "The full new progression, in order.",
        },
      },
      required: ["chords"],
    },
    expectsResponse: true,
  },
  {
    name: "remove_chord",
    description:
      "Remove a single chord from the timeline by its index, or by its symbol if the index is unknown.",
    parameters: { type: "object", properties: { ...chordRefProps } },
    expectsResponse: true,
  },
  {
    name: "clear_progression",
    description: "Remove every chord from the timeline so the user can start over.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "play_progression",
    description:
      "Play the current progression so the user can hear it. Read the returned status exactly: started means playback began, already_playing means a start is already underway or playback was left running without a restart, requires_piano means the user must switch from guitar to piano, empty means the timeline has no chords, cancelled means a user or timeline change stopped the pending start, and unavailable means this browser cannot start audio.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "randomize_progression",
    description:
      "Reshuffle the guitar variants or piano voicings of the chords already on the timeline. This does NOT generate new chords — it re-rolls how the existing chords are voiced or fingered. To create new chords, choose them yourself and call replace_progression or add_chords.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "highlight_chord",
    description:
      "Visually highlight one chord on the timeline while you talk about it. Call with clear=true to remove the highlight.",
    parameters: {
      type: "object",
      properties: {
        ...chordRefProps,
        clear: { type: "boolean", description: "If true, remove any existing highlight." },
      },
    },
    expectsResponse: false,
  },
];

/** Tool names, handy for assertions/tests against the registered handlers. */
export const TOOL_NAMES: string[] = TOOL_SCHEMAS.map((t) => t.name);
