/**
 * Canonical client-tool schemas for the Harmony Hash voice agent.
 *
 * Single source of truth for tool names and parameter shapes. Imported by:
 *   - scripts/provision-agent.ts        — registers the tools on the ElevenLabs agent
 *   - src/voice/useProgressionAgentTools.ts — registers the browser-side handlers
 *
 * Change a tool contract here and re-run provision-agent.ts so the platform
 * definition and the browser handlers never drift apart. This file has no
 * browser or React imports, so the Node provisioning script can import it too.
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
      "Read the chords, key and suggestion mode currently on the builder timeline. Call this before describing, analyzing or editing the current progression — never rely on memory.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "analyze_progression",
    description:
      "Get the builder's own theory analysis of the current progression: detected key, roman numerals, motion, tension, palette, style and compatible scales. Use this as the source of truth for any theory explanation.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "get_chord_suggestions",
    description:
      "Get the chord symbols the builder currently suggests as a strong next move. Use when the user asks what could come next.",
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
          items: { type: "string" },
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
      "Replace the entire timeline with a new ordered list of chords. Use when generating a fresh progression from scratch. An empty list clears the timeline.",
    parameters: {
      type: "object",
      properties: {
        chords: {
          type: "array",
          items: { type: "string" },
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
    name: "set_key",
    description:
      "Set the working key of the builder, e.g. 'E major' or 'C minor'. Do this before generating chords when the user names a key.",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string", description: "Key name, e.g. 'F major', 'C# minor'." },
      },
      required: ["key"],
    },
    expectsResponse: true,
  },
  {
    name: "set_suggestion_mode",
    description:
      "Switch the builder's suggestion engine between 'diatonic' (in-key) and 'jazz' (extended and borrowed) suggestions.",
    parameters: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["diatonic", "jazz"],
          description: "Suggestion engine to use.",
        },
      },
      required: ["mode"],
    },
    expectsResponse: true,
  },
  {
    name: "play_progression",
    description: "Play the current progression so the user can hear it.",
    parameters: { type: "object", properties: {} },
    expectsResponse: true,
  },
  {
    name: "randomize_progression",
    description:
      "Generate a fresh set of four chords that sound good together (the builder's 'roll' dice). Use when the user wants a surprise or says they are stuck.",
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
