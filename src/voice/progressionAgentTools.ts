import type { ChordRef, ProgressionBridge } from "./types";
import {
  MAX_VOICE_CHORD_SYMBOL_LENGTH,
  MAX_VOICE_PROGRESSION_CHORDS,
} from "./toolSchemas";
import { requireChordSymbols } from "./toolValidation";

export const PROGRESSION_AGENT_TOOL_NAMES = [
  "get_progression",
  "analyze_progression",
  "add_chords",
  "replace_progression",
  "remove_chord",
  "clear_progression",
  "play_progression",
  "randomize_progression",
  "highlight_chord",
] as const;

export type ProgressionAgentToolName =
  (typeof PROGRESSION_AGENT_TOOL_NAMES)[number];

export type ProgressionAgentToolHandler = (
  parameters: unknown,
) => Promise<string>;

export interface ProgressionAgentToolCall {
  call_id: string;
  name: string;
  arguments: string;
}

export interface ProgressionAgentToolLedgerEntry {
  readonly fingerprint: string;
  readonly outputPromise: Promise<string>;
  readonly outputSent: boolean;
}

interface MutableLedgerEntry {
  fingerprint: string;
  outputPromise: Promise<string>;
  outputSent: boolean;
}

export type ProgressionAgentDispatchStatus =
  | "accepted"
  | "duplicate"
  | "conflict"
  | "invalid";

export interface ProgressionAgentDispatchTicket {
  readonly callId: string;
  readonly fingerprint: string;
  readonly status: ProgressionAgentDispatchStatus;
  readonly outputPromise: Promise<string>;
  readonly outputSent: boolean;
  /** Atomically reserves this call id's single function-call output. */
  claimOutput(): boolean;
}

export interface ProgressionAgentToolDispatcher {
  readonly tools: ReadonlyMap<
    ProgressionAgentToolName,
    ProgressionAgentToolHandler
  >;
  readonly ledger: ReadonlyMap<string, ProgressionAgentToolLedgerEntry>;
  dispatch(call: ProgressionAgentToolCall): ProgressionAgentDispatchTicket;
}

type DecodedArguments =
  | { ok: true; value: unknown; canonical: string }
  | { ok: false; error: string; canonical: string };

const NO_FIELDS = new Set<string>();
const CHORDS_FIELDS = new Set(["chords"]);
const CHORD_REF_FIELDS = new Set(["index", "symbol"]);
const HIGHLIGHT_FIELDS = new Set(["index", "symbol", "clear"]);

function reply(data: unknown): string {
  const serialized = JSON.stringify(data);
  if (serialized === undefined) {
    throw new Error("Tool result could not be serialized");
  }
  return serialized;
}

function failure(error: unknown): string {
  const message =
    error instanceof Error && error.message.trim()
      ? error.message
      : "Tool call failed";
  return reply({ ok: false, error: message });
}

function requireParameterObject(
  value: unknown,
  toolName: ProgressionAgentToolName,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Tool '${toolName}' arguments must be a JSON object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error(`Tool '${toolName}' arguments must be a plain object`);
  }
  return value as Record<string, unknown>;
}

function requireFields(
  value: unknown,
  toolName: ProgressionAgentToolName,
  allowed: ReadonlySet<string>,
  required: readonly string[] = [],
): Record<string, unknown> {
  const parameters = requireParameterObject(value, toolName);
  const unexpected = Object.keys(parameters).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    throw new Error(`Tool '${toolName}' does not allow field '${unexpected}'`);
  }
  const missing = required.find(
    (field) => !Object.prototype.hasOwnProperty.call(parameters, field),
  );
  if (missing !== undefined) {
    throw new Error(`Tool '${toolName}' requires field '${missing}'`);
  }
  return parameters;
}

function requireNoFields(
  value: unknown,
  toolName: ProgressionAgentToolName,
): void {
  requireFields(value, toolName, NO_FIELDS);
}

function readChords(
  value: unknown,
  toolName: "add_chords" | "replace_progression",
): string[] {
  const { chords } = requireFields(value, toolName, CHORDS_FIELDS, ["chords"]);
  return requireChordSymbols(chords, "chords");
}

