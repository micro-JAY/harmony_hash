import { isVoicingStyleAvailable } from "../lib/harmonyBrain";
import { parseNotes } from "../lib/chordData";
import type { IndexedChord, Instrument, VoicingStyle } from "../lib/types";
import type { ChordPreviewPoint } from "./chordPreviewIntent";

export interface FloatingChordCard {
  readonly id: number;
  readonly chord: IndexedChord;
  readonly displayName: string;
  readonly instrument: Instrument;
  readonly variant: number;
  readonly pianoStyle: VoicingStyle;
  readonly initialPosition: ChordPreviewPoint;
}

export type FloatingChordCardAction =
  | { readonly type: "add"; readonly card: FloatingChordCard }
  | { readonly type: "dismiss"; readonly id: number }
  | { readonly type: "set-variant"; readonly id: number; readonly variant: number }
  | { readonly type: "set-piano-style"; readonly id: number; readonly style: VoicingStyle }
  | {
      readonly type: "set-chord";
      readonly id: number;
      readonly chord: IndexedChord;
      readonly displayName: string;
    };

export interface FloatingViewport {
  readonly width: number;
  readonly height: number;
}

export interface FloatingCardRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const VIEWPORT_EDGE_GAP = 12;
const POINTER_CARD_GAP = 16;
const CARD_ESTIMATED_SIZE: Readonly<Record<Instrument, { width: number; height: number }>> = {
  guitar: { width: 288, height: 520 },
  piano: { width: 384, height: 500 },
};

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function floatingChordCardClampOffset(
  rect: FloatingCardRect,
  viewport: FloatingViewport,
): ChordPreviewPoint {
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)
    || viewport.width <= 0 || viewport.height <= 0) {
    throw new RangeError("Floating chord cards require a positive finite viewport");
  }
  if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)
    || rect.right < rect.left || rect.bottom < rect.top) {
    throw new RangeError("Floating chord cards require finite ordered bounds");
  }

  const rightEdge = viewport.width - VIEWPORT_EDGE_GAP;
  const bottomEdge = viewport.height - VIEWPORT_EDGE_GAP;
  return {
    x: rect.left < VIEWPORT_EDGE_GAP
      ? VIEWPORT_EDGE_GAP - rect.left
      : rect.right > rightEdge
        ? rightEdge - rect.right
        : 0,
    y: rect.top < VIEWPORT_EDGE_GAP
      ? VIEWPORT_EDGE_GAP - rect.top
      : rect.bottom > bottomEdge
        ? bottomEdge - rect.bottom
        : 0,
  };
}

export function floatingChordCardPosition(
  point: ChordPreviewPoint,
  instrument: Instrument,
  viewport: FloatingViewport,
): ChordPreviewPoint {
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)
    || viewport.width <= 0 || viewport.height <= 0) {
    throw new RangeError("Floating chord cards require a positive finite viewport");
  }

  const estimated = CARD_ESTIMATED_SIZE[instrument];
  const fitsRight = point.x + POINTER_CARD_GAP + estimated.width
    <= viewport.width - VIEWPORT_EDGE_GAP;
  const fitsBelow = point.y + POINTER_CARD_GAP + estimated.height
    <= viewport.height - VIEWPORT_EDGE_GAP;
  const preferredX = fitsRight
    ? point.x + POINTER_CARD_GAP
    : point.x - estimated.width - POINTER_CARD_GAP;
  const preferredY = fitsBelow
    ? point.y + POINTER_CARD_GAP
    : point.y - estimated.height - POINTER_CARD_GAP;

  return {
    x: clamp(
      preferredX,
      VIEWPORT_EDGE_GAP,
      viewport.width - Math.min(estimated.width, viewport.width) - VIEWPORT_EDGE_GAP,
    ),
    y: clamp(
      preferredY,
      VIEWPORT_EDGE_GAP,
      viewport.height - Math.min(estimated.height, viewport.height) - VIEWPORT_EDGE_GAP,
    ),
  };
}

export function createFloatingChordCard(
  id: number,
  chord: IndexedChord,
  displayName: string,
  instrument: Instrument,
  point: ChordPreviewPoint,
  viewport: FloatingViewport,
): FloatingChordCard {
  if (!Number.isInteger(id) || id < 1) {
    throw new RangeError("Floating chord card id must be a positive integer");
  }
  return {
    id,
    chord,
    displayName,
    instrument,
    variant: 1,
    pianoStyle: "auto",
    initialPosition: floatingChordCardPosition(point, instrument, viewport),
  };
}

export function floatingChordCardsReducer(
  cards: readonly FloatingChordCard[],
  action: FloatingChordCardAction,
): readonly FloatingChordCard[] {
  switch (action.type) {
    case "add":
      return [...cards, action.card];
    case "dismiss":
      return cards.filter((card) => card.id !== action.id);
    case "set-variant":
      return cards.map((card) => card.id === action.id
        ? {
            ...card,
            variant: clamp(action.variant, 1, Math.max(card.chord.variationCount, 1)),
          }
        : card);
    case "set-piano-style":
      return cards.map((card) => card.id === action.id
        ? { ...card, pianoStyle: action.style }
        : card);
    case "set-chord":
      return cards.map((card) => {
        if (card.id !== action.id) return card;
        const nextStyle = isVoicingStyleAvailable(
          parseNotes(action.chord.entry),
          card.pianoStyle,
        ) ? card.pianoStyle : "auto";
        return {
          ...card,
          chord: action.chord,
          displayName: action.displayName,
          variant: clamp(card.variant, 1, Math.max(action.chord.variationCount, 1)),
          pianoStyle: nextStyle,
        };
      });
  }
}
