import { describe, expect, it } from "vitest";
import { RealtimeTranscriptLedger } from "./realtimeTranscript";

describe("RealtimeTranscriptLedger", () => {
  it("orders finalized rows by the item chain when events arrive out of order", () => {
    const ledger = new RealtimeTranscriptLedger();

    ledger.ingest({
      type: "item-order",
      eventId: "event-item-agent",
      itemId: "item-agent",
      previousItemId: "item-user",
      role: "assistant",
    });
    ledger.ingest({
      type: "agent-transcript-completed",
      eventId: "event-agent-done",
      itemId: "item-agent",
      transcript: "Try G7 next.",
    });
    ledger.ingest({
      type: "user-transcript-completed",
      eventId: "event-user-done",
      itemId: "item-user",
      transcript: "What follows D minor?",
    });

    expect(ledger.finalizedEntries()).toEqual([]);

    ledger.ingest({
      type: "item-order",
      eventId: "event-item-user",
      itemId: "item-user",
      previousItemId: null,
      role: "user",
    });

    expect(ledger.finalizedEntries()).toEqual([
      { id: 0, role: "user", text: "What follows D minor?" },
      { id: 1, role: "agent", text: "Try G7 next." },
    ]);
  });

  it("keeps completed text authoritative across duplicate and late deltas", () => {
    const ledger = new RealtimeTranscriptLedger();

    ledger.ingest({
      type: "item-order",
      eventId: "event-item",
      itemId: "item-user",
      previousItemId: null,
      role: "user",
    });
    const delta = {
      type: "user-transcript-delta" as const,
      eventId: "event-delta",
      itemId: "item-user",
      delta: "What follows",
    };
    expect(ledger.ingest(delta)).toBeNull();
    expect(ledger.ingest(delta)).toBe("duplicate-event");
    ledger.ingest({
      type: "user-transcript-completed",
      eventId: "event-completed",
      itemId: "item-user",
      transcript: "What follows D minor?",
    });

    expect(ledger.ingest({
      type: "user-transcript-delta",
      eventId: "event-late-delta",
      itemId: "item-user",
      delta: " stale provider fragment",
    })).toBe("late-delta");
    expect(ledger.ingest({
      type: "user-transcript-completed",
      eventId: "event-conflicting-completed",
      itemId: "item-user",
      transcript: "Regressed text",
    })).toBe("completion-conflict");

    expect(ledger.finalizedEntries()).toEqual([
      { id: 0, role: "user", text: "What follows D minor?" },
    ]);
  });

  it("does not finalize empty or failed transcription or retain provider errors", () => {
    const ledger = new RealtimeTranscriptLedger();

    ledger.ingest({
      type: "item-order",
      eventId: "event-empty-item",
      itemId: "item-empty",
      previousItemId: null,
      role: "user",
    });
    expect(ledger.ingest({
      type: "user-transcript-completed",
      eventId: "event-empty",
      itemId: "item-empty",
      transcript: "   ",
    })).toBe("empty-transcript");
    ledger.ingest({
      type: "item-order",
      eventId: "event-failed-item",
      itemId: "item-failed",
      previousItemId: "item-empty",
      role: "user",
    });
    expect(ledger.ingest({
      type: "user-transcript-failed",
      eventId: "event-failed",
      itemId: "item-failed",
      error: { message: "provider-secret-detail" },
    })).toBe("transcription-failed");

    expect(ledger.finalizedEntries()).toEqual([]);
    expect(ledger.diagnostics()).toEqual([
      { classification: "empty-transcript", count: 1 },
      { classification: "transcription-failed", count: 1 },
    ]);
    expect(JSON.stringify(ledger)).not.toContain("provider-secret-detail");
    expect(JSON.stringify(ledger.diagnostics())).not.toContain("provider-secret-detail");
  });

  it("caps finalized output at twenty rows with stable monotonic ids", () => {
    const ledger = new RealtimeTranscriptLedger();

    for (let index = 0; index < 25; index += 1) {
      const itemId = `item-${index}`;
      ledger.ingest({
        type: "item-order",
        eventId: `event-item-${index}`,
        itemId,
        previousItemId: index === 0 ? null : `item-${index - 1}`,
        role: index % 2 === 0 ? "user" : "assistant",
      });
      ledger.ingest(index % 2 === 0
        ? {
            type: "user-transcript-completed",
            eventId: `event-completed-${index}`,
            itemId,
            transcript: `Turn ${index}`,
          }
        : {
            type: "agent-transcript-completed",
            eventId: `event-completed-${index}`,
            itemId,
            transcript: `Turn ${index}`,
          });
    }

    const firstRead = ledger.finalizedEntries();
    expect(firstRead).toHaveLength(20);
    expect(firstRead.map(({ id }) => id)).toEqual(Array.from({ length: 20 }, (_, index) => index + 5));
    expect(firstRead.at(0)).toEqual({ id: 5, role: "agent", text: "Turn 5" });
    expect(firstRead.at(-1)).toEqual({ id: 24, role: "user", text: "Turn 24" });
    expect(ledger.finalizedEntries()).toEqual(firstRead);

    ledger.clear();
    expect(ledger.finalizedEntries()).toEqual([]);
    expect(ledger.diagnostics()).toEqual([]);
  });
});