function readOptionalChordRef(
  parameters: Record<string, unknown>,
): ChordRef | undefined {
  const { index, symbol } = parameters;
  const ref: ChordRef = {};

  if (index !== undefined) {
    if (
      typeof index !== "number"
      || !Number.isInteger(index)
      || index < 0
      || index >= MAX_VOICE_PROGRESSION_CHORDS
    ) {
      throw new Error(
        `'index' must be an integer from 0 to ${MAX_VOICE_PROGRESSION_CHORDS - 1}`,
      );
    }
    ref.index = index;
  }

  if (symbol !== undefined) {
    if (typeof symbol !== "string" || symbol.trim().length === 0) {
      throw new Error("'symbol' must be a non-empty chord symbol");
    }
    if (symbol.length > MAX_VOICE_CHORD_SYMBOL_LENGTH) {
      throw new Error(
        `'symbol' must be at most ${MAX_VOICE_CHORD_SYMBOL_LENGTH} characters`,
      );
    }
    ref.symbol = symbol;
  }

  return ref.index === undefined && ref.symbol === undefined ? undefined : ref;
}

function readRequiredChordRef(
  value: unknown,
  toolName: "remove_chord",
): ChordRef {
  const ref = readOptionalChordRef(
    requireFields(value, toolName, CHORD_REF_FIELDS),
  );
  if (!ref) {
    throw new Error("Provide an 'index' or a 'symbol' to identify the chord");
  }
  return ref;
}

function readHighlightTarget(value: unknown): ChordRef | null {
  const parameters = requireFields(value, "highlight_chord", HIGHLIGHT_FIELDS);
  const { clear } = parameters;
  if (clear !== undefined && typeof clear !== "boolean") {
    throw new Error("'clear' must be a boolean");
  }
  const ref = readOptionalChordRef(parameters);
  if (clear === true) return null;
  if (!ref) {
    throw new Error(
      "Provide an 'index' or a 'symbol', or set 'clear' to true",
    );
  }
  return ref;
}

/** Build the exact, provider-neutral nine-tool surface backed by the live bridge. */
export function createProgressionAgentToolMap(
  bridge: ProgressionBridge,
): ReadonlyMap<ProgressionAgentToolName, ProgressionAgentToolHandler> {
  const snapshot = () => bridge.getSnapshot();

  return new Map<ProgressionAgentToolName, ProgressionAgentToolHandler>([
    [
      "get_progression",
      async (parameters) => {
        requireNoFields(parameters, "get_progression");
        return reply(await snapshot());
      },
    ],
    [
      "analyze_progression",
      async (parameters) => {
        requireNoFields(parameters, "analyze_progression");
        return reply(await bridge.analyze());
      },
    ],
    [
      "add_chords",
      async (parameters) => {
        const chords = readChords(parameters, "add_chords");
        await bridge.addChords(chords);
        return reply({ ok: true, progression: await snapshot() });
      },
    ],
    [
      "replace_progression",
      async (parameters) => {
        const chords = readChords(parameters, "replace_progression");
        await bridge.replaceProgression(chords);
        return reply({ ok: true, progression: await snapshot() });
      },
    ],
    [
      "remove_chord",
      async (parameters) => {
        const ref = readRequiredChordRef(parameters, "remove_chord");
        await bridge.removeChord(ref);
        return reply({ ok: true, progression: await snapshot() });
      },
    ],
    [
      "clear_progression",
      async (parameters) => {
        requireNoFields(parameters, "clear_progression");
        await bridge.clear();
        return reply({ ok: true, progression: await snapshot() });
      },
    ],
    [
      "play_progression",
      async (parameters) => {
        requireNoFields(parameters, "play_progression");
        return reply(await bridge.play());
      },
    ],
    [
      "randomize_progression",
      async (parameters) => {
        requireNoFields(parameters, "randomize_progression");
        await bridge.randomize();
        return reply({ ok: true, progression: await snapshot() });
      },
    ],
    [
      "highlight_chord",
      async (parameters) => {
        await bridge.highlightChord(readHighlightTarget(parameters));
        return reply({ ok: true });
      },
    ],
  ]);
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right),
  );
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

