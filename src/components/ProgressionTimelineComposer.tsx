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
import {
  getComposerDropBoundary,
  getComposerDropZone,
  type ComposerChipRect,
  type ComposerDropZone,
} from "./progressionTimelineComposerGeometry";

interface ProgressionTimelineComposerProps {
  items: readonly TimelineDraftItem<string>[];
  insertionBoundary: number;
  onInsertionBoundaryChange: (boundary: number) => void;
  onInsert: (chordName: string, boundary: number) => void;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

interface ComposerItemIdentity {
  readonly id: number | null;
  readonly item: TimelineDraftItem<string>;
}

interface ActivePointerDrag {
  readonly pointerId: number;
  readonly source: ComposerItemIdentity;
  readonly startX: number;
  readonly startY: number;
  dragging: boolean;
}

interface ActiveDragPresentation {
  readonly source: ComposerItemIdentity;
  readonly zone: ComposerDropZone;
}

const POINTER_DRAG_THRESHOLD_PX = 6;

function identifyItem(item: TimelineDraftItem<string>): ComposerItemIdentity {
  return { id: item.id, item };
}

function identityMatches(
  item: TimelineDraftItem<string>,
  identity: ComposerItemIdentity | null,
): boolean {
  if (!identity) return false;
  return identity.id === null ? identity.item === item : identity.id === item.id;
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
  const [selectedItem, setSelectedItem] = useState<ComposerItemIdentity | null>(null);
  const [activeDrag, setActiveDrag] = useState<ActiveDragPresentation | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const removeTargetRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef(new Map<number, HTMLButtonElement>());
  const activeDragItemRef = useRef<ComposerItemIdentity | null>(null);
  const activePointerDragRef = useRef<ActivePointerDrag | null>(null);
  const suppressPointerClickRef = useRef(false);

  function focusItem(index: number) {
    requestAnimationFrame(() => itemRefs.current.get(index)?.focus());
  }

  function moveItem(from: number, to: number) {
    if (from === to) return;
    const item = items[from];
    if (!item) return;
    setSelectedItem(identifyItem(item));
    onMove(from, to);
    setAnnouncement(
      t(`${item.value} moved to position ${to + 1} of ${items.length}.`),
    );
    focusItem(to);
  }

  function removeItem(index: number) {
    const item = items[index];
    if (!item) return;
    const nextIndex = items.length > 1 ? Math.min(index, items.length - 2) : null;
    const nextItem = nextIndex === null
      ? null
      : items[index + 1] ?? items[index - 1] ?? null;
    setSelectedItem(nextItem ? identifyItem(nextItem) : null);
    onRemove(index);
    setAnnouncement(t(`${item.value} removed from the progression.`));
    if (nextIndex === null) {
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      focusItem(nextIndex);
    }
  }

  function currentIndex(identity: ComposerItemIdentity | null): number | null {
    if (!identity) return null;
    const index = items.findIndex((item) => identityMatches(item, identity));
    return index >= 0 ? index : null;
  }

  function resetDrag() {
    activeDragItemRef.current = null;
    activePointerDragRef.current = null;
    setActiveDrag(null);
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
    const sourceIndex = currentIndex(activeDragItemRef.current);

    if (sourceIndex !== null) {
      const to = insertionBoundaryToMoveIndex(boundary, sourceIndex, items.length);
      moveItem(sourceIndex, to);
      onInsertionBoundaryChange(to + 1);
      resetDrag();
      return;
    }

    insertChord(event.dataTransfer.getData("text/plain"), boundary);
    resetDrag();
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
      source: identifyItem(items[sourceIndex]),
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
      activeDragItemRef.current = active.source;
      setActiveDrag({ source: active.source, zone: "invalid" });
    }

    event.preventDefault();
    const composer = composerRef.current;
    if (!composer) return;
    const zone = getComposerDropZone(
      composer.getBoundingClientRect(),
      removeTargetRef.current?.getBoundingClientRect() ?? null,
      event.clientX,
      event.clientY,
    );
    setActiveDrag((current) => current && current.zone !== zone
      ? { ...current, zone }
      : current);
    if (zone !== "composer") return;
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

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!active.dragging) {
      activePointerDragRef.current = null;
      return;
    }

    event.preventDefault();
    suppressPointerClickRef.current = true;
    window.setTimeout(() => {
      suppressPointerClickRef.current = false;
    }, 0);

