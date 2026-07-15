import { ChevronLeft, ChevronRight, GripVertical, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import type { TimelineDraftItem } from "../lib/timelineTransactions";
import { insertionBoundaryToMoveIndex } from "../lib/timelineTransactions";
import { useT } from "../i18n/I18nContext";

interface ProgressionTimelineComposerProps {
  items: readonly TimelineDraftItem<string>[];
  insertionBoundary: number;
  onInsertionBoundaryChange: (boundary: number) => void;
  onInsert: (chordName: string, boundary: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

export default function ProgressionTimelineComposer({
  items,
  insertionBoundary,
  onInsertionBoundaryChange,
  onInsert,
  onMove,
  onRemove,
  onClear,
}: ProgressionTimelineComposerProps) {
  const t = useT();
  const [announcement, setAnnouncement] = useState("");
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const activeDragIndexRef = useRef<number | null>(null);

  function focusMovedItem(index: number) {
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
    focusMovedItem(to);
  }

  function handleBoundaryDrop(event: DragEvent<HTMLButtonElement>, boundary: number) {
    event.preventDefault();
    const sourceIndex = activeDragIndexRef.current;
    activeDragIndexRef.current = null;
    if (sourceIndex !== null) {
      const from = sourceIndex;
      const to = insertionBoundaryToMoveIndex(boundary, from, items.length);
      moveItem(from, to);
      onInsertionBoundaryChange(to + 1);
      return;
    }

    const chordName = event.dataTransfer.getData("text/plain").trim();
    if (chordName) {
      onInsert(chordName, boundary);
      setAnnouncement(
        t(`${chordName} inserted at position ${boundary + 1}.`),
      );
      onInsertionBoundaryChange(boundary + 1);
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <div
        role="list"
        aria-label={t("Chord progression composer")}
        data-testid="chord-composer"
        className="hh-composer flex w-full min-w-0 flex-wrap items-center gap-1"
      >
        {items.map((item, index) => (
          <div key={item.id ?? `draft-${index}-${item.value}`} className="contents">
            <button
              type="button"
              aria-label={t(`Insert chord at position ${index + 1}`)}
              aria-pressed={insertionBoundary === index}
              data-testid="timeline-insertion-slot"
              onClick={() => onInsertionBoundaryChange(index)}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = activeDragIndexRef.current !== null
                  ? "move"
                  : "copy";
              }}
              onDrop={(event) => handleBoundaryDrop(event, index)}
              className="hh-insertion-slot"
            >
              <span aria-hidden>+</span>
            </button>

            <div
              role="listitem"
              draggable
              onDragStart={(event) => {
                activeDragIndexRef.current = index;
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", item.value);
              }}
              onDragEnd={() => {
                activeDragIndexRef.current = null;
              }}
              className="hh-timeline-chip"
              data-timeline-item-id={item.id ?? undefined}
            >
              <button
                ref={(node) => {
                  if (node) itemRefs.current.set(index, node);
                  else itemRefs.current.delete(index);
                }}
                type="button"
                aria-label={t(`Move ${item.value}`)}
                title={t("Drag to move chord")}
                className="hh-timeline-chip__handle"
              >
                <GripVertical size={14} aria-hidden="true" />
                <span>{item.value}</span>
              </button>
              <button
                type="button"
                aria-label={t(`Move ${item.value} before`)}
                title={t("Move before")}
                disabled={index === 0}
                onClick={() => moveItem(index, index - 1)}
                className="hh-timeline-chip__action"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t(`Move ${item.value} after`)}
                title={t("Move after")}
                disabled={index === items.length - 1}
                onClick={() => moveItem(index, index + 1)}
                className="hh-timeline-chip__action"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t(`Remove ${item.value} at position ${index + 1}`)}
                title={t("Remove chord")}
                onClick={() => onRemove(index)}
                className="hh-timeline-chip__action"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}

        <button
          type="button"
          aria-label={t(`Insert chord at position ${items.length + 1}`)}
          aria-pressed={insertionBoundary === items.length}
          data-testid="timeline-insertion-slot"
          onClick={() => onInsertionBoundaryChange(items.length)}
          onDragOver={(event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = activeDragIndexRef.current !== null
              ? "move"
              : "copy";
          }}
          onDrop={(event) => handleBoundaryDrop(event, items.length)}
          className="hh-insertion-slot"
        >
          <span aria-hidden>+</span>
        </button>

        {items.length === 0 ? (
          <span className="px-2" style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
            {t("Choose chords from the grid, type them below, or drag them to an insertion slot.")}
          </span>
        ) : (
          <button
            type="button"
            aria-label={t("Clear composed chords")}
            onClick={onClear}
            className="ml-auto rounded-md px-2 py-1 text-xs"
            style={{
              minHeight: "var(--control-min-height)",
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontFamily: "var(--font-body)",
            }}
          >
            {t("Clear")}
          </button>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
