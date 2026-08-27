import { createContext, useContext } from "react";
import type {
  RealtimeConnectionStatus,
  RealtimeServerEvent,
} from "./openAIRealtimeSession";
import {
  createProgressionAgentToolDispatcher,
  type ProgressionAgentToolDispatcher,
} from "./progressionAgentTools";
import {
  RealtimeTranscriptLedger,
  type RealtimeTranscriptEvent,
} from "./realtimeTranscript";
import type { ProgressionBridge } from "./types";

const TOOL_PROTOCOL_ERROR =
  "The voice session received an invalid tool response. Please try again.";
const PROVIDER_EVENT_ERROR =
  "The voice session ran into a problem. Please try again.";

const BENIGN_REALTIME_ERROR_CODES = new Set([
  "response_cancel_not_active",
  "response_cancelled",
  "response_canceled",
]);

export interface TranscriptEntry {
  id: number;
  role: "user" | "agent";
  text: string;
}

export interface VoiceAgentContextValue {
  bridge: ProgressionBridge;
  clientSecretEndpoint: string;
  status: RealtimeConnectionStatus;
  message: string | null;
  playbackError: string | null;
  startSession: (signal?: AbortSignal) => Promise<void>;
  endSession: () => Promise<void>;
  setVolume: (options: { volume: number }) => void;
  transcript: TranscriptEntry[];
  sessionKind: "voice" | "text" | null;
  audioPacketCount: number;
  agentReplyCount: number;
  /** Inbound-audio packet count captured for the latest assistant response. */
  agentReplyAudioBaseline: number;
}

export const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

/** Read voice-agent config/state. Throws if used outside <VoiceAgentProvider/>. */
export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) {
    throw new Error("Voice agent hooks must be used inside <VoiceAgentProvider>");
  }
  return ctx;
}

interface VoiceAgentTransport {
  send(event: Record<string, unknown>): boolean;
  stop(): Promise<void>;
}

export interface VoiceAgentCoordinatorSink {
  setTranscript(entries: TranscriptEntry[]): void;
  setSessionKind(kind: "voice" | "text" | null): void;
  setAudioPacketCount(count: number): void;
  setAgentReplyCount(count: number): void;
  setAgentReplyAudioBaseline(count: number): void;
  setFatalError(message: string): void;
}

interface ToolResponseGroup {
  readonly pendingByCallId: Map<string, Promise<void>>;
  responseDone: boolean;
  continued: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function eventIdentity(event: RealtimeServerEvent): {
  eventId: string;
  itemId: string;
} | null {
  const eventId = nonEmptyString(event.event_id);
  const itemId = nonEmptyString(event.item_id);
  return eventId && itemId ? { eventId, itemId } : null;
}

function transcriptEventFor(
  event: RealtimeServerEvent,
): RealtimeTranscriptEvent | null {
  if (event.type === "conversation.item.added") {
    const eventId = nonEmptyString(event.event_id);
    const item = isRecord(event.item) ? event.item : null;
    const itemId = nonEmptyString(item?.id);
    const previousItemId = event.previous_item_id;
    if (
      !eventId
      || !itemId
      || (previousItemId !== null && nonEmptyString(previousItemId) === null)
    ) {
      return null;
    }
    const sourceRole = item?.role;
    const role = sourceRole === "user" || sourceRole === "assistant"
      ? sourceRole
      : null;
    return {
      type: "item-order",
      eventId,
      itemId,
      previousItemId: previousItemId as string | null,
      role,
    };
  }

  const identity = eventIdentity(event);
  if (!identity) return null;

  switch (event.type) {
    case "conversation.item.input_audio_transcription.delta":
      return typeof event.delta === "string"
        ? { type: "user-transcript-delta", ...identity, delta: event.delta }
        : null;
    case "conversation.item.input_audio_transcription.completed":
      return typeof event.transcript === "string"
        ? {
            type: "user-transcript-completed",
            ...identity,
            transcript: event.transcript,
          }
        : null;
    case "conversation.item.input_audio_transcription.failed":
      return { type: "user-transcript-failed", ...identity, error: event.error };
    case "response.output_audio_transcript.delta":
      return typeof event.delta === "string"
        ? { type: "agent-transcript-delta", ...identity, delta: event.delta }
        : null;
    case "response.output_audio_transcript.done":
      return typeof event.transcript === "string"
        ? {
            type: "agent-transcript-completed",
            ...identity,
            transcript: event.transcript,
          }
        : null;
    default:
      return null;
  }
}

function responseIdFor(event: RealtimeServerEvent): string | null {
  const direct = nonEmptyString(event.response_id);
  if (direct) return direct;
  const response = isRecord(event.response) ? event.response : null;
  return nonEmptyString(response?.id);
}

function isBenignRealtimeError(event: RealtimeServerEvent): boolean {
  const error = isRecord(event.error) ? event.error : null;
  const code = nonEmptyString(error?.code);
  const type = nonEmptyString(error?.type);
  return (code !== null && BENIGN_REALTIME_ERROR_CODES.has(code))
    || (type !== null && BENIGN_REALTIME_ERROR_CODES.has(type));
}

/**
 * Provider-neutral state machine for OpenAI Realtime server events.
 *
 * It is kept outside the React component so duplicate/out-of-order provider
 * events and async tool continuations can be verified without a browser DOM.
 */
export class VoiceAgentEventCoordinator {
  private bridge: ProgressionBridge;
  private readonly sink: VoiceAgentCoordinatorSink;
  private readonly transcriptLedger = new RealtimeTranscriptLedger();
  private dispatcher: ProgressionAgentToolDispatcher;
  private transport: VoiceAgentTransport | null = null;
  private readonly responseAudioBaselines = new Map<string, number>();
  private readonly responseToolGroups = new Map<string, ToolResponseGroup>();
  private readonly responseIdByCallId = new Map<string, string>();
  private readonly completedUserItemIds = new Set<string>();
  private readonly completedAgentItemIds = new Set<string>();
  private audioPacketCount = 0;
  private currentTurnAudioBaseline = 0;
  private agentReplyCount = 0;
  private failed = false;
  private sessionGeneration = 0;