    const composer = composerRef.current;
    if (!composer) {
      resetDrag();
      return;
    }
    const zone = getComposerDropZone(
      composer.getBoundingClientRect(),
      removeTargetRef.current?.getBoundingClientRect() ?? null,
      event.clientX,
      event.clientY,
    );
    const sourceIndex = currentIndex(active.source);
    if (sourceIndex === null) {
      resetDrag();
      return;
    }
    if (zone === "remove") {
      removeItem(sourceIndex);
      resetDrag();
      return;
    }
    if (zone !== "composer") {
      resetDrag();
      return;
    }
    const boundary = getComposerDropBoundary(
      composerRects(composer),
      event.clientX,
      event.clientY,
    );
    const to = insertionBoundaryToMoveIndex(
      boundary,
      sourceIndex,
      items.length,
    );
    moveItem(sourceIndex, to);
    onInsertionBoundaryChange(to + 1);
    if (to === sourceIndex) focusItem(sourceIndex);
    resetDrag();
  }

  function cancelPointerDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const active = activePointerDragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    suppressPointerClickRef.current = false;
    resetDrag();
  }

  function handleChipKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape" && activePointerDragRef.current) {
      event.preventDefault();
      if (event.currentTarget.hasPointerCapture(activePointerDragRef.current.pointerId)) {
        event.currentTarget.releasePointerCapture(activePointerDragRef.current.pointerId);
      }
      resetDrag();
      return;
    }
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
        {t("Type a chord and press Enter to add it. Select a chord to reveal its remove action, drag it inside to reorder, or drag it onto the removal target. Press Delete to remove a focused chord, or Alt plus an arrow key to move it.")}
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
          event.dataTransfer.dropEffect = activeDragItemRef.current !== null ? "move" : "copy";
          if (activeDragItemRef.current) {
            setActiveDrag({ source: activeDragItemRef.current, zone: "composer" });
          }
          const boundary = boundaryFromDrag(event);
          if (boundary !== insertionBoundary) onInsertionBoundaryChange(boundary);
        }}
        onDrop={handleDrop}
      >
        {items.map((item, index) => {
          const selected = identityMatches(item, selectedItem);
          return (
            <span
              key={item.id ?? `draft-${index}-${item.value}`}
              className="inline-flex min-w-0 items-center"
              data-composer-chip-shell={index}
            >
              <button
                ref={(node) => {
                  if (node) itemRefs.current.set(index, node);
                  else itemRefs.current.delete(index);
                }}
                type="button"
                draggable
                data-composer-chip-index={index}
                data-timeline-item-id={item.id ?? undefined}
                aria-label={t(`${item.value}, position ${index + 1} of ${items.length}`)}
                aria-pressed={selected}
                onKeyDown={(event) => handleChipKeyDown(event, index)}
                onFocus={() => setSelectedItem(identifyItem(item))}
                onPointerDown={(event) => beginPointerDrag(event, index)}
                onPointerMove={updatePointerDrag}
                onPointerUp={finishPointerDrag}
                onPointerCancel={cancelPointerDrag}
                onLostPointerCapture={cancelPointerDrag}
                onClick={(event) => {
                  if (suppressPointerClickRef.current) {
                    event.preventDefault();
                    event.stopPropagation();
                    suppressPointerClickRef.current = false;
                    return;
                  }
                  setSelectedItem(identifyItem(item));
                }}
                onDragStart={(event) => {
                  const source = identifyItem(item);
                  activeDragItemRef.current = source;
                  setSelectedItem(source);
                  setActiveDrag({ source, zone: "invalid" });
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.value);
                }}
                onDragEnd={resetDrag}
                className="hh-timeline-chip"
                style={{
                  minHeight: "var(--control-min-height)",
                  padding: "0 var(--space-3)",
                  cursor: "grab",
                  touchAction: "none",
                  fontFamily: "var(--font-mono)",
                  borderRadius: selected
                    ? "var(--radius-md) 0 0 var(--radius-md)"
                    : "var(--radius-md)",
                  boxShadow: insertionBoundary === index
                    ? "-3px 0 0 var(--interactive-accent-border)"
                    : undefined,
                }}
              >
                {item.value}
              </button>
              {selected ? (
                <button
                  type="button"
                  aria-label={t(`Remove ${item.value} at position ${index + 1}`)}
                  onClick={() => removeItem(index)}
                  className="inline-flex items-center justify-center"
                  style={{
                    width: "2rem",
                    minWidth: "2rem",
                    minHeight: "2rem",
                    alignSelf: "stretch",
                    marginLeft: "-1px",
                    color: "var(--interactive-accent-text)",
                    background: "var(--interactive-accent-bg)",
                    border: "1px solid var(--interactive-accent-border)",
                    borderRadius: "0 var(--radius-md) var(--radius-md) 0",
                    fontFamily: "var(--font-mono)",
                    fontWeight: "var(--weight-bold)",
                  }}
                >
                  X
                </button>
              ) : null}
            </span>
          );
        })}

        <label
          className="flex min-w-0 flex-1 items-center"
          style={{ minWidth: "min(14rem, 100%)" }}
        >
          <span className="sr-only">{t("Chord progression input")}</span>
          <input
            ref={inputRef}
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
            onFocus={() => {
              setSelectedItem(null);
              onInsertionBoundaryChange(items.length);
            }}
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
      {activeDrag ? (
        <div
          ref={removeTargetRef}
          role="status"
          aria-live="polite"
          data-testid="composer-remove-target"
          data-drop-active={activeDrag.zone === "remove" ? "true" : "false"}
          onDragOver={(event) => {
            if (!activeDragItemRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            event.dataTransfer.dropEffect = "move";
            setActiveDrag({ source: activeDragItemRef.current, zone: "remove" });
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const sourceIndex = currentIndex(activeDragItemRef.current);
            if (sourceIndex !== null) removeItem(sourceIndex);
            resetDrag();
          }}
          className="flex w-full min-w-0 items-center justify-center rounded-lg px-3 text-center"
          style={{
            minHeight: "var(--control-min-height)",
            color: activeDrag.zone === "remove"
              ? "var(--status-error-text)"
              : "var(--text-muted)",
            background: activeDrag.zone === "remove"
              ? "var(--status-error-bg)"
              : "var(--surface-raised)",
            border: `1px dashed ${activeDrag.zone === "remove"
              ? "var(--status-error-border)"
              : "var(--border-default)"}`,
            fontSize: "var(--text-sm)",
          }}
        >
          {t("Drop here to remove selected chord")}:&nbsp;
          <strong style={{ fontFamily: "var(--font-mono)" }}>
            {activeDrag.source.item.value}
          </strong>
        </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
