import { useConversationClientTool } from "@elevenlabs/react";
import type { ChordRef, ProgressionBridge } from "./types";

/* --- input guards: client-tool params arrive untyped from the agent --- */

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new Error("Tool parameters are missing or malformed");
  }
  return value as Record<string, unknown>;
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`'${field}' must be an array of chord symbols`);
  }
  return value as string[];
}

function readChordRef(params: Record<string, unknown>): ChordRef {
  const ref: ChordRef = {};
  if (typeof params.index === "number") ref.index = params.index;
  if (typeof params.symbol === "string") ref.symbol = params.symbol;
  if (ref.index === undefined && ref.symbol === undefined) {
    throw new Error("Provide an 'index' or a 'symbol' to identify the chord");
  }
  return ref;
}

/**
 * Serialize a tool result for the agent. ElevenLabs client tools must resolve
 * to a string/number/void (ClientToolResult); the agent receives this string
 * verbatim as the tool's output, so structured data is sent as JSON.
 */
function reply(data: unknown): string {
  return JSON.stringify(data);
}

/**
 * Registers every progression-builder client tool with the active ElevenLabs
 * conversation. Must be called from a component inside <VoiceAgentProvider/>.
 * Handlers are torn down automatically when the component unmounts.
 *
 * Mutating tools return the fresh snapshot, so the agent stays in sync without
 * a follow-up get_progression call. The tool names below must match
 * toolSchemas.ts exactly — they are the contract registered on the agent.
 */
export function useProgressionAgentTools(bridge: ProgressionBridge): void {
  const snapshot = () => bridge.getSnapshot();

  useConversationClientTool("get_progression", async () => {
    return reply(await snapshot());
  });

  useConversationClientTool("analyze_progression", async () => {
    return reply(await bridge.analyze());
  });

  useConversationClientTool("add_chords", async (params: unknown) => {
    const p = asRecord(params);
    await bridge.addChords(requireStringArray(p.chords, "chords"));
    return reply({ ok: true, progression: await snapshot() });
  });

  useConversationClientTool("replace_progression", async (params: unknown) => {
    const p = asRecord(params);
    await bridge.replaceProgression(requireStringArray(p.chords, "chords"));
    return reply({ ok: true, progression: await snapshot() });
  });

  useConversationClientTool("remove_chord", async (params: unknown) => {
    await bridge.removeChord(readChordRef(asRecord(params)));
    return reply({ ok: true, progression: await snapshot() });
  });

  useConversationClientTool("clear_progression", async () => {
    await bridge.clear();
    return reply({ ok: true, progression: await snapshot() });
  });

  useConversationClientTool("play_progression", async () => {
    // bridge.play() reports a constraint (e.g. needs piano view) rather than
    // throwing or silently switching — surface it so the agent can relay it.
    return reply(await bridge.play());
  });

  useConversationClientTool("randomize_progression", async () => {
    await bridge.randomize();
    return reply({ ok: true, progression: await snapshot() });
  });

  useConversationClientTool("highlight_chord", async (params: unknown) => {
    const p = asRecord(params);
    if (p.clear === true) {
      await bridge.highlightChord(null);
      return reply({ ok: true });
    }
    await bridge.highlightChord(readChordRef(p));
    return reply({ ok: true });
  });
}
