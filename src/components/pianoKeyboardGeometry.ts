export type PianoKeyboardSize = "standard" | "compact";

export const PIANO_WHITE_KEY_COUNT = 21;

const BLACK_KEY_POSITIONS: Readonly<Record<string, number>> = Object.freeze({
  Cs: 0.65,
  Ds: 1.75,
  Fs: 3.6,
  Gs: 4.7,
  As: 5.8,
});

export interface PianoKeyGeometry {
  leftPercent: number;
  widthPercent: number;
}

export function getWhiteKeyGeometry(index: number): PianoKeyGeometry {
  if (!Number.isInteger(index) || index < 0 || index >= PIANO_WHITE_KEY_COUNT) {
    throw new RangeError(`White-key index is outside the C3-B5 keyboard: ${index}`);
  }

  const widthPercent = 100 / PIANO_WHITE_KEY_COUNT;
  return {
    leftPercent: index * widthPercent,
    widthPercent,
  };
}

export function getBlackKeyGeometry(
  note: string,
  octave: number,
  size: PianoKeyboardSize,
): PianoKeyGeometry {
  const withinOctave = BLACK_KEY_POSITIONS[note];
  if (withinOctave === undefined || octave < 3 || octave > 5) {
    throw new RangeError(`Black key is outside the C3-B5 keyboard: ${note}${octave}`);
  }

  const absoluteWhitePosition = ((octave - 3) * 7) + withinOctave;
  const referenceWidth = size === "compact" ? 252 : 630;
  const referenceBlackKeyWidth = size === "compact" ? 8 : 18;

  return {
    leftPercent: (absoluteWhitePosition / PIANO_WHITE_KEY_COUNT) * 100,
    widthPercent: (referenceBlackKeyWidth / referenceWidth) * 100,
  };
}

export function getKeyboardMaxWidth(size: PianoKeyboardSize): number {
  return size === "compact" ? 252 : 630;
}
