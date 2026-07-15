import { describe, expect, it } from "vitest";
import {
  insertionBoundaryToMoveIndex,
  reconcileTimeline,
  remapIndex,
  remapIndexedRecord,
  remapIndexedSet,
  transactTimeline,
} from "./timelineTransactions";

describe("timeline transactions", () => {
  it("inserts at the first, middle, and last boundaries", () => {
    expect(transactTimeline(["B", "C"], {
      type: "insert",
      boundary: 0,
      item: "A",
    })).toEqual({
      items: ["A", "B", "C"],
      map: { oldToNew: [1, 2], newToOld: [null, 0, 1] },
      changed: true,
    });

    expect(transactTimeline(["A", "C"], {
      type: "insert",
      boundary: 1,
      item: "B",
    }).items).toEqual(["A", "B", "C"]);

    expect(transactTimeline(["A", "B"], {
      type: "insert",
      boundary: 2,
      item: "C",
    }).items).toEqual(["A", "B", "C"]);
  });

  it("moves items forward and backward using the final destination index", () => {
    expect(transactTimeline(["A", "B", "C", "D"], {
      type: "move",
      from: 1,
      to: 3,
    })).toEqual({
      items: ["A", "C", "D", "B"],
      map: { oldToNew: [0, 3, 1, 2], newToOld: [0, 2, 3, 1] },
      changed: true,
    });

    expect(transactTimeline(["A", "B", "C", "D"], {
      type: "move",
      from: 3,
      to: 1,
    }).items).toEqual(["A", "D", "B", "C"]);
  });

  it("preserves duplicate chord symbols by position", () => {
    const result = transactTimeline(["Cmaj7", "Dm7", "Cmaj7"], {
      type: "move",
      from: 2,
      to: 0,
    });

    expect(result.items).toEqual(["Cmaj7", "Cmaj7", "Dm7"]);
    expect(result.map.oldToNew).toEqual([1, 2, 0]);
  });

  it("returns an identity transaction for a no-op move", () => {
    const source = ["C", "G"];
    const result = transactTimeline(source, { type: "move", from: 1, to: 1 });

    expect(result.changed).toBe(false);
    expect(result.items).toBe(source);
    expect(result.map).toEqual({ oldToNew: [0, 1], newToOld: [0, 1] });
  });

  it("removes first and last items with accurate index maps", () => {
    expect(transactTimeline(["A", "B", "C"], {
      type: "remove",
      index: 0,
    })).toEqual({
      items: ["B", "C"],
      map: { oldToNew: [null, 0, 1], newToOld: [1, 2] },
      changed: true,
    });

    expect(transactTimeline(["A", "B", "C"], {
      type: "remove",
      index: 2,
    })).toEqual({
      items: ["A", "B"],
      map: { oldToNew: [0, 1, null], newToOld: [0, 1] },
      changed: true,
    });
  });

  it("remaps index-keyed records, sets, and nullable cursors", () => {
    const { map } = transactTimeline(["A", "B", "C"], {
      type: "move",
      from: 2,
      to: 0,
    });

    expect(remapIndexedRecord({ 0: "first", 2: "third" }, map)).toEqual({
      0: "third",
      1: "first",
    });
    expect([...remapIndexedSet(new Set([0, 2]), map)]).toEqual([1, 0]);
    expect(remapIndex(2, map)).toBe(0);
    expect(remapIndex(null, map)).toBeNull();
  });

  it("converts a drop boundary to a final move index", () => {
    expect(insertionBoundaryToMoveIndex(0, 2, 4)).toBe(0);
    expect(insertionBoundaryToMoveIndex(2, 0, 4)).toBe(1);
    expect(insertionBoundaryToMoveIndex(4, 1, 4)).toBe(3);
  });

  it("reconciles a draft by stable identity while mapping inserts and removals", () => {
    const a = { id: 10, value: "C" };
    const b = { id: 11, value: "G" };
    const c = { id: 12, value: "Am" };
    const inserted = { id: 13, value: "F" };

    expect(reconcileTimeline([a, b, c], [c, inserted, a])).toEqual({
      items: [c, inserted, a],
      map: { oldToNew: [2, null, 0], newToOld: [2, null, 0] },
      changed: true,
    });
  });

  it("rejects duplicate stable identities during reconciliation", () => {
    const item = { id: 10, value: "C" };
    expect(() => reconcileTimeline([item], [item, item])).toThrow(
      "Duplicate target timeline item id: 10",
    );
  });

  it.each([
    [{ type: "insert", boundary: -1, item: "X" } as const],
    [{ type: "insert", boundary: 3, item: "X" } as const],
    [{ type: "insert", boundary: 0.5, item: "X" } as const],
    [{ type: "move", from: -1, to: 0 } as const],
    [{ type: "move", from: 0, to: 2 } as const],
    [{ type: "remove", index: Number.NaN } as const],
  ])("rejects invalid boundaries and indexes: %o", (mutation) => {
    expect(() => transactTimeline(["A", "B"], mutation)).toThrow(RangeError);
  });
});
