import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  RealtimeConnectionStatus,
  RealtimeServerEvent,
  RealtimeSessionCallbacks,
} from "./openAIRealtimeSession";
import type { ProgressionBridge } from "./types";

interface MockRealtimeSession {
  callbacks: RealtimeSessionCallbacks;
  connectionStatus: RealtimeConnectionStatus;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  checkDeadline: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

const realtimeMock = vi.hoisted(() => ({
  instances: [] as MockRealtimeSession[],
}));

vi.mock("./openAIRealtimeSession", () => ({
  OpenAIRealtimeSession: class implements MockRealtimeSession {
    callbacks: RealtimeSessionCallbacks;
    connectionStatus: RealtimeConnectionStatus = "disconnected";
    start = vi.fn(async () => undefined);
    stop = vi.fn(async () => undefined);
    dispose = vi.fn(async () => undefined);
    setVolume = vi.fn();
    checkDeadline = vi.fn();
    send = vi.fn<(event: Record<string, unknown>) => boolean>(() => true);

    constructor(callbacks: RealtimeSessionCallbacks) {
      this.callbacks = callbacks;
      realtimeMock.instances.push(this);
    }
  },
}));

import { VoiceAgentProvider } from "./VoiceAgentProvider";
import {
  VoiceAgentEventCoordinator,
  useVoiceAgent,
  type TranscriptEntry,
} from "./voiceAgentContext";

function bridgeFixture(overrides: Partial<ProgressionBridge> = {}) {
  const highlightChord = vi.fn<ProgressionBridge["highlightChord"]>();
  const addChords = vi.fn<ProgressionBridge["addChords"]>();
  const replaceProgression = vi.fn<ProgressionBridge["replaceProgression"]>();
  const bridge: ProgressionBridge = {
    getSnapshot: () => ({ chords: [] }),
    analyze: () => ({ chords: [], chordCount: 0, chordTones: [], voicing: [] }),
    addChords,
    removeChord: vi.fn(),
    replaceProgression,
    clear: vi.fn(),
    play: () => ({
      ok: false,
      status: "empty",
      message: "There are no chords on the timeline to play yet.",
    }),
    randomize: vi.fn(),
    highlightChord,
    ...overrides,
  };
  return { bridge, highlightChord, addChords, replaceProgression };
}

function coordinatorFixture(overrides: Partial<ProgressionBridge> = {}) {
  const bridgeState = bridgeFixture(overrides);
  const state = {
    transcript: [] as TranscriptEntry[],
    sessionKind: null as "voice" | "text" | null,
    audioPacketCount: 0,
    agentReplyCount: 0,
    agentReplyAudioBaseline: 0,
    fatalError: null as string | null,
  };
  const sink = {
    setTranscript: vi.fn((entries: TranscriptEntry[]) => {
      state.transcript = entries;
    }),
    setSessionKind: vi.fn((kind: "voice" | "text" | null) => {
      state.sessionKind = kind;
    }),
    setAudioPacketCount: vi.fn((count: number) => {
      state.audioPacketCount = count;
    }),
    setAgentReplyCount: vi.fn((count: number) => {
      state.agentReplyCount = count;
    }),
    setAgentReplyAudioBaseline: vi.fn((count: number) => {
      state.agentReplyAudioBaseline = count;
    }),
    setFatalError: vi.fn((message: string) => {
      state.fatalError = message;
    }),
  };
  const transport = {
    send: vi.fn<(event: Record<string, unknown>) => boolean>(() => true),
    stop: vi.fn(async () => undefined),
  };
  const coordinator = new VoiceAgentEventCoordinator(bridgeState.bridge, sink);
  coordinator.attachTransport(transport);
  coordinator.beginSession(bridgeState.bridge);
  return { ...bridgeState, coordinator, sink, state, transport };
}

function realtimeEvent(event: RealtimeServerEvent): RealtimeServerEvent {
  return event;
}

describe("VoiceAgentEventCoordinator", () => {
  afterEach(() => vi.restoreAllMocks());

  it("orders completed transcripts by item identity and records one audio baseline per reply", async () => {
    const { coordinator, state, sink } = coordinatorFixture();

    coordinator.handlePacketCount(4);
    await coordinator.handleEvent(realtimeEvent({
      type: "conversation.item.input_audio_transcription.completed",
      event_id: "evt-user-done",
      item_id: "item-user",
      transcript: "Try C major.",
    }));
    coordinator.handlePacketCount(7);
    await coordinator.handleEvent(realtimeEvent({
      type: "response.created",
      event_id: "evt-response",
      response: { id: "response-1" },
    }));
    await coordinator.handleEvent(realtimeEvent({
      type: "response.output_audio_transcript.done",
      event_id: "evt-agent-done",
      response_id: "response-1",
      item_id: "item-agent",
      transcript: "Here is a simple progression.",
    }));

    expect(state.transcript).toEqual([]);

    await coordinator.handleEvent(realtimeEvent({
      type: "conversation.item.added",
      event_id: "evt-user-order",
      previous_item_id: null,
      item: { id: "item-user", role: "user" },
    }));
    await coordinator.handleEvent(realtimeEvent({
      type: "conversation.item.added",
      event_id: "evt-agent-order",
      previous_item_id: "item-user",
      item: { id: "item-agent", role: "assistant" },
    }));

    expect(state.transcript).toEqual([
      { id: 0, role: "user", text: "Try C major." },
      { id: 1, role: "agent", text: "Here is a simple progression." },
    ]);
    expect(state.agentReplyCount).toBe(1);
    expect(state.agentReplyAudioBaseline).toBe(7);

    await coordinator.handleEvent(realtimeEvent({
      type: "response.output_audio_transcript.done",
      event_id: "evt-agent-done-retry",
      response_id: "response-1",
      item_id: "item-agent",
      transcript: "Here is a simple progression.",
    }));
    expect(state.agentReplyCount).toBe(1);
    expect(sink.setAgentReplyCount).toHaveBeenCalledTimes(2);
  });

  it("clears the in-memory transcript when a Realtime session disconnects", async () => {
    const { coordinator, state } = coordinatorFixture();

    await coordinator.handleEvent(realtimeEvent({
      type: "conversation.item.input_audio_transcription.completed",
      event_id: "evt-private-user-done",
      item_id: "item-private-user",
      transcript: "Do not retain this after disconnect.",
    }));
    await coordinator.handleEvent(realtimeEvent({
      type: "conversation.item.added",
      event_id: "evt-private-user-order",
      previous_item_id: null,
      item: { id: "item-private-user", role: "user" },
    }));
    coordinator.handleConnected();

    expect(state.transcript).toHaveLength(1);
    expect(state.sessionKind).toBe("voice");

    coordinator.handleDisconnected();

    expect(state.transcript).toEqual([]);
    expect(state.sessionKind).toBeNull();
  });

  it("executes a retried tool call once, emits one output, and continues once", async () => {
    let releaseMutation: (() => void) | undefined;
    const addChords = vi.fn(() => new Promise<void>((resolve) => {
      releaseMutation = resolve;
    }));
    const { coordinator, transport } = coordinatorFixture({ addChords });
    const call = realtimeEvent({
      type: "response.function_call_arguments.done",
      event_id: "evt-tool-1",
      response_id: "response-tools",
      call_id: "call-1",
      name: "add_chords",
      arguments: '{"chords":["Cmaj7","Am7"]}',
    });

    await coordinator.handleEvent(call);
    await coordinator.handleEvent({
      ...call,
      event_id: "evt-tool-1-retry",
      arguments: '{ "chords": ["Cmaj7", "Am7"] }',
    });
    expect(addChords).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();

    await coordinator.handleEvent(realtimeEvent({
      type: "response.done",
      event_id: "evt-response-done",
      response: {
        id: "response-tools",
        status: "completed",
        output: [
          {
            type: "function_call",
            status: "completed",
            call_id: "call-1",
            name: "add_chords",
            arguments: '{"chords":["Cmaj7","Am7"]}',
          },
          {
            type: "function_call",
            status: "completed",
            call_id: "call-1",
            name: "add_chords",
            arguments: '{ "chords": ["Cmaj7", "Am7"] }',
          },
        ],
      },
    }));

    await vi.waitFor(() => expect(addChords).toHaveBeenCalledTimes(1));
    releaseMutation?.();
    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(2));

    expect(transport.send.mock.calls[0]?.[0]).toMatchObject({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: "call-1",
      },
    });
    expect(transport.send.mock.calls[1]?.[0]).toEqual({ type: "response.create" });
  });

