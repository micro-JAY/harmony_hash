import {
  useId,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useT } from "../i18n/I18nContext";
import { lookupChord } from "../lib/chordData";
import type { TimelineDraftItem } from "../lib/timelineTransactions";
import { insertionBoundaryToMoveIndex } from "../lib/timelineTransactions";

interface ProgressionTimelineComposerProps {
  items: readonly TimelineDraftItem<string>[];
  insertionBoundary: number;
  onInsertionBoundaryChange: (boundary: number) => void;
  onInsert: (chordName: string, boundary: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

interface ComposerChipRect {
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

interface ActivePointerDrag {
  readonly pointerId: number;
  readonly sourceIndex: number;
  readonly startX: number;
  readonly startY: number;
  dragging: boolean;
}

const POINTER_DRAG_THRESHOLD_PX = 6;

function verticalDistance(row: ComposerRow, clientY: number): number {
  if (clientY < row.top) return row.top - clientY;
  if (clientY > row.bottom) return clientY - row.bottom;
  return 0;
}

/** Resolve a pointer to a logical insertion boundary, including wrapped rows. */
// Exported for deterministic geometry tests; it has no component state.
// eslint-disable-next-line react-refresh/only-export-components
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

export default function ProgressionTimelineComposer({
  items,
  insertionBoundary,
  onInsertionBoundaryChange,
  onInsert,
  onMove,
  onRemove,
}: ProgressionTimelineComposerProps) {
  const t = useT();
  const instructionsId = useId();
  const [announcement, setAnnouncement] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [inputInvalid, setInputInvalid] = useState(false);
  const composerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const activeDragIndexRef = useRef<number | null>(null);
  const activePointerDragRef = useRef<ActivePointerDrag | null>(null);
  const suppressPointerClickRef = useRef(false);

  function focusItem(index: number) {
    requestAnimationFrame(() => itemRefs.current.get(index)?.focus());
  }

  function moveItem(from: number, to: number) {
    if (from === to) return;
    const item = items[from];
    if (!item) return;
    onMove(from, to);
    setAnnouncement(
      t(`${item.value} moved to position ${to + 1} of ${items.length}.`),
    );
    focusItem(to);
  }

  function removeItem(index: number) {
    const item = items[index];
    if (!item) return;
    onRemove(index);
    setAnnouncement(t(`${item.value} removed from the progression.`));
    if (items.length > 1) focusItem(Math.min(index, items.length - 2));
  }

  function insertChord(chordName: string, boundary: number) {
    const trimmed = chordName.trim();
    if (!trimmed || !lookupChord(trimmed)) {
      setInputInvalid(true);
      setAnnouncement(t(`Could not resolve: "${trimmed}"`));
      return false;
    }

    onInsert(trimmed, boundary);
    onInsertionBoundaryChange(boundary + 1);
    setInputInvalid(false);
    setAnnouncement(t(`${trimmed} inserted at position ${boundary + 1}.`));
    return true;
  }

  function composerRects(container: HTMLDivElement): ComposerChipRect[] {
    return Array.from(
      container.querySelectorAll<HTMLElement>("[data-composer-chip-index]"),
      (element) => {
        const rect = element.getBoundingClientRect();
        return {
          index: Number(element.dataset.composerChipIndex),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
        };
      },
    );
  }

  function boundaryFromDrag(event: DragEvent<HTMLDivElement>) {
    return getComposerDropBoundary(
      composerRects(event.currentTarget),
      event.clientX,
      event.clientY,
    );
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const boundary = boundaryFromDrag(event);
    const sourceIndex = activeDragIndexRef.current;
    activeDragIndexRef.current = null;

    if (sourceIndex !== null) {
      const to = insertionBoundaryToMoveIndex(boundary, sourceIndex, items.length);
      moveItem(sourceIndex, to);
      onInsertionBoundaryChange(to + 1);
      return;
    }

    insertChord(event.dataTransfer.getData("text/plain"), boundary);
  }

  function beginPointerDrag(
    event: ReactPointerEvent<HTMLButtonElement>,
    sourceIndex: number,
  ) {
    // Mouse users retain the browser's native drag-and-drop path. Pointer
    // capture fills the gap for touch and pen, where HTML dragging is absent.
    if (event.pointerType === "mouse" || !event.isPrimary || event.button !== 0) return;
    activePointerDragRef.current = {
      pointerId: event.pointerId,
      sourceIndex,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
    suppressPointerClickRef.current = false;
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function updatePointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = activePointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;

    if (!active.dragging) {
      const distance = Math.hypot(
        event.clientX - active.startX,
        event.clientY - active.startY,
      );
      if (distance < POINTER_DRAG_THRESHOLD_PX) return;
      active.dragging = true;
    }

    event.preventDefault();
    const composer = composerRef.current;
    if (!composer) return;
    const boundary = getComposerDropBoundary(
      composerRects(composer),
      event.clientX,
      event.clientY,
    );
    if (boundary !== insertionBoundary) onInsertionBoundaryChange(boundary);
  }

  function finishPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = activePointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activePointerDragRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!active.dragging) return;

    event.preventDefault();
    suppressPointerClickRef.current = true;
    window.setTimeout(() => {
      suppressPointerClickRef.current = false;
    }, 0);

    const composer = composerRef.current;
    if (!composer) return;
    const boundary = getComposerDropBoundary(
      composerRects(composer),
      event.clientX,
      event.clientY,
    );
    const to = insertionBoundaryToMoveIndex(
      boundary,
      active.sourceIndex,
      items.length,
    );
    moveItem(active.sourceIndex, to);
    onInsertionBoundaryChange(to + 1);
    if (to === active.sourceIndex) focusItem(active.sourceIndex);
  }

  function cancelPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = activePointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activePointerDragRef.current = null;
    suppressPointerClickRef.current = false;
  }

  function handleChipKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeItem(index);
      return;
    }
    if (!event.altKey) return;
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      moveItem(index, index - 1);
    } else if (event.key === "ArrowRight" && index < items.length - 1) {
      event.preventDefault();
      moveItem(index, index + 1);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p id={instructionsId} className="sr-only">
        {t("Type a chord and press Enter to add it. Drag chords to reorder them. Press Delete to remove a focused chord, or Alt plus an arrow key to move it.")}
      </p>
      <div
        ref={composerRef}
        role="group"
        aria-label={t("Chord progression composer")}
        aria-describedby={instructionsId}
        data-testid="chord-composer"
        className="hh-composer flex w-full min-w-0 flex-wrap items-center gap-2"
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = activeDragIndexRef.current !== null ? "move" : "copy";
          const boundary = boundaryFromDrag(event);
          if (boundary !== insertionBoundary) onInsertionBoundaryChange(boundary);
        }}
        onDrop={handleDrop}
      >
        {items.map((item, index) => (
          <button
            key={item.id ?? `draft-${index}-${item.value}`}
            ref={(node) => {
              if (node) itemRefs.current.set(index, node);
              else itemRefs.current.delete(index);
            }}
            type="button"
            draggable
            data-composer-chip-index={index}
            data-timeline-item-id={item.id ?? undefined}
            aria-label={t(`${item.value}, position ${index + 1} of ${items.length}`)}
            onKeyDown={(event) => handleChipKeyDown(event, index)}
            onPointerDown={(event) => beginPointerDrag(event, index)}
            onPointerMove={updatePointerDrag}
            onPointerUp={finishPointerDrag}
            onPointerCancel={cancelPointerDrag}
            onLostPointerCapture={cancelPointerDrag}
            onClick={(event) => {
              if (!suppressPointerClickRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              suppressPointerClickRef.current = false;
            }}
            onDragStart={(event) => {
              activeDragIndexRef.current = index;
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", item.value);
            }}
            onDragEnd={() => {
              activeDragIndexRef.current = null;
            }}
            className="hh-timeline-chip"
            style={{
              minHeight: "var(--control-min-height)",
              padding: "0 var(--space-3)",
              cursor: "grab",
              touchAction: "none",
              fontFamily: "var(--font-mono)",
              boxShadow: insertionBoundary === index
                ? "-3px 0 0 var(--interactive-accent-border)"
                : undefined,
            }}
          >
            {item.value}
          </button>
        ))}

        <label
          className="flex min-w-0 flex-1 items-center"
          style={{ minWidth: "min(14rem, 100%)" }}
        >
          <span className="sr-only">{t("Chord progression input")}</span>
          <input
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              setInputInvalid(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                if (insertChord(inputValue, items.length)) setInputValue("");
              } else if (event.key === "Backspace" && inputValue.length === 0 && items.length > 0) {
                event.preventDefault();
                removeItem(items.length - 1);
              }
            }}
            onFocus={() => onInsertionBoundaryChange(items.length)}
            placeholder={items.length === 0
              ? t("Type a chord or choose one below")
              : t("Add another chord")}
            aria-invalid={inputInvalid}
            className="min-w-0 flex-1 bg-transparent px-2 outline-none"
            style={{
              minHeight: "var(--control-min-height)",
              color: inputInvalid ? "var(--status-error-text)" : "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              border: 0,
            }}
          />
        </label>
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
