export type TimelineItemId = number;

export interface TimelineItem<T> {
  readonly id: TimelineItemId;
  readonly value: T;
}

export interface TimelineDraftItem<T> {
  readonly id: TimelineItemId | null;
  readonly value: T;
}

export interface TimelineIndexMap {
  /** Old index to its new index, or null when the item was removed. */
  readonly oldToNew: readonly (number | null)[];
  /** New index to its old index, or null when the item was inserted. */
  readonly newToOld: readonly (number | null)[];
}

export type TimelineMutation<T> =
  | { readonly type: "insert"; readonly boundary: number; readonly item: T }
  | { readonly type: "move"; readonly from: number; readonly to: number }
  | { readonly type: "remove"; readonly index: number };

export interface TimelineTransactionResult<T> {
  readonly items: readonly T[];
  readonly map: TimelineIndexMap;
  readonly changed: boolean;
}

export function reconcileTimeline<T>(
  source: readonly TimelineItem<T>[],
  target: readonly TimelineItem<T>[],
): TimelineTransactionResult<TimelineItem<T>> {
  const oldIndexById = new Map<TimelineItemId, number>();
  source.forEach((item, index) => {
    if (oldIndexById.has(item.id)) {
      throw new Error(`Duplicate source timeline item id: ${item.id}`);
    }
    oldIndexById.set(item.id, index);
  });

  const seenTargetIds = new Set<TimelineItemId>();
  const newToOld = target.map((item) => {
    if (seenTargetIds.has(item.id)) {
      throw new Error(`Duplicate target timeline item id: ${item.id}`);
    }
    seenTargetIds.add(item.id);
    return oldIndexById.get(item.id) ?? null;
  });
  const oldToNew = source.map((): number | null => null);
  newToOld.forEach((oldIndex, newIndex) => {
    if (oldIndex !== null) oldToNew[oldIndex] = newIndex;
  });

  const changed = source.length !== target.length || target.some((item, index) =>
    source[index]?.id !== item.id || !Object.is(source[index]?.value, item.value),
  );

  return {
    items: changed ? [...target] : source,
    map: { oldToNew, newToOld },
    changed,
  };
}

function assertInteger(value: number, label: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${label} must be an integer`);
  }
}

function assertIndex(index: number, length: number, label: string): void {
  assertInteger(index, label);
  if (index < 0 || index >= length) {
    throw new RangeError(`${label} must be between 0 and ${Math.max(0, length - 1)}`);
  }
}

function identityIndexMap(length: number): TimelineIndexMap {
  const indexes = Array.from({ length }, (_, index) => index);
  return { oldToNew: indexes, newToOld: indexes };
}

export function transactTimeline<T>(
  source: readonly T[],
  mutation: TimelineMutation<T>,
): TimelineTransactionResult<T> {
  if (mutation.type === "insert") {
    assertInteger(mutation.boundary, "Insert boundary");
    if (mutation.boundary < 0 || mutation.boundary > source.length) {
      throw new RangeError(`Insert boundary must be between 0 and ${source.length}`);
    }

    const oldToNew = source.map((_, index) =>
      index < mutation.boundary ? index : index + 1,
    );
    const newToOld = Array.from(
      { length: source.length + 1 },
      (_, index) => {
        if (index === mutation.boundary) return null;
        return index < mutation.boundary ? index : index - 1;
      },
    );

    return {
      items: [
        ...source.slice(0, mutation.boundary),
        mutation.item,
        ...source.slice(mutation.boundary),
      ],
      map: { oldToNew, newToOld },
      changed: true,
    };
  }

  if (mutation.type === "remove") {
    assertIndex(mutation.index, source.length, "Remove index");

    const oldToNew = source.map((_, index) => {
      if (index === mutation.index) return null;
      return index < mutation.index ? index : index - 1;
    });
    const newToOld = Array.from(
      { length: source.length - 1 },
      (_, index) => index < mutation.index ? index : index + 1,
    );

    return {
      items: source.filter((_, index) => index !== mutation.index),
      map: { oldToNew, newToOld },
      changed: true,
    };
  }

  assertIndex(mutation.from, source.length, "Move source");
  assertIndex(mutation.to, source.length, "Move destination");
  if (mutation.from === mutation.to) {
    return { items: source, map: identityIndexMap(source.length), changed: false };
  }

  const oldIndexes = Array.from({ length: source.length }, (_, index) => index);
  const [movedOldIndex] = oldIndexes.splice(mutation.from, 1);
  oldIndexes.splice(mutation.to, 0, movedOldIndex);

  const oldToNew = Array<number>(source.length);
  oldIndexes.forEach((oldIndex, newIndex) => {
    oldToNew[oldIndex] = newIndex;
  });

  return {
    items: oldIndexes.map((oldIndex) => source[oldIndex]),
    map: { oldToNew, newToOld: oldIndexes },
    changed: true,
  };
}

export function insertionBoundaryToMoveIndex(
  boundary: number,
  from: number,
  length: number,
): number {
  assertInteger(boundary, "Drop boundary");
  assertIndex(from, length, "Move source");
  if (boundary < 0 || boundary > length) {
    throw new RangeError(`Drop boundary must be between 0 and ${length}`);
  }
  return boundary > from ? boundary - 1 : boundary;
}

export function remapIndex(
  index: number | null,
  map: TimelineIndexMap,
): number | null {
  if (index === null) return null;
  assertIndex(index, map.oldToNew.length, "Remapped index");
  return map.oldToNew[index];
}

export function remapIndexedRecord<T>(
  record: Readonly<Record<number, T>>,
  map: TimelineIndexMap,
): Record<number, T> {
  const next: Record<number, T> = {};
  for (const [rawIndex, value] of Object.entries(record)) {
    const oldIndex = Number(rawIndex);
    if (!Number.isInteger(oldIndex) || oldIndex < 0 || oldIndex >= map.oldToNew.length) {
      continue;
    }
    const newIndex = map.oldToNew[oldIndex];
    if (newIndex !== null) next[newIndex] = value;
  }
  return next;
}

export function remapIndexedSet(
  set: ReadonlySet<number>,
  map: TimelineIndexMap,
): Set<number> {
  const next = new Set<number>();
  for (const oldIndex of set) {
    if (!Number.isInteger(oldIndex) || oldIndex < 0 || oldIndex >= map.oldToNew.length) {
      continue;
    }
    const newIndex = map.oldToNew[oldIndex];
    if (newIndex !== null) next.add(newIndex);
  }
  return next;
}
