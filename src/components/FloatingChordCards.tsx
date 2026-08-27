import {
  motion,
  useDragControls,
  useReducedMotion,
} from "framer-motion";
import { GripHorizontal, X } from "lucide-react";
import {
  useMemo,
  useReducer,
  useRef,
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
  floatingChordCardPosition,
  floatingChordCardsReducer,
  type FloatingChordCard,
} from "./floatingChordCardsState";

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

function viewportSize() {
  return typeof window === "undefined"
    ? { width: 1_280, height: 800 }
    : { width: window.innerWidth, height: window.innerHeight };
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
  readonly harmonyContext: HarmonyContext;
  readonly constraintsRef: RefObject<HTMLDivElement | null>;
  readonly onAction: (action: Parameters<typeof floatingChordCardsReducer>[1]) => void;
}

function PinnedChordCard({
  card,
  harmonyContext,
  constraintsRef,
  onAction,
}: PinnedChordCardProps) {
  const t = useT();
  const dragControls = useDragControls();
  const shouldReduceMotion = useReducedMotion();

  function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    dragControls.start(event, { distanceThreshold: 3 });
  }

  return (
    <motion.article
      drag
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={constraintsRef}
      dragMomentum={false}
      dragElastic={0}
      whileDrag={shouldReduceMotion ? undefined : { scale: 1.01 }}
      data-testid="pinned-chord-card"
      data-chord-name={card.displayName}
      data-instrument={card.instrument}
      className="hh-floating-chord-card"
      style={{
        left: card.initialPosition.x,
        top: card.initialPosition.y,
        zIndex: 60 + card.id,
      }}
    >
      <div className="hh-floating-chord-card__controls">
        <button
          type="button"
          onPointerDown={startDrag}
          aria-label={`${t("Move pinned chord card")}: ${card.displayName}`}
          title={t("Move pinned chord card")}
          className="hh-floating-chord-card__handle"
        >
          <GripHorizontal size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onAction({ type: "dismiss", id: card.id })}
          aria-label={`${t("Dismiss pinned chord card")}: ${card.displayName}`}
          title={t("Dismiss pinned chord card")}
          className="hh-floating-chord-card__dismiss"
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
        viewportSize(),
      )
    : null;
  const previewPosition = preview
    ? floatingChordCardPosition(preview.point, instrument, viewportSize())
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
        viewportSize(),
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
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          data-testid="chord-hover-preview"
          data-chord-name={previewCard.displayName}
          data-instrument={previewCard.instrument}
          className="hh-floating-chord-card hh-floating-chord-card--preview"
          onPointerEnter={onPreviewEnter}
          onPointerLeave={onPreviewLeave}
          style={{
            left: previewPosition.x,
            top: previewPosition.y,
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
          />
        </motion.aside>
      ) : null}
      {cards.map((card) => (
        <PinnedChordCard
          key={card.id}
          card={card}
          harmonyContext={harmonyContext}
          constraintsRef={constraintsRef}
          onAction={dispatch}
        />
      ))}
    </div>
  );
}
