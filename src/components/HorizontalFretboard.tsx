import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useReducedMotion } from "framer-motion";
import type {
  FretboardInstrument,
  FretboardPatternResult,
  FretboardPosition,
  FretboardStringRow,
  FretboardTuning,
  DecoratedFretboardPosition,
} from "../lib/theory";
import { fretboardIntervalColor } from "./fretboardVisuals";
import { useLocale, useT } from "../i18n/I18nContext";

export type FretboardLabelMode = "intervals" | "notes";
export type FretboardHandedness = "right" | "left";

interface HorizontalFretboardProps {
  instrument: FretboardInstrument;
  tuning: FretboardTuning;
  handedness: FretboardHandedness;
  rows: ReadonlyArray<FretboardStringRow>;
  labelMode: FretboardLabelMode;
  pattern: FretboardPatternResult;
  decoratedPositions: ReadonlyArray<DecoratedFretboardPosition>;
  keyName: string;
  modeLabel: string;
  overlayLabel?: string;
}

interface ActivePosition {
  key: string;
  rowIndex: number;
  position: FretboardPosition;
  decoration: DecoratedFretboardPosition;
}

const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15]);
const RIGHT_HANDED_FRETS = Object.freeze(Array.from({ length: 16 }, (_, fret) => fret));
const LEFT_HANDED_FRETS = Object.freeze([...RIGHT_HANDED_FRETS].reverse());

function positionKey(rowIndex: number, fret: number): string {
  return `${rowIndex}:${fret}`;
}

function roleStyle(position: FretboardPosition): {
  backgroundColor: string;
  borderColor: string;
  color: string;
  boxShadow: string;
} {
  const intervalColor = fretboardIntervalColor(position.interval ?? -1);
  if (position.isRoot) {
    return {
      backgroundColor: intervalColor,
      borderColor: intervalColor,
      color: "var(--text-inverse)",
      boxShadow: "var(--glow-accent)",
    };
  }
  return {
    backgroundColor: `color-mix(in srgb, ${intervalColor} 14%, var(--surface-overlay))`,
    borderColor: `color-mix(in srgb, ${intervalColor} 46%, var(--surface-overlay))`,
    color: intervalColor,
    boxShadow: "none",
  };
}

