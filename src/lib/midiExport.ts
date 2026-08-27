export const MIDI_PULSES_PER_QUARTER = 480;
export const MIDI_TICKS_PER_BAR = MIDI_PULSES_PER_QUARTER * 4;

const MIDI_CHANNEL = 0;
const MIDI_NOTE_ON_VELOCITY = 96;

export class MidiExportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MidiExportError";
  }
}

function asciiBytes(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0));
}

function unsigned16(value: number): number[] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function unsigned32(value: number): number[] {
  return [
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ];
}

export function encodeMidiVariableLength(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0x0fffffff) {
    throw new MidiExportError("MIDI delta time is outside the supported range");
  }

  let remaining = value;
  const bytes = [remaining & 0x7f];
  while ((remaining >>= 7) > 0) {
    bytes.unshift((remaining & 0x7f) | 0x80);
  }
  return bytes;
}

function normalizeChordNotes(
  notes: readonly number[],
  chordIndex: number,
): number[] {
  if (notes.length === 0) {
    throw new MidiExportError(`Chord ${chordIndex + 1} has no playable MIDI notes`);
  }

  const unique = new Set<number>();
  for (const note of notes) {
    if (!Number.isInteger(note) || note < 0 || note > 127) {
      throw new MidiExportError(
        `Chord ${chordIndex + 1} contains an invalid MIDI note: ${String(note)}`,
      );
    }
    unique.add(note);
  }
  return [...unique].sort((left, right) => left - right);
}

/**
 * Builds one Type-0 Standard MIDI File. A 4/4 meter defines each bar while
 * intentionally omitting Set Tempo so the importing session owns tempo.
 */
export function createProgressionMidiFile(
  chordVoicings: readonly (readonly number[])[],
): Uint8Array {
  if (chordVoicings.length === 0) {
    throw new MidiExportError("A progression is required for MIDI export");
  }

  const voicings = chordVoicings.map(normalizeChordNotes);
  const track: number[] = [
    // Delta 0, Time Signature 4/4, 24 MIDI clocks per metronome click.
    0x00, 0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08,
  ];

  for (const notes of voicings) {
    notes.forEach((note) => {
      track.push(0x00, 0x90 | MIDI_CHANNEL, note, MIDI_NOTE_ON_VELOCITY);
    });
    notes.forEach((note, noteIndex) => {
      track.push(
        ...encodeMidiVariableLength(noteIndex === 0 ? MIDI_TICKS_PER_BAR : 0),
        0x80 | MIDI_CHANNEL,
        note,
        0x00,
      );
    });
  }

  track.push(0x00, 0xff, 0x2f, 0x00);
  const header = [
    ...asciiBytes("MThd"),
    ...unsigned32(6),
    ...unsigned16(0),
    ...unsigned16(1),
    ...unsigned16(MIDI_PULSES_PER_QUARTER),
  ];
  const trackHeader = [
    ...asciiBytes("MTrk"),
    ...unsigned32(track.length),
  ];
  return Uint8Array.from([...header, ...trackHeader, ...track]);
}
