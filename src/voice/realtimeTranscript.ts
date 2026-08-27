import type { TranscriptEntry } from "./voiceAgentContext";

const MAX_FINALIZED_ENTRIES = 20;

type FinalRole = TranscriptEntry["role"];
type TerminalState = "completed" | "empty" | "failed";

interface TranscriptItem {
  itemId: string;
  previousItemId?: string | null;
  role?: FinalRole;
  orderId?: number;
  terminalState?: TerminalState;
  finalText?: string;
}

export type RealtimeTranscriptDiagnosticClassification =
  | "duplicate-event"
  | "invalid-event"
  | "item-order-conflict"
  | "item-role-conflict"
  | "late-delta"
  | "completion-conflict"
  | "empty-transcript"
  | "transcription-failed";

export interface RealtimeTranscriptDiagnostic {
  classification: RealtimeTranscriptDiagnosticClassification;
  count: number;
}

interface BaseTranscriptEvent {
  eventId: string;
  itemId: string;
}

export type RealtimeTranscriptEvent =
  | (BaseTranscriptEvent & {
      type: "item-order";
      previousItemId: string | null;
      role?: "user" | "assistant" | null;
    })
  | (BaseTranscriptEvent & {
      type: "user-transcript-delta";
      delta: string;
    })
  | (BaseTranscriptEvent & {
      type: "user-transcript-completed";
      transcript: string;
    })
  | (BaseTranscriptEvent & {
      type: "user-transcript-failed";
      /** Accepted only so callers can pass through the provider event shape. Never retained. */
      error?: unknown;
    })
  | (BaseTranscriptEvent & {
      type: "agent-transcript-delta";
      delta: string;
    })
  | (BaseTranscriptEvent & {
      type: "agent-transcript-completed";
      transcript: string;
    });

const DIAGNOSTIC_ORDER: readonly RealtimeTranscriptDiagnosticClassification[] = [
  "duplicate-event",
  "invalid-event",
  "item-order-conflict",
  "item-role-conflict",
  "late-delta",
  "completion-conflict",
  "empty-transcript",
  "transcription-failed",
];

/**
 * Maintains finalized Realtime transcripts independently from provider arrival order.
 * Partial deltas are intentionally not retained: completed events are authoritative,
 * which makes retries and completion-before-delta delivery safe by construction.
 */
export class RealtimeTranscriptLedger {
  private readonly items = new Map<string, TranscriptItem>();
  private readonly seenEventIds = new Set<string>();
  private readonly successorByItemId = new Map<string, string>();
  private readonly orderedItemIds: string[] = [];
  private readonly diagnosticCounts = new Map<RealtimeTranscriptDiagnosticClassification, number>();
  private rootItemId: string | null = null;
  private nextOrderId = 0;

  ingest(event: RealtimeTranscriptEvent): RealtimeTranscriptDiagnosticClassification | null {
    if (!this.isValidIdentifier(event.eventId) || !this.isValidIdentifier(event.itemId)) {
      return this.recordDiagnostic("invalid-event");
    }

    if (this.seenEventIds.has(event.eventId)) {
      return this.recordDiagnostic("duplicate-event");
    }
    this.seenEventIds.add(event.eventId);

    switch (event.type) {
      case "item-order":
        return this.recordItemOrder(event.itemId, event.previousItemId, event.role ?? null);
      case "user-transcript-delta":
        return this.recordDelta(event.itemId, event.delta, "user");
      case "agent-transcript-delta":
        return this.recordDelta(event.itemId, event.delta, "agent");
      case "user-transcript-completed":
        return this.complete(event.itemId, event.transcript, "user");
      case "agent-transcript-completed":
        return this.complete(event.itemId, event.transcript, "agent");
      case "user-transcript-failed":
        return this.fail(event.itemId);
    }
  }

  finalizedEntries(): TranscriptEntry[] {
    const entries: TranscriptEntry[] = [];

    for (const itemId of this.orderedItemIds) {
      const item = this.items.get(itemId);
      if (
        item?.terminalState !== "completed"
        || item.orderId === undefined
        || item.role === undefined
        || item.finalText === undefined
      ) {
        continue;
      }
      entries.push({ id: item.orderId, role: item.role, text: item.finalText });
    }

    return entries.slice(-MAX_FINALIZED_ENTRIES);
  }

  diagnostics(): RealtimeTranscriptDiagnostic[] {
    return DIAGNOSTIC_ORDER.flatMap((classification) => {
      const count = this.diagnosticCounts.get(classification) ?? 0;
      return count > 0 ? [{ classification, count }] : [];
    });
  }

  clear(): void {
    this.items.clear();
    this.seenEventIds.clear();
    this.successorByItemId.clear();
    this.orderedItemIds.length = 0;
    this.diagnosticCounts.clear();
    this.rootItemId = null;
    this.nextOrderId = 0;
  }

