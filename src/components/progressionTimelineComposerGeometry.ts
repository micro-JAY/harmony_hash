export interface ComposerChipRect {
  readonly index: number;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

interface ComposerRow {
  readonly top: number;
  readonly bottom: number;
  readonly chips: ComposerChipRect[];
}

export interface ComposerDropRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export type ComposerDropZone = "composer" | "outside";

function verticalDistance(row: ComposerRow, clientY: number): number {
  if (clientY < row.top) return row.top - clientY;
  if (clientY > row.bottom) return clientY - row.bottom;
  return 0;
}

function containsPoint(rect: ComposerDropRect, clientX: number, clientY: number): boolean {
  return clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
}

/** Resolve a pointer to a logical insertion boundary, including wrapped rows. */
export function getComposerDropBoundary(
  rects: readonly ComposerChipRect[],
  clientX: number,
  clientY: number,
): number {
  if (rects.length === 0) return 0;

  const ordered = [...rects].sort((a, b) => a.index - b.index);
  const rows: ComposerRow[] = [];
  for (const rect of ordered) {
    const row = rows.find(
      (candidate) => rect.top <= candidate.bottom && rect.bottom >= candidate.top,
    );
    if (row) {
      row.chips.push(rect);
      continue;
    }
    rows.push({ top: rect.top, bottom: rect.bottom, chips: [rect] });
  }

  const closestRow = rows.reduce((closest, row) =>
    verticalDistance(row, clientY) < verticalDistance(closest, clientY) ? row : closest,
  );
  const rowChips = [...closestRow.chips].sort((a, b) => a.left - b.left);
  const nextChip = rowChips.find((rect) => clientX < (rect.left + rect.right) / 2);
  return nextChip?.index ?? rowChips[rowChips.length - 1].index + 1;
}

/** Distinguish exact inside-composer drops from deliberate outside releases. */
export function getComposerDropZone(
  composerRect: ComposerDropRect,
  clientX: number,
  clientY: number,
): ComposerDropZone {
  if (containsPoint(composerRect, clientX, clientY)) return "composer";
  return "outside";
}
