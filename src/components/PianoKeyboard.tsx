import type { VoicedNote } from "../lib/types";

interface PianoKeyboardProps {
  voicedNotes: VoicedNote[];
}

// 2-octave keyboard: C3 to B4 = 24 white keys + black keys
const OCTAVE_START = 3;
const OCTAVE_END = 4;

interface KeyDef {
  note: string;
  octave: number;
  midi: number;
  isBlack: boolean;
}

function buildKeyboard(): KeyDef[] {
  const keys: KeyDef[] = [];
  for (let oct = OCTAVE_START; oct <= OCTAVE_END; oct++) {
    const whiteNotes = [
      { note: "C", pc: 0 },
      { note: "D", pc: 2 },
      { note: "E", pc: 4 },
      { note: "F", pc: 5 },
      { note: "G", pc: 7 },
      { note: "A", pc: 9 },
      { note: "B", pc: 11 },
    ];
    const blackNotes = [
      { note: "Cs", pc: 1 },
      { note: "Ds", pc: 3 },
      { note: "Fs", pc: 6 },
      { note: "Gs", pc: 8 },
      { note: "As", pc: 10 },
    ];
    for (const w of whiteNotes) {
      keys.push({ note: w.note, octave: oct, midi: w.pc + (oct + 1) * 12, isBlack: false });
    }
    for (const b of blackNotes) {
      keys.push({ note: b.note, octave: oct, midi: b.pc + (oct + 1) * 12, isBlack: true });
    }
  }
  return keys;
}

const ALL_KEYS = buildKeyboard();
const WHITE_KEYS = ALL_KEYS.filter((k) => !k.isBlack);
const BLACK_KEYS = ALL_KEYS.filter((k) => k.isBlack);

// Black key X positions relative to white keys (proportional within octave)
// C#/Db sits between C and D, etc.
function getBlackKeyOffset(note: string, octave: number, whiteKeyWidth: number): number {
  const octaveOffset = (octave - OCTAVE_START) * 7;
  const positions: Record<string, number> = {
    Cs: octaveOffset + 0.65,
    Ds: octaveOffset + 1.75,
    Fs: octaveOffset + 3.6,
    Gs: octaveOffset + 4.7,
    As: octaveOffset + 5.8,
  };
  return (positions[note] ?? 0) * whiteKeyWidth;
}

export default function PianoKeyboard({ voicedNotes }: PianoKeyboardProps) {
  const activeSet = new Map<number, VoicedNote>();
  for (const n of voicedNotes) {
    activeSet.set(n.midi, n);
  }

  const whiteKeyW = 30;
  const whiteKeyH = 100;
  const blackKeyW = 18;
  const blackKeyH = 60;
  const totalWidth = WHITE_KEYS.length * whiteKeyW;

  return (
    <div
      className="relative mx-auto"
      style={{ width: totalWidth, height: whiteKeyH }}
    >
      {/* White keys */}
      {WHITE_KEYS.map((key, i) => {
        const active = activeSet.get(key.midi);
        return (
          <div
            key={`w-${key.midi}`}
            className={active ? (active.hand === "left" ? "piano-key-active-lh" : "piano-key-active") : ""}
            style={{
              position: "absolute",
              left: i * whiteKeyW,
              top: 0,
              width: whiteKeyW - 1,
              height: whiteKeyH,
              backgroundColor: active
                ? active.hand === "left"
                  ? "var(--palette-apricot)"
                  : "var(--palette-gold)"
                : "var(--palette-white)",
              border: "1px solid var(--border-default)",
              borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
              transition: `background-color var(--duration-normal) var(--ease-out)`,
            }}
          >
            {active && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold"
                style={{
                  color: "var(--text-inverse)",
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {active.hand === "left" ? "L" : "R"}
              </span>
            )}
          </div>
        );
      })}

      {/* Black keys */}
      {BLACK_KEYS.map((key) => {
        const active = activeSet.get(key.midi);
        const xPos = getBlackKeyOffset(key.note, key.octave, whiteKeyW);
        return (
          <div
            key={`b-${key.midi}`}
            className={active ? (active.hand === "left" ? "piano-key-active-lh" : "piano-key-active") : ""}
            style={{
              position: "absolute",
              left: xPos,
              top: 0,
              width: blackKeyW,
              height: blackKeyH,
              backgroundColor: active
                ? active.hand === "left"
                  ? "var(--palette-apricot)"
                  : "var(--text-accent)"
                : "var(--palette-black)",
              border: "1px solid var(--border-strong)",
              borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
              zIndex: 1,
              transition: `background-color var(--duration-normal) var(--ease-out)`,
            }}
          >
            {active && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold"
                style={{
                  color: active.hand === "left" ? "var(--text-inverse)" : "var(--text-inverse)",
                  fontSize: "8px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {active.hand === "left" ? "L" : "R"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
