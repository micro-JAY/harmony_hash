import { describe, expect, it, vi } from "vitest";
import type {
  ProgressionAnalysis,
  ProgressionBridge,
  ProgressionSnapshot,
} from "./types";
import {
  MAX_VOICE_CHORD_SYMBOL_LENGTH,
  MAX_VOICE_PROGRESSION_CHORDS,
  TOOL_NAMES,
} from "./toolSchemas";
import {
  createProgressionAgentToolDispatcher,
  createProgressionAgentToolMap,
  PROGRESSION_AGENT_TOOL_NAMES,
  type ProgressionAgentToolCall,
} from "./progressionAgentTools";

const SNAPSHOT: ProgressionSnapshot = { chords: ["Cmaj7", "Am7"] };
const ANALYSIS: ProgressionAnalysis = {
  chords: ["Cmaj7", "Am7"],
  chordCount: 2,
  chordTones: [["C", "E", "G", "B"], ["A", "C", "E", "G"]],
  voicing: [["C3", "E3", "G3", "B3"], ["A2", "E3", "G3", "C4"]],
};

function bridgeFixture(overrides: Partial<ProgressionBridge> = {}) {
  const bridge: ProgressionBridge = {
    getSnapshot: vi.fn(() => SNAPSHOT),
    analyze: vi.fn(() => ANALYSIS),
    addChords: vi.fn(),
    removeChord: vi.fn(),
    replaceProgression: vi.fn(),
    clear: vi.fn(),
    play: vi.fn(() => ({
      ok: true as const,
      status: "started" as const,
      message: "Progression playback started.",
    })),
    randomize: vi.fn(),
    highlightChord: vi.fn(),
    ...overrides,
  };
  return bridge;
}

function toolCall(
  callId: string,
  name: string,
  parameters: unknown,
): ProgressionAgentToolCall {
  return {
    call_id: callId,
    name,
    arguments:
      typeof parameters === "string" ? parameters : JSON.stringify(parameters),
  };
}

async function outputOf(
  dispatcher: ReturnType<typeof createProgressionAgentToolDispatcher>,
  call: ProgressionAgentToolCall,
): Promise<unknown> {
  return JSON.parse(await dispatcher.dispatch(call).outputPromise);
}

describe("progression agent tool map", () => {
  it("exposes exactly the canonical nine tool names", () => {
    const tools = createProgressionAgentToolMap(bridgeFixture());

    expect([...tools.keys()]).toEqual(PROGRESSION_AGENT_TOOL_NAMES);
    expect([...tools.keys()]).toEqual(TOOL_NAMES);
    expect(tools.size).toBe(9);
  });

  it("preserves every existing success output shape", async () => {
    const bridge = bridgeFixture();
    const tools = createProgressionAgentToolMap(bridge);

    await expect(tools.get("get_progression")?.({})).resolves.toBe(
      JSON.stringify(SNAPSHOT),
    );
    await expect(tools.get("analyze_progression")?.({})).resolves.toBe(
      JSON.stringify(ANALYSIS),
    );
    await expect(tools.get("add_chords")?.({ chords: ["Fmaj7"] })).resolves.toBe(
      JSON.stringify({ ok: true, progression: SNAPSHOT }),
    );
    await expect(
      tools.get("replace_progression")?.({ chords: ["Dm7", "G7"] }),
    ).resolves.toBe(JSON.stringify({ ok: true, progression: SNAPSHOT }));
    await expect(tools.get("remove_chord")?.({ index: 0 })).resolves.toBe(
      JSON.stringify({ ok: true, progression: SNAPSHOT }),
    );
    await expect(tools.get("clear_progression")?.({})).resolves.toBe(
      JSON.stringify({ ok: true, progression: SNAPSHOT }),
    );
    await expect(tools.get("play_progression")?.({})).resolves.toBe(
      JSON.stringify({
        ok: true,
        status: "started",
        message: "Progression playback started.",
      }),
    );
    await expect(tools.get("randomize_progression")?.({})).resolves.toBe(
      JSON.stringify({ ok: true, progression: SNAPSHOT }),
    );
    await expect(tools.get("highlight_chord")?.({ symbol: "Cmaj7" })).resolves.toBe(
      JSON.stringify({ ok: true }),
    );

    expect(bridge.addChords).toHaveBeenCalledWith(["Fmaj7"]);
    expect(bridge.replaceProgression).toHaveBeenCalledWith(["Dm7", "G7"]);
    expect(bridge.removeChord).toHaveBeenCalledWith({ index: 0 });
    expect(bridge.highlightChord).toHaveBeenCalledWith({ symbol: "Cmaj7" });
  });
});

