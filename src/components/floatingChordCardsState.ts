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
  readonly offsetLeft: number;
  readonly offsetTop: number;
}

export interface FloatingCardRect {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface FloatingCardPlacementSize {
  readonly width: number;
  readonly height: number;
}

const VIEWPORT_EDGE_GAP = 12;
const POINTER_CARD_GAP = 16;
// Leaves at least one compact toolbar strip reachable when full cards cannot avoid overlap.
const PIN_CASCADE_STEP = 40;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function validateViewport(viewport: FloatingViewport): void {
  if (![viewport.width, viewport.height, viewport.offsetLeft, viewport.offsetTop]
    .every(Number.isFinite)
    || viewport.width <= 0 || viewport.height <= 0) {
    throw new RangeError("Floating chord cards require finite positive viewport bounds");
  }
}

function validatePlacementSize(size: FloatingCardPlacementSize): void {
  if (![size.width, size.height].every(Number.isFinite)
    || size.width <= 0 || size.height <= 0) {
    throw new RangeError("Floating chord cards require finite positive placement dimensions");
  }
}

export function floatingChordCardClampOffset(
  rect: FloatingCardRect,
  viewport: FloatingViewport,
): ChordPreviewPoint {
  validateViewport(viewport);
  if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)
    || rect.right < rect.left || rect.bottom < rect.top) {
    throw new RangeError("Floating chord cards require finite ordered bounds");
  }

  const leftEdge = viewport.offsetLeft + VIEWPORT_EDGE_GAP;
  const topEdge = viewport.offsetTop + VIEWPORT_EDGE_GAP;
  const rightEdge = viewport.offsetLeft + viewport.width - VIEWPORT_EDGE_GAP;
  const bottomEdge = viewport.offsetTop + viewport.height - VIEWPORT_EDGE_GAP;
  return {
    x: rect.left < leftEdge
      ? leftEdge - rect.left
      : rect.right > rightEdge
        ? rightEdge - rect.right
        : 0,
    y: rect.top < topEdge
      ? topEdge - rect.top
      : rect.bottom > bottomEdge
        ? bottomEdge - rect.bottom
        : 0,
  };
}

export function floatingChordCardPosition(
  point: ChordPreviewPoint,
  placementSize: FloatingCardPlacementSize,
  viewport: FloatingViewport,
  occupiedPositions: readonly ChordPreviewPoint[] = [],
): ChordPreviewPoint {
  validateViewport(viewport);
  validatePlacementSize(placementSize);

  const leftEdge = viewport.offsetLeft + VIEWPORT_EDGE_GAP;
  const topEdge = viewport.offsetTop + VIEWPORT_EDGE_GAP;
  const rightEdge = viewport.offsetLeft + viewport.width - VIEWPORT_EDGE_GAP;
  const bottomEdge = viewport.offsetTop + viewport.height - VIEWPORT_EDGE_GAP;
  const fitsRight = point.x + POINTER_CARD_GAP + placementSize.width
    <= rightEdge;
  const fitsBelow = point.y + POINTER_CARD_GAP + placementSize.height
    <= bottomEdge;
  const preferredX = fitsRight
    ? point.x + POINTER_CARD_GAP
    : point.x - placementSize.width - POINTER_CARD_GAP;
  const preferredY = fitsBelow
    ? point.y + POINTER_CARD_GAP
    : point.y - placementSize.height - POINTER_CARD_GAP;

  const availableWidth = Math.max(1, viewport.width - (2 * VIEWPORT_EDGE_GAP));
  const availableHeight = Math.max(1, viewport.height - (2 * VIEWPORT_EDGE_GAP));
  const renderedWidth = Math.min(placementSize.width, availableWidth);
  const renderedHeight = Math.min(placementSize.height, availableHeight);
  const maxX = rightEdge - renderedWidth;
  const maxY = bottomEdge - renderedHeight;
  const preferredPosition = {
    x: clamp(
      preferredX,
      leftEdge,
      maxX,
    ),
    y: clamp(
      preferredY,
      topEdge,
      maxY,
    ),
  };
  if (occupiedPositions.length === 0) return preferredPosition;

  const minX = leftEdge;
  const minY = topEdge;
  // A compact viewport may have no full-card travel. Cascaded pins may move down
  // to expose each toolbar; their rendered max-height contracts to the bottom edge.
  const cascadeMaxY = Math.max(maxY, bottomEdge - PIN_CASCADE_STEP);
  const isDistinct = (candidate: ChordPreviewPoint) => occupiedPositions.every(
    (occupied) => Math.abs(candidate.x - occupied.x) >= PIN_CASCADE_STEP
      || Math.abs(candidate.y - occupied.y) >= PIN_CASCADE_STEP,
  );
  const maximumRing = occupiedPositions.length + 1;
  for (let ring = 1; ring <= maximumRing; ring += 1) {
    const distance = PIN_CASCADE_STEP * ring;
    const offsets = [
      { x: 0, y: distance },
      { x: distance, y: 0 },
      { x: -distance, y: 0 },
      { x: 0, y: -distance },
      { x: distance, y: distance },
      { x: -distance, y: distance },
    ];
    for (const offset of offsets) {
      const candidate = {
        x: clamp(preferredPosition.x + offset.x, minX, maxX),
        y: clamp(preferredPosition.y + offset.y, minY, cascadeMaxY),
      };
      if (isDistinct(candidate)) return candidate;
    }
  }
  return preferredPosition;
}

export function floatingChordCardAvailableHeight(
  position: ChordPreviewPoint,
  viewport: FloatingViewport,
): number {
  validateViewport(viewport);
  if (![position.x, position.y].every(Number.isFinite)) {
    throw new RangeError("Floating chord cards require finite positions");
  }
  const topEdge = viewport.offsetTop + VIEWPORT_EDGE_GAP;
  const bottomEdge = viewport.offsetTop + viewport.height - VIEWPORT_EDGE_GAP;
  return Math.max(
    PIN_CASCADE_STEP,
    bottomEdge - clamp(position.y, topEdge, bottomEdge - PIN_CASCADE_STEP),
  );
}

export function createFloatingChordCard(
  id: number,
  chord: IndexedChord,
  displayName: string,
  instrument: Instrument,
  point: ChordPreviewPoint,
  placementSize: FloatingCardPlacementSize,
  viewport: FloatingViewport,
  occupiedPositions: readonly ChordPreviewPoint[] = [],
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
    initialPosition: floatingChordCardPosition(
      point,
      placementSize,
      viewport,
      occupiedPositions,
    ),
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
