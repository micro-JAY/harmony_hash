import type { PianoDisplayMode, VoicedNote } from "../lib/types";
import { formatNoteForDisplay } from "../lib/chordData";
import { useT } from "../i18n/I18nContext";
import { fretboardIntervalColor } from "./fretboardVisuals";
import {
  getBlackKeyGeometry,
  getKeyboardMaxWidth,
  getWhiteKeyGeometry,
  type PianoKeyboardSize,
} from "./pianoKeyboardGeometry";

interface PianoKeyboardProps {
  voicedNotes: VoicedNote[];
  displayMode: PianoDisplayMode;
  preferFlats: boolean;
  rootNote: string;
  size?: PianoKeyboardSize;
  colorMode?: "hand" | "interval";
}

// 3-octave keyboard: C3 to B5
const OCTAVE_START = 3;
const OCTAVE_END = 5;

const NOTE_TO_PITCH_CLASS: Record<string, number> = {
  C: 0,
  Cs: 1,
  Df: 1,
  D: 2,
  Ds: 3,
  Ef: 3,
  E: 4,
  F: 5,
  Es: 5,
  Fs: 6,
  Gf: 6,
  G: 7,
  Gs: 8,
  Af: 8,
  A: 9,
  As: 10,
  Bf: 10,
  B: 11,
  Cf: 11,
};

interface KeyDef {
  note: string;
  octave: number;
  midi: number;
  isBlack: boolean;
}