  it("waits for every tool output before sending one response continuation", async () => {
    const { coordinator, transport, addChords, highlightChord } = coordinatorFixture();

    await coordinator.handleEvent(realtimeEvent({
      type: "response.done",
      event_id: "evt-multi-done",
      response: {
        id: "response-multi",
        status: "completed",
        output: [
          {
            type: "function_call",
            status: "completed",
            call_id: "call-add",
            name: "add_chords",
            arguments: '{"chords":["Dm7"]}',
          },
          {
            type: "function_call",
            status: "completed",
            call_id: "call-highlight",
            name: "highlight_chord",
            arguments: '{"index":0}',
          },
        ],
      },
    }));

    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(3));
    expect(addChords).toHaveBeenCalledTimes(1);
    expect(highlightChord).toHaveBeenCalledWith({ index: 0 });
    const events = transport.send.mock.calls.map(([event]) => event);
    expect(events.filter((event) => event.type === "conversation.item.create")).toHaveLength(2);
    expect(events.filter((event) => event.type === "response.create")).toHaveLength(1);
    expect(events.at(-1)).toEqual({ type: "response.create" });
  });

  it("drops a prior session's pending tool completion after disconnect and restart", async () => {
    let releaseMutation: (() => void) | undefined;
    const addChords = vi.fn(() => new Promise<void>((resolve) => {
      releaseMutation = resolve;
    }));
    const { bridge, coordinator, transport, state } = coordinatorFixture({ addChords });

    await coordinator.handleEvent(realtimeEvent({
      type: "response.done",
      event_id: "evt-old-response",
      response: {
        id: "response-old",
        status: "completed",
        output: [{
          type: "function_call",
          status: "completed",
          call_id: "call-old",
          name: "add_chords",
          arguments: '{"chords":["C"]}',
        }],
      },
    }));
    await vi.waitFor(() => expect(addChords).toHaveBeenCalledTimes(1));

    coordinator.handleDisconnected();
    coordinator.beginSession(bridge);
    releaseMutation?.();
    await Promise.resolve();
    await Promise.resolve();

    expect(transport.send).not.toHaveBeenCalled();
    expect(transport.stop).not.toHaveBeenCalled();
    expect(state.fatalError).toBeNull();
  });

  it("returns an explicit failure for invalid arguments without mutating the bridge", async () => {
    const { coordinator, transport, addChords } = coordinatorFixture();

    await coordinator.handleEvent(realtimeEvent({
      type: "response.done",
      event_id: "evt-invalid-done",
      response: {
        id: "response-invalid",
        status: "completed",
        output: [{
          type: "function_call",
          status: "completed",
          call_id: "call-invalid",
          name: "add_chords",
          arguments: '{"chords":["C"],"unexpected":true}',
        }],
      },
    }));

    await vi.waitFor(() => expect(transport.send).toHaveBeenCalledTimes(2));
    expect(addChords).not.toHaveBeenCalled();
    const outputEvent = transport.send.mock.calls[0]?.[0] as {
      item?: { output?: string };
    };
    expect(JSON.parse(outputEvent.item?.output ?? "{}")).toMatchObject({ ok: false });
  });

  it("fails closed when a call id is reused with different input", async () => {
    let releaseMutation: (() => void) | undefined;
    const addChords = vi.fn(() => new Promise<void>((resolve) => {
      releaseMutation = resolve;
    }));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { coordinator, transport, state } = coordinatorFixture({ addChords });

    await coordinator.handleEvent(realtimeEvent({
      type: "response.done",
      event_id: "evt-conflict",
      response: {
        id: "response-conflict",
        status: "completed",
        output: [
          {
            type: "function_call",
            status: "completed",
            call_id: "call-conflict",
            name: "add_chords",
            arguments: '{"chords":["C"]}',
          },
          {
            type: "function_call",
            status: "completed",
            call_id: "call-conflict",
            name: "add_chords",
            arguments: '{"chords":["G"]}',
          },
        ],
      },
    }));

    await vi.waitFor(() => expect(state.fatalError).toContain("invalid tool response"));
    releaseMutation?.();
    await vi.waitFor(() => expect(transport.stop).toHaveBeenCalledTimes(1));
    expect(addChords).toHaveBeenCalledTimes(1);
    expect(transport.send).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[harmony-hash-voice] Realtime session rejected an invalid provider event",
    );
  });

  it("never executes tool events from cancelled or incomplete responses", async () => {
    const { coordinator, transport, addChords } = coordinatorFixture();

    for (const status of ["cancelled", "incomplete"] as const) {
      await coordinator.handleEvent(realtimeEvent({
        type: "response.function_call_arguments.done",
        event_id: `evt-arguments-${status}`,
        response_id: `response-${status}`,
        call_id: `call-${status}`,
        name: "add_chords",
        arguments: '{"chords":["C"]}',
      }));
      await coordinator.handleEvent(realtimeEvent({
        type: "response.done",
        event_id: `evt-response-${status}`,
        response: {
          id: `response-${status}`,
          status,
          output: [{
            type: "function_call",
            status: "in_progress",
            call_id: `call-${status}`,
            name: "add_chords",
            arguments: '{"chords":["C"]}',
          }],
        },
      }));
    }

    await Promise.resolve();
    expect(addChords).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
    expect(transport.stop).not.toHaveBeenCalled();
  });

  it("ignores cancellation diagnostics but stops on an unexpected provider error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { coordinator, transport, state } = coordinatorFixture();

    await coordinator.handleEvent(realtimeEvent({
      type: "error",
      event_id: "evt-benign-error",
      error: { code: "response_cancel_not_active", message: "ignored detail" },
    }));
    expect(transport.stop).not.toHaveBeenCalled();

    await coordinator.handleEvent(realtimeEvent({
      type: "error",
      event_id: "evt-provider-error",
      error: { code: "provider_internal_error", message: "private provider detail" },
    }));
    expect(transport.stop).toHaveBeenCalledTimes(1);
    expect(state.fatalError).toBe("The voice session ran into a problem. Please try again.");
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("private provider detail"));
  });
});

describe("VoiceAgentProvider context adapter", () => {
  function ContextProbe() {
    const context = useVoiceAgent();
    return (
      <span
        data-status={context.status}
        data-client-secret-endpoint={context.clientSecretEndpoint}
      >
        voice child
      </span>
    );
  }

  beforeEach(() => {
    realtimeMock.instances.length = 0;
  });

  afterEach(() => vi.restoreAllMocks());

  it("creates one Realtime session and clears focus on disconnect", async () => {
    const { bridge, highlightChord } = bridgeFixture();
    const markup = renderToStaticMarkup(
      <VoiceAgentProvider
        bridge={bridge}
        clientSecretEndpoint="/api/voice/client-secret"
      >
        <ContextProbe />
      </VoiceAgentProvider>,
    );

    expect(markup).toContain('data-status="disconnected"');
    expect(markup).toContain('data-client-secret-endpoint="/api/voice/client-secret"');
    expect(realtimeMock.instances).toHaveLength(1);
    realtimeMock.instances[0]?.callbacks.onDisconnected();
    await vi.waitFor(() => expect(highlightChord).toHaveBeenCalledWith(null));
  });
});
