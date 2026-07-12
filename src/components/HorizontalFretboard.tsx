import { useCallback, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import type {
  FretboardInstrument,
  FretboardPosition,
  FretboardStringRow,
} from "../lib/theory";

export type FretboardLabelMode = "intervals" | "notes";

interface HorizontalFretboardProps {
  instrument: FretboardInstrument;
  rows: ReadonlyArray<FretboardStringRow>;
  labelMode: FretboardLabelMode;
}

interface ActivePosition {
  key: string;
  rowIndex: number;
  position: FretboardPosition;
}

const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15]);
const BOARD_COLUMNS = "64px repeat(16, 64px)";

function positionKey(rowIndex: number, fret: number): string {
  return `${rowIndex}:${fret}`;
}

function roleStyle(position: FretboardPosition): {
  backgroundColor: string;
  borderColor: string;
  color: string;
  boxShadow: string;
} {
  if (position.isRoot) {
    return {
      backgroundColor: "var(--interactive-accent-text)",
      borderColor: "var(--interactive-accent-text)",
      color: "var(--text-inverse)",
      boxShadow: "var(--glow-accent)",
    };
  }
  if (position.interval === 3 || position.interval === 4) {
    return {
      backgroundColor: "var(--interactive-warm-bg)",
      borderColor: "var(--interactive-warm-border)",
      color: "var(--interactive-warm-text)",
      boxShadow: "none",
    };
  }
  if (position.interval === 7) {
    return {
      backgroundColor: "var(--interactive-academy-bg)",
      borderColor: "var(--interactive-academy-border)",
      color: "var(--interactive-academy-text)",
      boxShadow: "none",
    };
  }
  if (position.interval === 10 || position.interval === 11) {
    return {
      backgroundColor: "var(--interactive-soft-bg)",
      borderColor: "var(--interactive-soft-border)",
      color: "var(--interactive-soft-text)",
      boxShadow: "none",
    };
  }
  return {
    backgroundColor: "var(--surface-overlay)",
    borderColor: "var(--border-strong)",
    color: "var(--text-primary)",
    boxShadow: "none",
  };
}