  constructor(bridge: ProgressionBridge, sink: VoiceAgentCoordinatorSink) {
    this.bridge = bridge;
    this.sink = sink;
    this.dispatcher = createProgressionAgentToolDispatcher(bridge);
  }

  attachTransport(transport: VoiceAgentTransport): void {
    this.transport = transport;
  }

  beginSession(bridge: ProgressionBridge): void {
    this.sessionGeneration += 1;
    this.bridge = bridge;
    this.dispatcher = createProgressionAgentToolDispatcher(bridge);
    this.transcriptLedger.clear();
    this.responseAudioBaselines.clear();
    this.responseToolGroups.clear();
    this.responseIdByCallId.clear();
    this.completedUserItemIds.clear();
    this.completedAgentItemIds.clear();
    this.audioPacketCount = 0;
    this.currentTurnAudioBaseline = 0;
    this.agentReplyCount = 0;
    this.failed = false;
    this.sink.setTranscript([]);
    this.sink.setSessionKind(null);
    this.sink.setAudioPacketCount(0);
    this.sink.setAgentReplyCount(0);
    this.sink.setAgentReplyAudioBaseline(0);
  }

  handleConnected(): void {
    this.sink.setSessionKind("voice");
  }

  handlePacketCount(packetCount: number): void {
    if (!Number.isFinite(packetCount) || packetCount < 0) return;
    this.audioPacketCount = Math.floor(packetCount);
    this.sink.setAudioPacketCount(this.audioPacketCount);
  }

  handleDisconnected(): void {
    this.sessionGeneration += 1;
    this.transcriptLedger.clear();
    this.responseAudioBaselines.clear();
    this.responseToolGroups.clear();
    this.responseIdByCallId.clear();
    this.completedUserItemIds.clear();
    this.completedAgentItemIds.clear();
    this.sink.setTranscript([]);
    this.sink.setSessionKind(null);
    void this.clearFocus();
  }

  async clearFocus(): Promise<void> {
    try {
      await this.bridge.highlightChord(null);
    } catch {
      console.error("[harmony-hash-voice] Could not clear Hanz focus");
    }
  }

  async handleEvent(event: RealtimeServerEvent): Promise<void> {
    if (this.failed) return;

    const normalizedTranscriptEvent = transcriptEventFor(event);
    if (normalizedTranscriptEvent) {
      this.handleTranscriptEvent(normalizedTranscriptEvent, event);
    }

    switch (event.type) {
      case "response.created": {
        const responseId = responseIdFor(event);
        if (responseId) {
          this.responseAudioBaselines.set(responseId, this.audioPacketCount);
        }
        return;
      }
      case "response.function_call_arguments.done": {
        // OpenAI can emit this event for a response that is later cancelled or
        // incomplete. Defer all application authority until response.done proves
        // that both the response and its function-call item completed.
        return;
      }
      case "response.done":
        await this.handleResponseDone(event);
        return;
      case "error":
        if (!isBenignRealtimeError(event)) {
          await this.failClosed(PROVIDER_EVENT_ERROR);
        }
        return;
      default:
        return;
    }
  }