function decodeArguments(raw: unknown): DecodedArguments {
  if (typeof raw !== "string") {
    return {
      ok: false,
      error: "Tool arguments must be a JSON string",
      canonical: `invalid:${JSON.stringify(raw)}`,
    };
  }
  try {
    const value: unknown = JSON.parse(raw);
    return { ok: true, value, canonical: canonicalJson(value) };
  } catch {
    return {
      ok: false,
      error: "Tool arguments are not valid JSON",
      canonical: `invalid:${JSON.stringify(raw)}`,
    };
  }
}

function fingerprint(name: unknown, canonicalArguments: string): string {
  return JSON.stringify([
    typeof name === "string" ? name : `invalid:${typeof name}`,
    canonicalArguments,
  ]);
}

function isToolName(value: unknown): value is ProgressionAgentToolName {
  return (
    typeof value === "string"
    && PROGRESSION_AGENT_TOOL_NAMES.some((name) => name === value)
  );
}

function createTicket({
  callId,
  callFingerprint,
  status,
  outputPromise,
  ledgerEntry,
  sendable,
}: {
  callId: string;
  callFingerprint: string;
  status: ProgressionAgentDispatchStatus;
  outputPromise: Promise<string>;
  ledgerEntry?: MutableLedgerEntry;
  sendable: boolean;
}): ProgressionAgentDispatchTicket {
  return {
    callId,
    fingerprint: callFingerprint,
    status,
    outputPromise,
    get outputSent() {
      return ledgerEntry?.outputSent ?? false;
    },
    claimOutput() {
      if (!sendable || !ledgerEntry || ledgerEntry.outputSent) return false;
      ledgerEntry.outputSent = true;
      return true;
    },
  };
}

/**
 * Deduplicate OpenAI Realtime function calls for one session.
 *
 * The caller awaits `outputPromise`, then calls `claimOutput()` immediately
 * before emitting `function_call_output`. Identical retries share both fields;
 * only one can claim the output. Reusing a call id for different input returns
 * an explicit failure that cannot displace the original call's output.
 */
export function createProgressionAgentToolDispatcher(
  bridge: ProgressionBridge,
): ProgressionAgentToolDispatcher {
  const tools = createProgressionAgentToolMap(bridge);
  const ledger = new Map<string, MutableLedgerEntry>();

  const dispatch = (
    call: ProgressionAgentToolCall,
  ): ProgressionAgentDispatchTicket => {
    const decoded = decodeArguments(call.arguments);
    const callFingerprint = fingerprint(call.name, decoded.canonical);
    const callId = typeof call.call_id === "string" ? call.call_id : "";

    if (!callId.trim()) {
      return createTicket({
        callId,
        callFingerprint,
        status: "invalid",
        outputPromise: Promise.resolve(failure(new Error("Tool call_id is missing"))),
        sendable: false,
      });
    }

    const existing = ledger.get(callId);
    if (existing) {
      if (existing.fingerprint !== callFingerprint) {
        return createTicket({
          callId,
          callFingerprint,
          status: "conflict",
          outputPromise: Promise.resolve(
            failure(new Error(`Tool call_id '${callId}' was reused with different input`)),
          ),
          ledgerEntry: existing,
          sendable: false,
        });
      }
      return createTicket({
        callId,
        callFingerprint,
        status: "duplicate",
        outputPromise: existing.outputPromise,
        ledgerEntry: existing,
        sendable: true,
      });
    }

    const outputPromise = Promise.resolve().then(async () => {
      if (!decoded.ok) return failure(new Error(decoded.error));
      if (!isToolName(call.name)) {
        return failure(new Error(`Unknown progression tool '${String(call.name)}'`));
      }
      const handler = tools.get(call.name);
      if (!handler) {
        return failure(new Error(`Unknown progression tool '${call.name}'`));
      }
      try {
        return await handler(decoded.value);
      } catch (error) {
        return failure(error);
      }
    });
    const entry: MutableLedgerEntry = {
      fingerprint: callFingerprint,
      outputPromise,
      outputSent: false,
    };
    ledger.set(callId, entry);

    return createTicket({
      callId,
      callFingerprint,
      status: "accepted",
      outputPromise,
      ledgerEntry: entry,
      sendable: true,
    });
  };

  return { tools, ledger, dispatch };
}