export default function HorizontalFretboard({
  instrument,
  rows,
  labelMode,
}: HorizontalFretboardProps) {
  const reduceMotion = useReducedMotion();
  const noteRefs = useRef(new Map<string, HTMLButtonElement>());
  const activePositions = useMemo<ReadonlyArray<ActivePosition>>(
    () =>
      rows.flatMap((row, rowIndex) =>
        row.positions.flatMap((position) =>
          position.isScaleTone
            ? [{ key: positionKey(rowIndex, position.fret), rowIndex, position }]
            : [],
        ),
      ),
    [rows],
  );
  const [activeFocusKey, setActiveFocusKey] = useState(() => activePositions[0]?.key ?? "");
  const resolvedFocusKey = activePositions.some((item) => item.key === activeFocusKey)
    ? activeFocusKey
    : activePositions[0]?.key ?? "";

  const moveFocus = useCallback((target: ActivePosition | undefined) => {
    if (!target) return;
    setActiveFocusKey(target.key);
    requestAnimationFrame(() => {
      noteRefs.current.get(target.key)?.focus({ preventScroll: true });
      noteRefs.current.get(target.key)?.scrollIntoView({
        behavior: "auto",
        block: "nearest",
        inline: "nearest",
      });
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, current: ActivePosition) => {
      let target: ActivePosition | undefined;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        const sameRow = activePositions.filter((item) => item.rowIndex === current.rowIndex);
        target = event.key === "ArrowLeft"
          ? sameRow.filter((item) => item.position.fret < current.position.fret).at(-1)
          : sameRow.find((item) => item.position.fret > current.position.fret);
      } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const rowDelta = event.key === "ArrowUp" ? -1 : 1;
        const targetRow = current.rowIndex + rowDelta;
        target = activePositions
          .filter((item) => item.rowIndex === targetRow)
          .sort((a, b) => {
            const distance = Math.abs(a.position.fret - current.position.fret)
              - Math.abs(b.position.fret - current.position.fret);
            return distance || a.position.fret - b.position.fret;
          })[0];
      }

      if (target) {
        event.preventDefault();
        moveFocus(target);
      }
    },
    [activePositions, moveFocus],
  );

  const instrumentName = instrument === "guitar" ? "Guitar" : "Bass";

  return (
    <div>
      <p
        className="mb-3 text-sm"
        style={{ color: "var(--text-muted)" }}
        id="fretboard-scroll-hint"
      >
        Scroll sideways to travel from open strings through fret 15. Use arrow keys between highlighted notes.
      </p>
      <div
        role="region"
        aria-label={`Horizontal ${instrumentName.toLowerCase()} fretboard`}
        aria-describedby="fretboard-scroll-hint"
        className="w-full overflow-x-auto rounded-xl"
        data-testid="fretboard-scroller"
        data-reduced-motion={reduceMotion ? "true" : "false"}
        style={{
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--surface-sunken)",
          scrollbarColor: "var(--border-strong) var(--surface-sunken)",
        }}
      >
        <div
          role="grid"
          aria-label={`${instrumentName} scale positions`}
          className="p-3"
          style={{ minWidth: "1088px" }}
        >
          <div
            role="row"
            className="grid items-end"
            style={{ gridTemplateColumns: BOARD_COLUMNS }}
          >
            <span role="columnheader" />
            {Array.from({ length: 16 }, (_, fret) => (
              <span
                key={fret}
                role="columnheader"
                className="pb-2 text-center"
                style={{
                  color: fret === 0 ? "var(--text-warm)" : "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {fret === 0 ? "OPEN" : fret}
              </span>
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div
              key={`${row.string.number}-${row.string.registerLabel}`}
              role="row"
              className="grid items-center"
              style={{ gridTemplateColumns: BOARD_COLUMNS }}
            >
              <span
                role="rowheader"
                className="pr-3 text-right"
                style={{
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {row.string.openNote}
                <span className="block" style={{ color: "var(--text-muted)", fontSize: "10px" }}>
                  {row.string.number}
                </span>
              </span>
              {row.positions.map((position) => {
                const key = positionKey(rowIndex, position.fret);
                const active = activePositions.find((item) => item.key === key);
                const visual = roleStyle(position);
                return (
                  <span
                    key={key}
                    role="gridcell"
                    className="relative flex h-14 items-center justify-center"
                    style={{
                      borderLeft: position.fret === 0
                        ? "1px solid var(--border-accent)"
                        : "1px solid var(--border-default)",
                      backgroundColor: position.fret % 2 === 0
                        ? "var(--surface-highlight)"
                        : "transparent",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-1/2"
                      style={{
                        height: `${Math.max(1, rows.length - rowIndex)}px`,
                        backgroundColor: "var(--border-strong)",
                        transform: "translateY(-50%)",
                      }}
                    />
                    {position.isScaleTone && active && (
                      <button
                        ref={(node) => {
                          if (node) noteRefs.current.set(key, node);
                          else noteRefs.current.delete(key);
                        }}
                        type="button"
                        tabIndex={resolvedFocusKey === key ? 0 : -1}
                        onFocus={() => setActiveFocusKey(key)}
                        onKeyDown={(event) => handleKeyDown(event, active)}
                        aria-label={`${instrumentName} string ${position.stringNumber} (${position.stringLabel}), fret ${position.fret}, ${position.noteLabel}, interval ${position.intervalLabel}`}
                        data-string={position.stringNumber}
                        data-fret={position.fret}
                        data-note={position.noteLabel}
                        data-interval={position.intervalLabel}
                        data-root={position.isRoot ? "true" : "false"}
                        className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full"
                        style={{
                          ...visual,
                          borderWidth: "1px",
                          borderStyle: "solid",
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--weight-semibold)",
                          transitionProperty: "transform, background-color, border-color",
                          transitionDuration: reduceMotion ? "0ms" : "var(--duration-fast)",
                        }}
                      >
                        {labelMode === "intervals" ? position.intervalLabel : position.noteLabel}
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          ))}

          <div
            aria-hidden="true"
            className="grid"
            style={{ gridTemplateColumns: BOARD_COLUMNS }}
          >
            <span />
            {Array.from({ length: 16 }, (_, fret) => (
              <span
                key={fret}
                className="flex h-6 items-center justify-center gap-1"
                data-fret-marker={MARKER_FRETS.has(fret) ? fret : undefined}
                data-double-marker={fret === 12 ? "true" : undefined}
              >
                {MARKER_FRETS.has(fret) && (
                  <>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: "var(--text-muted)" }}
                    />
                    {fret === 12 && (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: "var(--text-muted)" }}
                      />
                    )}
                  </>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