  private handleTranscriptEvent(
    normalized: RealtimeTranscriptEvent,
    raw: RealtimeServerEvent,
  ): void {
    this.transcriptLedger.ingest(normalized);
    if (
      normalized.type === "item-order"
      || normalized.type === "user-transcript-completed"
      || normalized.type === "agent-transcript-completed"
    ) {
      this.sink.setTranscript(this.transcriptLedger.finalizedEntries());
    }

    if (
      normalized.type === "user-transcript-completed"
      && normalized.transcript.trim().length > 0
      && !this.completedUserItemIds.has(normalized.itemId)
    ) {
      this.completedUserItemIds.add(normalized.itemId);
      this.currentTurnAudioBaseline = this.audioPacketCount;
      return;
    }

    if (
      normalized.type === "agent-transcript-completed"
      && normalized.transcript.trim().length > 0
      && !this.completedAgentItemIds.has(normalized.itemId)
    ) {
      this.completedAgentItemIds.add(normalized.itemId);
      const responseId = responseIdFor(raw);
      const baseline = responseId
        ? (this.responseAudioBaselines.get(responseId) ?? this.currentTurnAudioBaseline)
        : this.currentTurnAudioBaseline;
      this.agentReplyCount += 1;
      this.sink.setAgentReplyAudioBaseline(baseline);
      this.sink.setAgentReplyCount(this.agentReplyCount);
    }
  }

  private async handleResponseDone(event: RealtimeServerEvent): Promise<void> {
    const response = isRecord(event.response) ? event.response : null;
    const responseId = nonEmptyString(response?.id);
    if (!responseId) return;

    if (response?.status === "failed") {
      await this.failClosed(PROVIDER_EVENT_ERROR);
      return;
    }

    if (response?.status !== "completed") {
      this.responseToolGroups.delete(responseId);
      this.responseAudioBaselines.delete(responseId);
      return;
    }

    const output = response && Array.isArray(response.output) ? response.output : [];
    for (const item of output) {
      if (isRecord(item) && item.type === "function_call") {
        if (item.status !== "completed") {
          await this.failClosed(TOOL_PROTOCOL_ERROR);
          return;
        }
        this.registerToolCall(responseId, item);
        if (this.failed) return;
      }
    }

    const group = this.responseToolGroups.get(responseId);
    if (!group) return;
    group.responseDone = true;
    this.continueAfterTools(responseId, group);
  }

  private registerToolCall(
    responseId: string,
    call: Record<string, unknown>,
  ): void {
    if (this.failed) return;
    const ticket = this.dispatcher.dispatch({
      call_id: typeof call.call_id === "string" ? call.call_id : "",
      name: typeof call.name === "string" ? call.name : "",
      arguments: typeof call.arguments === "string" ? call.arguments : "",
    });

    if (ticket.status === "conflict" || ticket.status === "invalid") {
      void this.failClosed(TOOL_PROTOCOL_ERROR);
      return;
    }

    const knownResponseId = this.responseIdByCallId.get(ticket.callId);
    if (knownResponseId !== undefined && knownResponseId !== responseId) {
      void this.failClosed(TOOL_PROTOCOL_ERROR);
      return;
    }
    this.responseIdByCallId.set(ticket.callId, responseId);

    const group = this.responseToolGroups.get(responseId) ?? {
      pendingByCallId: new Map<string, Promise<void>>(),
      responseDone: false,
      continued: false,
    };
    this.responseToolGroups.set(responseId, group);
    if (group.pendingByCallId.has(ticket.callId)) return;

    const generation = this.sessionGeneration;
    const task = ticket.outputPromise
      .then(async (output) => {
        if (
          generation !== this.sessionGeneration
          || this.failed
          || !ticket.claimOutput()
        ) {
          return;
        }
        const sent = this.transport?.send({
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: ticket.callId,
            output,
          },
        }) ?? false;
        if (!sent && generation === this.sessionGeneration) {
          await this.failClosed(TOOL_PROTOCOL_ERROR);
        }
      })
      .catch(async () => {
        if (generation === this.sessionGeneration) {
          await this.failClosed(TOOL_PROTOCOL_ERROR);
        }
      })
      .finally(() => {
        group.pendingByCallId.delete(ticket.callId);
        if (generation === this.sessionGeneration) {
          this.continueAfterTools(responseId, group);
        }
      });
    group.pendingByCallId.set(ticket.callId, task);
  }

  private continueAfterTools(responseId: string, group: ToolResponseGroup): void {
    if (
      this.failed
      || !group.responseDone
      || group.continued
      || group.pendingByCallId.size > 0
    ) {
      return;
    }
    group.continued = true;
    if (!(this.transport?.send({ type: "response.create" }) ?? false)) {
      void this.failClosed(TOOL_PROTOCOL_ERROR);
      return;
    }
    this.responseAudioBaselines.delete(responseId);
  }

  private async failClosed(message: string): Promise<void> {
    if (this.failed) return;
    this.failed = true;
    console.error("[harmony-hash-voice] Realtime session rejected an invalid provider event");
    try {
      await this.transport?.stop();
    } catch {
      console.error("[harmony-hash-voice] Could not stop the invalid Realtime session");
    }
    await this.clearFocus();
    this.sink.setSessionKind(null);
    this.sink.setFatalError(message);
  }
}