function normalizeNoteName(raw: string): string {
  const value = raw.trim();
  const match = value.match(/^([A-Ga-g])([#bsf♯♭])?$/);
  if (!match) return value;

  const letter = match[1].toUpperCase();
  const accidental = match[2];
  if (!accidental) return letter;

  if (accidental === "#" || accidental === "♯" || accidental.toLowerCase() === "s") {
    return `${letter}s`;
  }
  if (accidental.toLowerCase() === "b" || accidental === "♭" || accidental.toLowerCase() === "f") {
    return `${letter}f`;
  }
  return letter;
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

export default function PianoKeyboard({
  voicedNotes,
  displayMode,
  preferFlats,
  rootNote,
  size = "standard",
  colorMode = "hand",
}: PianoKeyboardProps) {
  const t = useT();
  const activeSet = new Map<number, VoicedNote>();
  for (const note of voicedNotes) {
    activeSet.set(note.midi, note);
  }

  const rootCanonical = normalizeNoteName(rootNote);
  const rootPitchClass = NOTE_TO_PITCH_CLASS[rootCanonical];
  const rootMidi = voicedNotes.find((note) => normalizeNoteName(note.name) === rootCanonical)?.midi;
  const sortedNotes = [...voicedNotes].sort((a, b) => a.midi - b.midi);
  const activeMidis = sortedNotes.map((note) => note.midi);
  const voicedNoteLabel = sortedNotes
    .map((note) => `${formatNoteForDisplay(note.name, preferFlats)}${note.octave}`)
    .join(", ");

  const fingeringByMidi = new Map<number, string>();
  if (displayMode === "fingering") {
    const sorted = [...voicedNotes].sort((a, b) => a.midi - b.midi);
    sorted.slice(0, 5).forEach((note, index) => {
      fingeringByMidi.set(note.midi, String(index + 1));
    });
  }

  function getActiveLabel(active: VoicedNote): string {
    if (displayMode === "notes") {
      return ""; // keys are highlighted — no label needed
    }
    return fingeringByMidi.get(active.midi) ?? "";
  }

  function isRootLabel(active: VoicedNote): boolean {
    return rootPitchClass !== undefined && active.pitchClass === rootPitchClass;
  }

  function isRootFingerKey(active: VoicedNote): boolean {
    return displayMode === "fingering" && rootMidi !== undefined && active.midi === rootMidi;
  }

  function activeInterval(active: VoicedNote): number | null {
    if (rootPitchClass === undefined) return null;
    return ((active.pitchClass - rootPitchClass) % 12 + 12) % 12;
  }

  function activeKeyColor(active: VoicedNote, rootFingerKey: boolean, isBlack: boolean): string {
    const interval = activeInterval(active);
    if (colorMode === "interval" && interval !== null) {
      return fretboardIntervalColor(interval);
    }
    if (rootFingerKey) return "var(--text-accent)";
    if (active.hand === "left") return "var(--palette-apricot)";
    return isBlack ? "var(--text-accent)" : "var(--palette-gold)";
  }

  const compact = size === "compact";
  const whiteKeyH = compact ? 64 : 100;
  const blackKeyH = compact ? 40 : 60;
  const maxWidth = getKeyboardMaxWidth(size);

  return (
    <div
      data-testid="piano-keyboard"
      data-size={size}
      data-color-mode={colorMode}
      data-active-midis={activeMidis.join(",")}
      role="img"
      aria-label={t(`Piano voicing: ${voicedNoteLabel || "no notes"}`)}
      className="relative mx-auto"
      style={{ width: "100%", maxWidth, height: whiteKeyH }}
    >
      {/* White keys */}
      {WHITE_KEYS.map((key, i) => {
        const geometry = getWhiteKeyGeometry(i);
        const active = activeSet.get(key.midi);
        const label = active ? getActiveLabel(active) : "";
        const rootFingerKey = active ? isRootFingerKey(active) : false;
        const rootNoteLabel = active ? isRootLabel(active) : false;
        const interval = active ? activeInterval(active) : null;

        return (
          <div
            key={`w-${key.midi}`}
            data-midi={key.midi}
            data-key-kind="white"
            data-note-interval={interval ?? undefined}
            className={active ? (active.hand === "left" ? "piano-key-active-lh" : "piano-key-active") : ""}
            style={{
              position: "absolute",
              left: `${geometry.leftPercent}%`,
              top: 0,
              width: `calc(${geometry.widthPercent}% - 1px)`,
              height: whiteKeyH,
              backgroundColor: active
                ? activeKeyColor(active, rootFingerKey, false)
                : "var(--palette-white)",
              border: "1px solid var(--border-default)",
              borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
              transition: `background-color var(--duration-normal) var(--ease-out)`,
            }}
          >
            {active && label && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold"
                style={{
                  color:
                    displayMode === "notes"
                      ? rootNoteLabel
                        ? "var(--text-accent)"
                        : "var(--text-primary)"
                      : rootFingerKey
                        ? "var(--surface-base)"
                        : "var(--text-primary)",
                  fontSize: "9px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}

      {/* Black keys */}
      {BLACK_KEYS.map((key) => {
        const active = activeSet.get(key.midi);
        const label = active ? getActiveLabel(active) : "";
        const rootFingerKey = active ? isRootFingerKey(active) : false;
        const rootNoteLabel = active ? isRootLabel(active) : false;
        const interval = active ? activeInterval(active) : null;
        const geometry = getBlackKeyGeometry(key.note, key.octave, size);

        return (
          <div
            key={`b-${key.midi}`}
            data-midi={key.midi}
            data-key-kind="black"
            data-note-interval={interval ?? undefined}
            className={active ? (active.hand === "left" ? "piano-key-active-lh" : "piano-key-active") : ""}
            style={{
              position: "absolute",
              left: `${geometry.leftPercent}%`,
              top: 0,
              width: `${geometry.widthPercent}%`,
              height: blackKeyH,
              backgroundColor: active
                ? activeKeyColor(active, rootFingerKey, true)
                : "var(--palette-black)",
              border: "1px solid var(--border-strong)",
              borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
              zIndex: 1,
              transition: `background-color var(--duration-normal) var(--ease-out)`,
            }}
          >
            {active && label && (
              <span
                className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold"
                style={{
                  color:
                    displayMode === "notes"
                      ? rootNoteLabel
                        ? "var(--text-accent)"
                        : "var(--text-primary)"
                      : rootFingerKey
                        ? "var(--surface-base)"
                        : "var(--text-primary)",
                  fontSize: "8px",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
