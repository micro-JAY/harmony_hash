export const CHORD_PREVIEW_HOVER_DELAY_MS = 1_500;

export interface ChordPreviewPoint {
  readonly x: number;
  readonly y: number;
}

export interface ChordPreviewRequest {
  readonly chordName: string;
  readonly point: ChordPreviewPoint;
}

interface ChordPreviewIntent {
  start: (chordName: string, point: ChordPreviewPoint) => void;
  updatePoint: (point: ChordPreviewPoint) => void;
  cancel: () => void;
}

/**
 * Keeps hover timing independent from React rendering so moving inside one
 * cell updates the eventual card position without restarting the 1.5s intent.
 */
export function createChordPreviewIntent(
  onPreview: (request: ChordPreviewRequest) => void,
  delayMs = CHORD_PREVIEW_HOVER_DELAY_MS,
): ChordPreviewIntent {
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new RangeError("Chord preview delay must be a non-negative finite number");
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  let activeChordName: string | null = null;
  let latestPoint: ChordPreviewPoint | null = null;

  function cancel() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    activeChordName = null;
    latestPoint = null;
  }

  return {
    start(chordName, point) {
      cancel();
      activeChordName = chordName;
      latestPoint = point;
      timer = setTimeout(() => {
        timer = null;
        if (!activeChordName || !latestPoint) return;
        onPreview({ chordName: activeChordName, point: latestPoint });
      }, delayMs);
    },
    updatePoint(point) {
      if (activeChordName) latestPoint = point;
    },
    cancel,
  };
}
