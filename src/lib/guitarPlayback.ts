import {
  GUITAR_STRING_OPEN_MIDIS,
  type ParsedDot,
  type ParsedGuitarSvg,
} from "./guitarSvgParser";

export interface GuitarPlaybackNote {
  readonly stringIndex: number;
  readonly fretNumber: number;
  readonly midi: number;
}

export interface GuitarMidiVoicing {
  readonly notes: readonly GuitarPlaybackNote[];
  readonly sourcePath: string;
}

function validateDot(dot: ParsedDot): void {
  if (!Number.isInteger(dot.stringIndex) || dot.stringIndex < 0 || dot.stringIndex >= 6) {
    throw new Error(`Invalid guitar string index: ${dot.stringIndex}`);
  }
  if (!Number.isInteger(dot.fretNumber) || dot.fretNumber < 0 || dot.fretNumber > 30) {
    throw new Error(`Invalid guitar fret number: ${dot.fretNumber}`);
  }
  const expectedMidi = GUITAR_STRING_OPEN_MIDIS[dot.stringIndex] + dot.fretNumber;
  if (!Number.isInteger(dot.midi) || dot.midi !== expectedMidi) {
    throw new Error(
      `Guitar MIDI ${dot.midi} does not match string ${dot.stringIndex} fret ${dot.fretNumber}`,
    );
  }
}

export function deriveGuitarMidiVoicing(
  parsed: ParsedGuitarSvg,
  sourcePath: string,
): GuitarMidiVoicing {
  if (!sourcePath) throw new Error("Guitar playback source path is required");
  const muted = new Set(parsed.mutedStringIndexes);
  const byString = new Map<number, ParsedDot>();

  for (const dot of parsed.dots) {
    validateDot(dot);
    if (muted.has(dot.stringIndex)) continue;
    const current = byString.get(dot.stringIndex);
    if (!current) {
      byString.set(dot.stringIndex, dot);
      continue;
    }
    if (current.fretNumber === dot.fretNumber) {
      if (current.source === "barre" && dot.source === "circle") {
        byString.set(dot.stringIndex, dot);
      }
      continue;
    }
    if (current.source === "barre" && dot.source === "circle") {
      byString.set(dot.stringIndex, dot);
      continue;
    }
    if (current.source === "circle" && dot.source === "barre") continue;
    throw new Error(`Conflicting guitar markers on string ${dot.stringIndex}`);
  }

  const notes = [...byString.values()]
    .sort((left, right) => right.stringIndex - left.stringIndex)
    .map(({ stringIndex, fretNumber, midi }) => ({ stringIndex, fretNumber, midi }));
  if (notes.length === 0) throw new Error("Guitar diagram has no playable strings");
  return { notes, sourcePath };
}