  private recordItemOrder(
    itemId: string,
    previousItemId: string | null,
    sourceRole: "user" | "assistant" | null,
  ): RealtimeTranscriptDiagnosticClassification | null {
    if (previousItemId !== null && !this.isValidIdentifier(previousItemId)) {
      return this.recordDiagnostic("invalid-event");
    }
    if (previousItemId === itemId) {
      return this.recordDiagnostic("item-order-conflict");
    }

    const item = this.item(itemId);
    let diagnostic: RealtimeTranscriptDiagnosticClassification | null = null;

    if (item.previousItemId !== undefined && item.previousItemId !== previousItemId) {
      return this.recordDiagnostic("item-order-conflict");
    }
    item.previousItemId = previousItemId;

    const role = sourceRole === "assistant" ? "agent" : sourceRole;
    if (role !== null) {
      diagnostic = this.recordRole(item, role, false);
    }

    if (previousItemId === null) {
      if (this.rootItemId !== null && this.rootItemId !== itemId) {
        return this.recordDiagnostic("item-order-conflict");
      }
      this.rootItemId = itemId;
      this.orderFrom(itemId);
      return diagnostic;
    }

    const existingSuccessor = this.successorByItemId.get(previousItemId);
    if (existingSuccessor !== undefined && existingSuccessor !== itemId) {
      return this.recordDiagnostic("item-order-conflict");
    }
    this.successorByItemId.set(previousItemId, itemId);

    const previous = this.items.get(previousItemId);
    if (previous?.orderId !== undefined) {
      this.orderFrom(itemId);
    }
    return diagnostic;
  }

  private recordDelta(
    itemId: string,
    delta: string,
    role: FinalRole,
  ): RealtimeTranscriptDiagnosticClassification | null {
    if (typeof delta !== "string") {
      return this.recordDiagnostic("invalid-event");
    }

    const item = this.item(itemId);
    if (item.terminalState !== undefined) {
      return this.recordDiagnostic("late-delta");
    }

    return this.recordRole(item, role, false);
  }

  private complete(
    itemId: string,
    transcript: string,
    role: FinalRole,
  ): RealtimeTranscriptDiagnosticClassification | null {
    if (typeof transcript !== "string") {
      return this.recordDiagnostic("invalid-event");
    }

    const item = this.item(itemId);
    const text = transcript.trim();
    if (item.terminalState !== undefined) {
      if (item.terminalState === "completed" && item.finalText === text && item.role === role) {
        return this.recordDiagnostic("duplicate-event");
      }
      if (item.terminalState === "empty" && text.length === 0) {
        return this.recordDiagnostic("duplicate-event");
      }
      return this.recordDiagnostic("completion-conflict");
    }

    const diagnostic = this.recordRole(item, role, true);
    if (text.length === 0) {
      item.terminalState = "empty";
      return diagnostic ?? this.recordDiagnostic("empty-transcript");
    }

    item.terminalState = "completed";
    item.finalText = text;
    return diagnostic;
  }

  private fail(itemId: string): RealtimeTranscriptDiagnosticClassification {
    const item = this.item(itemId);
    if (item.terminalState !== undefined) {
      if (item.terminalState === "failed") {
        return this.recordDiagnostic("duplicate-event");
      }
      return this.recordDiagnostic("completion-conflict");
    }

    this.recordRole(item, "user", true);
    item.terminalState = "failed";
    return this.recordDiagnostic("transcription-failed");
  }

  private recordRole(
    item: TranscriptItem,
    role: FinalRole,
    authoritative: boolean,
  ): RealtimeTranscriptDiagnosticClassification | null {
    if (item.role === undefined) {
      item.role = role;
      return null;
    }
    if (item.role === role) {
      return null;
    }

    if (authoritative) {
      item.role = role;
    }
    return this.recordDiagnostic("item-role-conflict");
  }

  private orderFrom(firstItemId: string): void {
    let itemId: string | undefined = firstItemId;

    while (itemId !== undefined) {
      const item = this.item(itemId);
      if (item.orderId !== undefined) return;

      item.orderId = this.nextOrderId++;
      this.orderedItemIds.push(itemId);
      itemId = this.successorByItemId.get(itemId);
    }
  }

  private item(itemId: string): TranscriptItem {
    const existing = this.items.get(itemId);
    if (existing !== undefined) return existing;

    const created = { itemId } satisfies TranscriptItem;
    this.items.set(itemId, created);
    return created;
  }

  private isValidIdentifier(value: string): boolean {
    return typeof value === "string" && value.trim().length > 0;
  }

  private recordDiagnostic(
    classification: RealtimeTranscriptDiagnosticClassification,
  ): RealtimeTranscriptDiagnosticClassification {
    this.diagnosticCounts.set(classification, (this.diagnosticCounts.get(classification) ?? 0) + 1);
    return classification;
  }
}