describe("progression agent argument validation", () => {
  it("rejects unknown, malformed, missing, and extra fields without bridge calls", async () => {
    const bridge = bridgeFixture();
    const dispatcher = createProgressionAgentToolDispatcher(bridge);
    const invalidCalls = [
      toolCall("unknown", "not_a_tool", {}),
      toolCall("json", "add_chords", "{not-json"),
      toolCall("missing", "add_chords", {}),
      toolCall("extra-empty", "get_progression", { extra: true }),
      toolCall("extra-array", "replace_progression", { chords: [], extra: true }),
      toolCall("extra-ref", "remove_chord", { index: 0, extra: true }),
      toolCall("extra-highlight", "highlight_chord", { clear: true, extra: true }),
    ];

    for (const call of invalidCalls) {
      const output = await outputOf(dispatcher, call);
      expect(output).toMatchObject({ ok: false });
      expect(output).toHaveProperty("error");
    }

    for (const method of Object.values(bridge)) {
      expect(method).not.toHaveBeenCalled();
    }
  });

  it("enforces chord-array, symbol, and index bounds before mutation", async () => {
    const bridge = bridgeFixture();
    const dispatcher = createProgressionAgentToolDispatcher(bridge);
    const invalidCalls = [
      toolCall("array-type", "add_chords", { chords: "Cmaj7" }),
      toolCall("array-count", "replace_progression", {
        chords: Array.from(
          { length: MAX_VOICE_PROGRESSION_CHORDS + 1 },
          () => "C",
        ),
      }),
      toolCall("array-symbol", "add_chords", {
        chords: ["C".repeat(MAX_VOICE_CHORD_SYMBOL_LENGTH + 1)],
      }),
      toolCall("ref-symbol", "remove_chord", {
        symbol: "C".repeat(MAX_VOICE_CHORD_SYMBOL_LENGTH + 1),
      }),
      toolCall("ref-empty", "remove_chord", { symbol: "  " }),
      toolCall("ref-fraction", "remove_chord", { index: 1.5 }),
      toolCall("ref-negative", "highlight_chord", { index: -1 }),
      toolCall("ref-high", "highlight_chord", {
        index: MAX_VOICE_PROGRESSION_CHORDS,
      }),
      toolCall("clear-type", "highlight_chord", { clear: "yes" }),
      toolCall("clear-false", "highlight_chord", { clear: false }),
    ];

    for (const call of invalidCalls) {
      await expect(outputOf(dispatcher, call)).resolves.toMatchObject({
        ok: false,
      });
    }

    expect(bridge.addChords).not.toHaveBeenCalled();
    expect(bridge.replaceProgression).not.toHaveBeenCalled();
    expect(bridge.removeChord).not.toHaveBeenCalled();
    expect(bridge.highlightChord).not.toHaveBeenCalled();
  });

  it("serializes bridge failures as explicit errors", async () => {
    const bridge = bridgeFixture({
      addChords: vi.fn(() => {
        throw new Error("Chord is unavailable");
      }),
    });
    const dispatcher = createProgressionAgentToolDispatcher(bridge);

    await expect(
      outputOf(dispatcher, toolCall("bridge-error", "add_chords", { chords: ["H7"] })),
    ).resolves.toEqual({ ok: false, error: "Chord is unavailable" });
    expect(bridge.getSnapshot).not.toHaveBeenCalled();
  });
});

