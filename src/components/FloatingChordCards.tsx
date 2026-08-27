import {
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { GripHorizontal, X } from "lucide-react";
import {
  useMemo,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { computeVoicingForStyle } from "../lib/harmonyBrain";
import { lookupChord, parseNotes } from "../lib/chordData";
import type { Instrument, VoicingStyle } from "../lib/types";
import type { ChordModifierOption } from "../lib/chordModifiers";
import type { HarmonyContext } from "../lib/theory";
import { useT } from "../i18n/I18nContext";
import ChordCard from "./ChordCard";
import type { ChordPreviewRequest } from "./chordPreviewIntent";
import {
  createFloatingChordCard,
  floatingChordCardClampOffset,
  floatingChordCardPosition,
  floatingChordCardsReducer,
  type FloatingChordCard,
  type FloatingViewport,
} from "./floatingChordCardsState";

const FLOATING_CARD_SURFACE_STYLE = {
  borderRadius: "var(--radius-xl)",
  boxShadow: "var(--shadow-lg)",
} satisfies CSSProperties;

const FLOATING_CARD_CONTROLS_STYLE = {
  backgroundColor: "var(--surface-overlay)",
  border: "1px solid var(--border-default)",
  borderBottom: 0,
  borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
} satisfies CSSProperties;

const FLOATING_CARD_BUTTON_STYLE = {
  color: "var(--text-secondary)",
  backgroundColor: "var(--interactive-secondary-bg)",
  border: "1px solid var(--interactive-secondary-border)",
  borderRadius: "var(--radius-sm)",
} satisfies CSSProperties;

const FLOATING_CARD_PIN_TARGET_STYLE = {
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: "var(--radius-xl)",
} satisfies CSSProperties;

interface FloatingChordCardsProps {
  readonly instrument: Instrument;
  readonly harmonyContext: HarmonyContext;
  readonly preview: ChordPreviewRequest | null;
  readonly onPreviewEnter: () => void;
  readonly onPreviewLeave: () => void;
  readonly onPreviewDismiss: () => void;
}

interface FloatingCardBodyProps {
  readonly card: FloatingChordCard;
  readonly harmonyContext: HarmonyContext;
  readonly onVariantChange: (variant: number) => void;
  readonly onPianoStyleChange: (style: VoicingStyle) => void;
  readonly onChordChange: (option: ChordModifierOption) => void;
}

function viewportBounds() {
  if (typeof window === "undefined") {
    return { width: 1_280, height: 800, offsetLeft: 0, offsetTop: 0 };
  }
  const visualViewport = window.visualViewport;
  if (visualViewport
    && [
      visualViewport.width,
      visualViewport.height,
      visualViewport.offsetLeft,
      visualViewport.offsetTop,
    ].every(Number.isFinite)
    && visualViewport.width > 0
    && visualViewport.height > 0) {
    return {
      width: visualViewport.width,
      height: visualViewport.height,
      offsetLeft: visualViewport.offsetLeft,
      offsetTop: visualViewport.offsetTop,
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetLeft: 0,
    offsetTop: 0,
  };
}

function sameViewport(first: FloatingViewport, second: FloatingViewport): boolean {
  return first.width === second.width
    && first.height === second.height
    && first.offsetLeft === second.offsetLeft
    && first.offsetTop === second.offsetTop;
}

function useLiveViewportBounds(): FloatingViewport {
  const [viewport, setViewport] = useState<FloatingViewport>(viewportBounds);
  useEffect(() => {
    const updateViewport = () => {
      const next = viewportBounds();
      setViewport((current) => sameViewport(current, next) ? current : next);
    };
    const visualViewport = window.visualViewport;
    updateViewport();
    window.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("resize", updateViewport);
    visualViewport?.addEventListener("scroll", updateViewport);
    return () => {
      window.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("resize", updateViewport);
      visualViewport?.removeEventListener("scroll", updateViewport);
    };
  }, []);
  return viewport;
}

function floatingViewportStyle(viewport: FloatingViewport): CSSProperties {
  return {
    "--floating-chord-card-visual-width": `${viewport.width}px`,
    "--floating-chord-card-visual-height": `${viewport.height}px`,
  } as CSSProperties;
}

function FloatingCardBody({
  card,
  harmonyContext,
  onVariantChange,
  onPianoStyleChange,
  onChordChange,
}: FloatingCardBodyProps) {
  const voicing = useMemo(
    () => computeVoicingForStyle(parseNotes(card.chord.entry), card.pianoStyle),
    [card.chord, card.pianoStyle],
  );

  return (
    <ChordCard
      chord={card.chord}
      instrument={card.instrument}
      displayName={card.displayName}
      variant={card.variant}
      onVariantChange={onVariantChange}
      isLocked={false}
      onToggleLock={() => undefined}
      showLock={false}
      voicing={voicing}
      pianoStyle={card.pianoStyle}
      onPianoStyleChange={onPianoStyleChange}
      onChordChange={onChordChange}
      harmonyContext={harmonyContext}
      timelineIndex={0}
      timelineChords={[card.chord]}
    />
  );
}

interface PinnedChordCardProps {
  readonly card: FloatingChordCard;
  readonly viewport: FloatingViewport;
  readonly harmonyContext: HarmonyContext;
  readonly constraintsRef: RefObject<HTMLDivElement | null>;
  readonly onAction: (action: Parameters<typeof floatingChordCardsReducer>[1]) => void;
}

function PinnedChordCard({
  card,
  viewport,
  harmonyContext,
  constraintsRef,
  onAction,
}: PinnedChordCardProps) {
  const t = useT();
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();
  const cardRef = useRef<HTMLElement>(null);
  const clampFrameRef = useRef<number | null>(null);
  const [positionCorrection, setPositionCorrection] = useState({ x: 0, y: 0 });

  const clampToViewport = useCallback(() => {
    if (clampFrameRef.current !== null) {
      window.cancelAnimationFrame(clampFrameRef.current);
    }
    clampFrameRef.current = window.requestAnimationFrame(() => {
      clampFrameRef.current = null;
      const node = cardRef.current;
      if (!node) return;
      const offset = floatingChordCardClampOffset(
        node.getBoundingClientRect(),
        viewport,
      );
      if (offset.x === 0 && offset.y === 0) return;
      // Shift the absolute base without replacing Motion's user-controlled drag transform.
      setPositionCorrection((current) => ({
        x: current.x + offset.x,
        y: current.y + offset.y,
      }));
    });
  }, [viewport]);

  useEffect(() => {
    clampToViewport();
    const resizeObserver = new ResizeObserver(clampToViewport);
    if (cardRef.current) resizeObserver.observe(cardRef.current);
    return () => {
      resizeObserver.disconnect();
      if (clampFrameRef.current !== null) {
        window.cancelAnimationFrame(clampFrameRef.current);
      }
    };
  }, [clampToViewport]);

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    dragControls.start(event, { distanceThreshold: 3 });
  }

  return (
    <motion.article
      ref={cardRef}
      drag
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={clampToViewport}
      whileDrag={shouldReduceMotion ? undefined : { scale: 1.01 }}
      data-testid="pinned-chord-card"
      data-chord-name={card.displayName}
      data-instrument={card.instrument}
      className="hh-floating-chord-card"
      style={{
        ...FLOATING_CARD_SURFACE_STYLE,
        ...floatingViewportStyle(viewport),
        left: card.initialPosition.x + positionCorrection.x,
        top: card.initialPosition.y + positionCorrection.y,
        zIndex: 60 + card.id,
      }}
    >
      <div className="hh-floating-chord-card__controls" style={FLOATING_CARD_CONTROLS_STYLE}>
        <button
          type="button"
          onPointerDown={startDrag}
          aria-label={`${t("Move pinned chord card")}: ${card.displayName}`}
          title={t("Move pinned chord card")}
          className="hh-floating-chord-card__handle"
          style={{ ...FLOATING_CARD_BUTTON_STYLE, touchAction: "none" }}
        >
          <GripHorizontal size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "dismiss", id: card.id })}
          aria-label={`${t("Dismiss pinned chord card")}: ${card.displayName}`}
          title={t("Dismiss pinned chord card")}
          className="hh-floating-chord-card__dismiss"
          style={FLOATING_CARD_BUTTON_STYLE}
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>
      <FloatingCardBody
        card={card}
        harmonyContext={harmonyContext}
        onVariantChange={(variant) => onAction({
          type: "set-variant",
          id: card.id,
          variant,
        })}
        onPianoStyleChange={(style) => onAction({
          type: "set-piano-style",
          id: card.id,
          style,
        })}
        onChordChange={(option) => onAction({
          type: "set-chord",
          id: card.id,
          chord: option.chord,
          displayName: option.label,
        })}
      />
    </motion.article>
  );
}

