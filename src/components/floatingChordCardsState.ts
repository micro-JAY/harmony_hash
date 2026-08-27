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

export interface FloatingCardPlacementMetrics {
  readonly width: number;
  readonly height: number;
  readonly edgeGap: number;
  readonly pointerGap: number;
  readonly toolbarHeight: number;
}

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

function validatePlacementMetrics(metrics: FloatingCardPlacementMetrics): void {
  if (![metrics.width, metrics.height, metrics.edgeGap, metrics.pointerGap,
    metrics.toolbarHeight].every(Number.isFinite)
    || metrics.width <= 0 || metrics.height <= 0 || metrics.edgeGap < 0
    || metrics.pointerGap < 0 || metrics.toolbarHeight <= 0) {
    throw new RangeError("Floating chord cards require finite placement geometry");
  }
}

export function floatingChordCardClampOffset(
  rect: FloatingCardRect,
  metrics: FloatingCardPlacementMetrics,
  viewport: FloatingViewport,
): ChordPreviewPoint {
  validateViewport(viewport);
  validatePlacementMetrics(metrics);
  if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)
    || rect.right < rect.left || rect.bottom < rect.top) {
    throw new RangeError("Floating chord cards require finite ordered bounds");
  }

  const leftEdge = viewport.offsetLeft + metrics.edgeGap;
  const topEdge = viewport.offsetTop + metrics.edgeGap;
  const rightEdge = viewport.offsetLeft + viewport.width - metrics.edgeGap;
  const bottomEdge = viewport.offsetTop + viewport.height - metrics.edgeGap;
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
  metrics: FloatingCardPlacementMetrics,
  viewport: FloatingViewport,
  occupiedPositions: readonly ChordPreviewPoint[] = [],
): ChordPreviewPoint {
  validateViewport(viewport);
  validatePlacementMetrics(metrics);

  const leftEdge = viewport.offsetLeft + metrics.edgeGap;
  const topEdge = viewport.offsetTop + metrics.edgeGap;
  const rightEdge = viewport.offsetLeft + viewport.width - metrics.edgeGap;
  const bottomEdge = viewport.offsetTop + viewport.height - metrics.edgeGap;
  const fitsRight = point.x + metrics.pointerGap + metrics.width
    <= rightEdge;
  const fitsBelow = point.y + metrics.pointerGap + metrics.height
    <= bottomEdge;
  const preferredX = fitsRight
    ? point.x + metrics.pointerGap
    : point.x - metrics.width - metrics.pointerGap;
  const preferredY = fitsBelow
    ? point.y + metrics.pointerGap
    : point.y - metrics.height - metrics.pointerGap;

  const availableWidth = Math.max(1, viewport.width - (2 * metrics.edgeGap));
  const availableHeight = Math.max(1, viewport.height - (2 * metrics.edgeGap));
  const renderedWidth = Math.min(metrics.width, availableWidth);
  const renderedHeight = Math.min(metrics.height, availableHeight);
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
  const cascadeMaxY = Math.max(maxY, bottomEdge - metrics.toolbarHeight);
  const isDistinct = (candidate: ChordPreviewPoint) => occupiedPositions.every(
    (occupied) => Math.abs(candidate.x - occupied.x) >= metrics.toolbarHeight
      || Math.abs(candidate.y - occupied.y) >= metrics.toolbarHeight,
  );
  const maximumRing = occupiedPositions.length + 1;
  for (let ring = 1; ring <= maximumRing; ring += 1) {
    const distance = metrics.toolbarHeight * ring;
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
  metrics: FloatingCardPlacementMetrics,
  viewport: FloatingViewport,
): number {
  validateViewport(viewport);
  validatePlacementMetrics(metrics);
  if (![position.x, position.y].every(Number.isFinite)) {
    throw new RangeError("Floating chord cards require finite positions");
  }
  const topEdge = viewport.offsetTop + metrics.edgeGap;
  const bottomEdge = viewport.offsetTop + viewport.height - metrics.edgeGap;
  return Math.max(
    metrics.toolbarHeight,
    bottomEdge - clamp(
      position.y,
      topEdge,
      bottomEdge - metrics.toolbarHeight,
    ),
  );
}

export function createFloatingChordCard(
  id: number,
  chord: IndexedChord,
  displayName: string,
  instrument: Instrument,
  point: ChordPreviewPoint,
  metrics: FloatingCardPlacementMetrics,
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
      metrics,
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
