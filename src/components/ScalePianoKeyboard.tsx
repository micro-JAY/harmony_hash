import type { CSSProperties } from "react";
import type { ScalePracticeNote } from "../lib/theory";
import { fretboardIntervalColor } from "./fretboardVisuals";

interface ScalePianoKeyboardProps {
  notes: ReadonlyArray<ScalePracticeNote>;
  activeMidi: number | null;
  reducedMotion: boolean;
}

interface PianoKey {
  readonly note: string;
  readonly midi: number;
  readonly octave: number;
  readonly isBlack: boolean;
}

const WHITE_NOTE_DEFS = Object.freeze([
  { note: "C", pitchClass: 0 }, { note: "D", pitchClass: 2 },
  { note: "E", pitchClass: 4 }, { note: "F", pitchClass: 5 },
  { note: "G", pitchClass: 7 }, { note: "A", pitchClass: 9 },
  { note: "B", pitchClass: 11 },
]);
const BLACK_NOTE_DEFS = Object.freeze([
  { note: "C#", pitchClass: 1, offset: 0.66 },
  { note: "D#", pitchClass: 3, offset: 1.76 },
  { note: "F#", pitchClass: 6, offset: 3.61 },
  { note: "G#", pitchClass: 8, offset: 4.71 },
  { note: "A#", pitchClass: 10, offset: 5.81 },
]);
const OCTAVES = Object.freeze([3, 4]);
const WHITE_KEY_WIDTH = 56;
const WHITE_KEY_HEIGHT = 220;
const BLACK_KEY_WIDTH = 34;
const BLACK_KEY_HEIGHT = 138;
const TOTAL_WIDTH = OCTAVES.length * WHITE_NOTE_DEFS.length * WHITE_KEY_WIDTH;

const WHITE_KEYS: ReadonlyArray<PianoKey> = Object.freeze(OCTAVES.flatMap((octave) =>
  WHITE_NOTE_DEFS.map((definition) => Object.freeze({
    note: definition.note,
    midi: definition.pitchClass + (octave + 1) * 12,
    octave,
    isBlack: false,
  })),
));
const BLACK_KEYS = Object.freeze(OCTAVES.flatMap((octave) =>
  BLACK_NOTE_DEFS.map((definition) => Object.freeze({
    note: definition.note,
    midi: definition.pitchClass + (octave + 1) * 12,
    octave,
    isBlack: true,
    offset: ((octave - OCTAVES[0]) * 7 + definition.offset) * WHITE_KEY_WIDTH,
  })),
));

export default function ScalePianoKeyboard({
  notes,
  activeMidi,
  reducedMotion,
}: ScalePianoKeyboardProps) {
  const noteByMidi = new Map(notes.map((note) => [note.midi, note]));
  const scaleDescription = notes.map((note) => `${note.label}, degree ${note.degree}`).join("; ");

  function activeStyle(note: ScalePracticeNote | undefined, midi: number): CSSProperties {
    if (!note) return {};
    const color = fretboardIntervalColor(note.interval);
    const playing = activeMidi === midi;
    return {
      backgroundColor: color,
      borderColor: color,
      color: "var(--text-inverse)",
      boxShadow: playing ? `0 0 0 3px var(--surface-base), 0 0 0 6px ${color}` : "none",
      transform: playing && !reducedMotion ? "translateY(3px)" : "none",
    };
  }

  return (
    <div
      className="w-full overflow-x-auto rounded-xl"
      data-testid="scale-piano-scroller"
      style={{ backgroundColor: "var(--surface-sunken)", border: "1px solid var(--border-default)" }}
    >
      <div
        role="img"
        aria-label={`Two-octave piano scale map. ${scaleDescription}`}
        className="relative mx-auto"
        data-testid="scale-piano-keyboard"
        style={{ width: TOTAL_WIDTH, height: WHITE_KEY_HEIGHT }}
      >
        {WHITE_KEYS.map((key, index) => {
          const practiceNote = noteByMidi.get(key.midi);
          return (
            <div
              key={key.midi}
              className="absolute top-0 flex items-end justify-center pb-4"
              data-scale-degree={practiceNote?.degree ?? ""}
              data-playing={activeMidi === key.midi ? "true" : "false"}
              style={{
                left: index * WHITE_KEY_WIDTH,
                width: WHITE_KEY_WIDTH - 2,
                height: WHITE_KEY_HEIGHT,
                backgroundColor: "var(--palette-white)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--border-strong)",
                borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                transition: reducedMotion ? "none" : "transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
                ...activeStyle(practiceNote, key.midi),
              }}
            >
              {practiceNote ? (
                <span className="text-center" style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)" }}>
                  <span className="block">{practiceNote.label}</span>
                  <span className="block text-xs">{practiceNote.degree}</span>
                </span>
              ) : null}
            </div>
          );
        })}
        {BLACK_KEYS.map((key) => {
          const practiceNote = noteByMidi.get(key.midi);
          return (
            <div
              key={key.midi}
              className="absolute top-0 z-10 flex items-end justify-center pb-3"
              data-scale-degree={practiceNote?.degree ?? ""}
              data-playing={activeMidi === key.midi ? "true" : "false"}
              style={{
                left: key.offset,
                width: BLACK_KEY_WIDTH,
                height: BLACK_KEY_HEIGHT,
                backgroundColor: "var(--palette-black)",
                borderWidth: "1px",
                borderStyle: "solid",
                borderColor: "var(--border-strong)",
                borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
                color: "var(--palette-white)",
                transition: reducedMotion ? "none" : "transform var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)",
                ...activeStyle(practiceNote, key.midi),
              }}
            >
              {practiceNote ? (
                <span className="text-center text-xs" style={{ fontFamily: "var(--font-mono)", fontWeight: "var(--weight-bold)" }}>
                  <span className="block">{practiceNote.label}</span>
                  <span className="block">{practiceNote.degree}</span>
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
