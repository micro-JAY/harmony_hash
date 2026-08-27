import { describe, expect, it } from "vitest";
import {
  createProgressionMidiFile,
  encodeMidiVariableLength,
  MIDI_PULSES_PER_QUARTER,
  MIDI_TICKS_PER_BAR,
  MidiExportError,
} from "./midiExport";

interface ParsedNoteEvent {
  readonly kind: "on" | "off";
  readonly note: number;
  readonly tick: number;
}

function readVariableLength(bytes: Uint8Array, start: number) {
  let value = 0;
  let index = start;
  while (index < bytes.length) {
    const byte = bytes[index++];
    value = (value << 7) | (byte & 0x7f);
    if ((byte & 0x80) === 0) return { value, next: index };
  }
  throw new Error("Unterminated MIDI variable-length value");
}

function parsedNoteEvents(bytes: Uint8Array): ParsedNoteEvent[] {
  const events: ParsedNoteEvent[] = [];
  let index = 22;
  let tick = 0;
  while (index < bytes.length) {
    const delta = readVariableLength(bytes, index);
    tick += delta.value;
    index = delta.next;
    const status = bytes[index++];
    if (status === 0xff) {
      const metaType = bytes[index++];
      const length = readVariableLength(bytes, index);
      index = length.next + length.value;
      if (metaType === 0x2f) break;
      continue;
    }
    const note = bytes[index++];
    const velocity = bytes[index++];
    if ((status & 0xf0) === 0x90 && velocity > 0) {
      events.push({ kind: "on", note, tick });
    } else if ((status & 0xf0) === 0x80 || ((status & 0xf0) === 0x90 && velocity === 0)) {
      events.push({ kind: "off", note, tick });
    } else {
      throw new Error(`Unexpected MIDI status ${status.toString(16)}`);
    }
  }
  return events;
}

function containsSequence(bytes: Uint8Array, sequence: readonly number[]): boolean {
  return bytes.some((_, index) =>
    sequence.every((value, offset) => bytes[index + offset] === value));
}

describe("createProgressionMidiFile", () => {
  it("writes a deterministic Type-0 480-PPQ file with one 4/4 bar per chord", () => {
    const bytes = createProgressionMidiFile([
      [60, 64, 67, 60],
      [55, 59, 62],
    ]);

    expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("MThd");
    expect([...bytes.slice(8, 14)]).toEqual([
      0x00, 0x00,
      0x00, 0x01,
      ...[(MIDI_PULSES_PER_QUARTER >>> 8) & 0xff, MIDI_PULSES_PER_QUARTER & 0xff],
    ]);
    expect(new TextDecoder().decode(bytes.slice(14, 18))).toBe("MTrk");
    expect(containsSequence(bytes, [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08])).toBe(true);

    expect(parsedNoteEvents(bytes)).toEqual([
      { kind: "on", note: 60, tick: 0 },
      { kind: "on", note: 64, tick: 0 },
      { kind: "on", note: 67, tick: 0 },
      { kind: "off", note: 60, tick: MIDI_TICKS_PER_BAR },
      { kind: "off", note: 64, tick: MIDI_TICKS_PER_BAR },
      { kind: "off", note: 67, tick: MIDI_TICKS_PER_BAR },
      { kind: "on", note: 55, tick: MIDI_TICKS_PER_BAR },
      { kind: "on", note: 59, tick: MIDI_TICKS_PER_BAR },
      { kind: "on", note: 62, tick: MIDI_TICKS_PER_BAR },
      { kind: "off", note: 55, tick: MIDI_TICKS_PER_BAR * 2 },
      { kind: "off", note: 59, tick: MIDI_TICKS_PER_BAR * 2 },
      { kind: "off", note: 62, tick: MIDI_TICKS_PER_BAR * 2 },
    ]);
    expect(createProgressionMidiFile([[60, 64, 67]])).toEqual(
      createProgressionMidiFile([[60, 64, 67]]),
    );
  });

  it("omits Set Tempo so the importing session can choose tempo", () => {
    const bytes = createProgressionMidiFile([[60, 64, 67]]);

    expect(containsSequence(bytes, [0xff, 0x51])).toBe(false);
    expect(containsSequence(bytes, [0xff, 0x2f, 0x00])).toBe(true);
  });

  it("encodes the one-bar delta as a MIDI variable-length quantity", () => {
    expect(encodeMidiVariableLength(0)).toEqual([0]);
    expect(encodeMidiVariableLength(127)).toEqual([127]);
    expect(encodeMidiVariableLength(128)).toEqual([0x81, 0x00]);
    expect(encodeMidiVariableLength(MIDI_TICKS_PER_BAR)).toEqual([0x8f, 0x00]);
  });

  it.each([
    { voicings: [], message: "progression" },
    { voicings: [[]], message: "no playable MIDI notes" },
    { voicings: [[60, 128]], message: "invalid MIDI note" },
    { voicings: [[60, 64.5]], message: "invalid MIDI note" },
  ])("rejects malformed voicings: $message", ({ voicings, message }) => {
    expect(() => createProgressionMidiFile(voicings)).toThrow(MidiExportError);
    expect(() => createProgressionMidiFile(voicings)).toThrow(message);
  });
});