export default function HorizontalFretboard({
  instrument,
  tuning,
  handedness,
  rows,
  labelMode,
  pattern,
  decoratedPositions,
  keyName,
  modeLabel,
  overlayLabel,
}: HorizontalFretboardProps) {
  const t = useT();
  const { locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const noteRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusWithinBoard = useRef(false);
  const visualFrets = handedness === "right" ? RIGHT_HANDED_FRETS : LEFT_HANDED_FRETS;
  const decorationByPosition = useMemo(
    () => new Map(decoratedPositions.map((decoration) => [decoration.key, decoration])),
    [decoratedPositions],
  );
  const activePositions = useMemo<ReadonlyArray<ActivePosition>>(
    () =>
      rows.flatMap((row, rowIndex) =>
        visualFrets.flatMap((fret) => {
          const position = row.positions[fret];
          const decoration = decorationByPosition.get(`${position.stringNumber}:${position.fret}`);
          return decoration
            ? [{ key: positionKey(rowIndex, position.fret), rowIndex, position, decoration }]
            : [];
        }),
      ),
    [rows, visualFrets, decorationByPosition],
  );
  const [activeFocusKey, setActiveFocusKey] = useState(() => activePositions[0]?.key ?? "");
  const resolvedFocusKey = activePositions.some((item) => item.key === activeFocusKey)
    ? activeFocusKey
    : activePositions[0]?.key ?? "";

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = handedness === "left"
      ? scroller.scrollWidth - scroller.clientWidth
      : 0;
  }, [handedness]);

  useLayoutEffect(() => {
    if (activeFocusKey === resolvedFocusKey || !focusWithinBoard.current) return;
    requestAnimationFrame(() => noteRefs.current.get(resolvedFocusKey)?.focus({ preventScroll: true }));
  }, [activeFocusKey, resolvedFocusKey]);

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
        const currentIndex = sameRow.findIndex((item) => item.key === current.key);
        const targetIndex = currentIndex + (event.key === "ArrowLeft" ? -1 : 1);
        target = sameRow[targetIndex];
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

      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
      }
      if (target) {
        moveFocus(target);
      }
    },
    [activePositions, moveFocus],
  );

  const instrumentName = instrument === "guitar" ? "Guitar" : "Bass";
  const handednessLabel = handedness === "right" ? "Right-handed" : "Left-handed";
  const viewHint = handedness === "right"
    ? "Right-handed view runs from open strings through fret 15. Use arrow keys between highlighted notes."
    : "Left-handed view runs from fret 15 to open strings. Use arrow keys between highlighted notes.";
  const compactViewHint = handedness === "right"
    ? "Right-handed compact view runs from open strings through fret 12. Use arrow keys between highlighted notes."
    : "Left-handed compact view runs from fret 12 to open strings. Use arrow keys between highlighted notes.";

  return (
    <div>
      <p
        className="mb-3 text-sm"
        style={{ color: "var(--text-muted)" }}
        id="fretboard-scroll-hint"
      >
        <span className="hh-fretboard-hint-full">{t(viewHint)}</span>
        <span className="hh-fretboard-hint-compact">{t(compactViewHint)}</span>
      </p>
      <div
        ref={scrollerRef}
        role="region"
        aria-label={locale === "ja"
          ? `${t(handednessLabel)}${t(instrumentName)}のフレットボード（${t(tuning.label)}チューニング）`
          : `${handednessLabel} ${instrumentName.toLowerCase()} fretboard in ${tuning.label} tuning`}
        aria-describedby="fretboard-scroll-hint"
        className="hh-fretboard-scroller w-full overflow-x-auto rounded-xl"
        data-testid="fretboard-scroller"
        data-reduced-motion={reduceMotion ? "true" : "false"}
        data-handedness={handedness}
        data-tuning={tuning.id}
        data-pattern={pattern.effectiveFamily}
        data-overlay={overlayLabel ?? "none"}
        onFocusCapture={() => {
          focusWithinBoard.current = true;
        }}
        onBlurCapture={(event) => {
          if (event.relatedTarget !== null
            && !event.currentTarget.contains(event.relatedTarget as Node)) {
            focusWithinBoard.current = false;
          }
        }}
        style={{
          border: "1px solid var(--border-default)",
          backgroundColor: "var(--surface-sunken)",
          scrollbarColor: "var(--border-strong) var(--surface-sunken)",
        }}
      >
        <div
          role="grid"
          aria-label={locale === "ja"
            ? `${t(handednessLabel)}${t(instrumentName)}のスケール・ポジション（${t(tuning.label)}チューニング）`
            : `${handednessLabel} ${instrumentName} scale positions in ${tuning.label} tuning`}
          className="hh-fretboard-grid p-3"
          data-testid="fretboard-grid"
        >
          <div
            role="row"
            className="hh-fretboard-row grid items-end"
            data-testid="fretboard-column-headers"
          >
            <span role="columnheader" />
            {visualFrets.map((fret) => (
              <span
                key={fret}
                role="columnheader"
                aria-label={fret === 0 ? t("OPEN") : String(fret)}
                className="hh-fretboard-header pb-2 text-center"
                data-fret-column={fret}
                data-open-column={fret === 0 ? "true" : undefined}
                style={{
                  color: fret === 0 ? "var(--text-warm)" : "var(--text-muted)",
                  backgroundColor: fret === 0 ? "var(--surface-raised)" : "transparent",
                  borderInline: fret === 0 ? "1px solid var(--border-strong)" : undefined,
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--text-xs)",
                }}
              >
                {fret === 0 ? (
                  <span className="hh-fretboard-open-label" aria-hidden="true">{t("OPEN")}</span>
                ) : fret}
              </span>
            ))}
          </div>

          {rows.map((row, rowIndex) => (
            <div
              key={`${row.string.number}-${row.string.registerLabel}`}
              role="row"
              className="hh-fretboard-row grid items-center"
            >
              <span
                role="rowheader"
                className="hh-fretboard-row-label pr-3 text-right"
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
              {visualFrets.map((fret) => {
                const position = row.positions[fret];
                const key = positionKey(rowIndex, position.fret);
                const active = activePositions.find((item) => item.key === key);
                const outsideScale = active !== undefined && !active.decoration.isInScale;
                const baseVisual = roleStyle(position);
                const visual = outsideScale ? {
                  backgroundColor: "var(--status-warning-bg)",
                  borderColor: "var(--status-warning-text)",
                  color: "var(--status-warning-text)",
                  boxShadow: "none",
                } : baseVisual;
                const chordSemantics = active?.decoration.chordTone
                  ? `, chord tone ${active.decoration.chordTone.degree}, ${active.decoration.isInScale ? "in scale" : `outside ${keyName} ${modeLabel}`}`
                  : "";
                const patternSemantics = active?.decoration.isPatternTone
                  ? `, ${pattern.label} pattern tone`
                  : pattern.effectiveFamily === "all"
                    ? ", visible across All positions"
                    : `, chord tone inside ${pattern.label} envelope`;
                const japaneseChordSemantics = active?.decoration.chordTone
                  ? `、コードトーン${active.decoration.chordTone.degree}、${active.decoration.isInScale ? "スケール内" : `${keyName}${modeLabel}スケール外`}`
                  : "";
                const japanesePatternSemantics = active?.decoration.isPatternTone
                  ? `、${t(pattern.label)}のパターン音`
                  : pattern.effectiveFamily === "all"
                    ? `、${t("All positions")}に表示`
                    : `、${t(pattern.label)}の範囲内のコードトーン`;
                return (
                  <span
                    key={key}
                    role="gridcell"
                    className="hh-fretboard-cell relative flex h-14 items-center justify-center"
                    data-fret={position.fret}
                    data-open-column={position.fret === 0 ? "true" : undefined}
                    style={{
                      borderLeft: handedness === "right" && position.fret === 0
                        ? "1px solid var(--border-accent)"
                        : "1px solid var(--border-default)",
                      borderRight: handedness === "left" && position.fret === 0
                        ? "1px solid var(--border-accent)"
                        : undefined,
                      backgroundColor: position.fret === 0
                        ? "var(--surface-raised)"
                        : position.fret % 2 === 0
                          ? "var(--surface-highlight)"
                          : "transparent",
                      boxShadow: position.fret === 0
                        ? "inset 0 0 0 1px var(--border-strong)"
                        : undefined,
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
                    {active && (
                      <button
                        ref={(node) => {
                          if (node) noteRefs.current.set(key, node);
                          else noteRefs.current.delete(key);
                        }}
                        type="button"
                        tabIndex={resolvedFocusKey === key ? 0 : -1}
                        onFocus={() => setActiveFocusKey(key)}
                        onKeyDown={(event) => handleKeyDown(event, active)}
                        aria-label={locale === "ja"
                          ? `${t(handednessLabel)}${t(instrumentName)}、${position.stringNumber}弦（${position.stringLabel}）、${t(tuning.label)}チューニング、${position.fret}フレット、${position.noteLabel}${position.intervalLabel ? `、音程${position.intervalLabel}` : ""}${japanesePatternSemantics}${japaneseChordSemantics}`
                          : `${handednessLabel} ${instrumentName} string ${position.stringNumber} (${position.stringLabel}), ${tuning.label} tuning, fret ${position.fret}, ${position.noteLabel}${position.intervalLabel ? `, interval ${position.intervalLabel}` : ""}${patternSemantics}${chordSemantics}`}
                        data-string={position.stringNumber}
                        data-fret={position.fret}
                        data-note={position.noteLabel}
                        data-interval={position.intervalLabel}
                        data-root={position.isRoot ? "true" : "false"}
                        data-pattern-tone={active.decoration.isPatternTone ? "true" : "false"}
                        data-chord-tone={active.decoration.isChordTone ? active.decoration.chordTone?.degree : undefined}
                        data-scale-fit={active.decoration.isChordTone ? (active.decoration.isInScale ? "in" : "outside") : undefined}
                        className="hh-fretboard-note relative z-10 flex items-center justify-center rounded-full"
                        style={{
                          ...visual,
                          borderWidth: outsideScale ? "2px" : "1px",
                          borderStyle: outsideScale ? "dashed" : "solid",
                          boxShadow: active.decoration.isChordTone && active.decoration.isInScale
                            ? `${visual.boxShadow === "none" ? "" : `${visual.boxShadow}, `}0 0 0 3px var(--surface-sunken), 0 0 0 5px var(--interactive-primary-bg)`
                            : visual.boxShadow,
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--text-xs)",
                          fontWeight: "var(--weight-semibold)",
                          transitionProperty: "transform, background-color, border-color",
                          transitionDuration: reduceMotion ? "0ms" : "var(--duration-fast)",
                        }}
                      >
                        <span className="hh-fretboard-note-label">
                          {outsideScale || labelMode === "notes" ? position.noteLabel : position.intervalLabel}
                        </span>
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          ))}

          <div
            aria-hidden="true"
            className="hh-fretboard-row grid"
          >
            <span />
            {visualFrets.map((fret) => (
              <span
                key={fret}
                className="hh-fretboard-marker flex h-6 items-center justify-center gap-1"
                data-fret={fret}
                data-fret-marker={MARKER_FRETS.has(fret) ? fret : undefined}
                data-double-marker={fret === 12 ? "true" : undefined}
                data-open-column={fret === 0 ? "true" : undefined}
                style={{
                  backgroundColor: fret === 0 ? "var(--surface-raised)" : "transparent",
                  borderInline: fret === 0 ? "1px solid var(--border-strong)" : undefined,
                }}
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