export default function FloatingChordCards({
  instrument,
  harmonyContext,
  preview,
  onPreviewEnter,
  onPreviewLeave,
  onPreviewDismiss,
}: FloatingChordCardsProps) {
  const t = useT();
  const shouldReduceMotion = useReducedMotion();
  const viewport = useLiveViewportBounds();
  const constraintsRef = useRef<HTMLDivElement>(null);
  const nextPinIdRef = useRef(1);
  const [cards, dispatch] = useReducer(floatingChordCardsReducer, []);
  const previewChord = preview ? lookupChord(preview.chordName) : undefined;
  if (preview && !previewChord) {
    throw new Error(`Chord preview is unavailable: ${preview.chordName}`);
  }
  const previewCard = preview && previewChord
    ? createFloatingChordCard(
        1,
        previewChord,
        preview.chordName,
        instrument,
        preview.point,
        viewport,
      )
    : null;
  const previewPosition = preview
    ? floatingChordCardPosition(preview.point, instrument, viewport)
    : null;

  function pinPreview() {
    if (!preview || !previewChord) return;
    const id = nextPinIdRef.current++;
    dispatch({
      type: "add",
      card: createFloatingChordCard(
        id,
        previewChord,
        preview.chordName,
        instrument,
        preview.point,
        viewport,
        cards.map((card) => card.initialPosition),
      ),
    });
    onPreviewDismiss();
  }

  return (
    <div
      ref={constraintsRef}
      className="hh-floating-chord-layer"
      aria-label={t("Pinned chord cards")}
    >
      {previewCard && previewPosition ? (
        <motion.aside
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : undefined}
          data-testid="chord-hover-preview"
          data-reduced-motion={shouldReduceMotion ? "true" : "false"}
          data-chord-name={previewCard.displayName}
          data-instrument={previewCard.instrument}
          className="hh-floating-chord-card hh-floating-chord-card--preview"
          onPointerEnter={onPreviewEnter}
          onPointerLeave={onPreviewLeave}
          style={{
            ...FLOATING_CARD_SURFACE_STYLE,
            ...floatingViewportStyle(viewport),
            left: previewPosition.x,
            top: previewPosition.y,
            zIndex: 1_000,
          }}
        >
          <div inert aria-hidden="true">
            <FloatingCardBody
              card={previewCard}
              harmonyContext={harmonyContext}
              onVariantChange={() => undefined}
              onPianoStyleChange={() => undefined}
              onChordChange={() => undefined}
            />
          </div>
          <button
            type="button"
            onClick={pinPreview}
            className="hh-floating-chord-card__pin-target"
            aria-label={`${t("Pin chord preview")}: ${previewCard.displayName}`}
            title={t("Pin chord preview")}
            style={FLOATING_CARD_PIN_TARGET_STYLE}
          />
        </motion.aside>
      ) : null}
      {cards.map((card) => (
        <PinnedChordCard
          key={card.id}
          card={card}
          viewport={viewport}
          harmonyContext={harmonyContext}
          constraintsRef={constraintsRef}
          onAction={dispatch}
        />
      ))}
    </div>
  );
}