describe("progression agent call ledger", () => {
  it("shares one in-flight execution and one output claim across canonical duplicates", async () => {
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const addChords = vi.fn(async () => blocked);
    const dispatcher = createProgressionAgentToolDispatcher(
      bridgeFixture({ addChords }),
    );
    const first = dispatcher.dispatch({
      call_id: "call-1",
      name: "add_chords",
      arguments: "{\"chords\":[\"Cmaj7\"]}",
    });
    const duplicate = dispatcher.dispatch({
      call_id: "call-1",
      name: "add_chords",
      arguments: "{ \"chords\" : [\"Cmaj7\"] }",
    });

    expect(first.status).toBe("accepted");
    expect(duplicate.status).toBe("duplicate");
    expect(duplicate.outputPromise).toBe(first.outputPromise);
    expect(dispatcher.ledger.get("call-1")?.outputPromise).toBe(first.outputPromise);
    await vi.waitFor(() => expect(addChords).toHaveBeenCalledOnce());

    release?.();
    await expect(first.outputPromise).resolves.toBe(
      JSON.stringify({ ok: true, progression: SNAPSHOT }),
    );
    expect(first.claimOutput()).toBe(true);
    expect(duplicate.outputSent).toBe(true);
    expect(duplicate.claimOutput()).toBe(false);
    expect(dispatcher.ledger.get("call-1")?.outputSent).toBe(true);
    expect(addChords).toHaveBeenCalledOnce();
  });

  it("reuses the completed promise without replaying the tool", async () => {
    const play = vi.fn(() => ({
      ok: true as const,
      status: "started" as const,
      message: "Progression playback started.",
    }));
    const dispatcher = createProgressionAgentToolDispatcher(
      bridgeFixture({ play }),
    );
    const call = toolCall("call-2", "play_progression", {});
    const first = dispatcher.dispatch(call);

    await first.outputPromise;
    const completedDuplicate = dispatcher.dispatch(call);

    expect(completedDuplicate.status).toBe("duplicate");
    expect(completedDuplicate.outputPromise).toBe(first.outputPromise);
    expect(play).toHaveBeenCalledOnce();
    expect(completedDuplicate.claimOutput()).toBe(true);
    expect(first.claimOutput()).toBe(false);
  });

  it("fails closed when a call id is reused with different input", async () => {
    const addChords = vi.fn();
    const dispatcher = createProgressionAgentToolDispatcher(
      bridgeFixture({ addChords }),
    );
    const original = dispatcher.dispatch(
      toolCall("call-3", "add_chords", { chords: ["C"] }),
    );
    const conflict = dispatcher.dispatch(
      toolCall("call-3", "add_chords", { chords: ["G"] }),
    );

    expect(conflict.status).toBe("conflict");
    await expect(conflict.outputPromise.then(JSON.parse)).resolves.toEqual({
      ok: false,
      error: "Tool call_id 'call-3' was reused with different input",
    });
    expect(conflict.claimOutput()).toBe(false);
    await original.outputPromise;
    expect(addChords).toHaveBeenCalledOnce();
    expect(addChords).toHaveBeenCalledWith(["C"]);
  });

  it("does not ledger or permit output for a missing call id", async () => {
    const dispatcher = createProgressionAgentToolDispatcher(bridgeFixture());
    const invalid = dispatcher.dispatch(toolCall("   ", "get_progression", {}));

    expect(invalid.status).toBe("invalid");
    await expect(invalid.outputPromise.then(JSON.parse)).resolves.toEqual({
      ok: false,
      error: "Tool call_id is missing",
    });
    expect(invalid.claimOutput()).toBe(false);
    expect(dispatcher.ledger.size).toBe(0);
  });
});
