import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Instrument, IndexedChord, ParseError, VoicingStyle } from "./lib/types";
import Header from "./components/Header";
import ProgressionInput from "./components/ProgressionInput";
import ChordCard from "./components/ChordCard";
import { useT } from "./i18n/I18nContext";
import { computeVoiceLedProgression, isStyleApplicable } from "./lib/harmonyBrain";
import { parseNotes } from "./lib/chordData";
import { buildPlaybackSchedule, playSchedule, type PlaybackHandle } from "./lib/audioEngine";

// Explicit (non-Auto) styles randomize cycles through. Auto is omitted
// because it would defeat the "shake it up" intent of the button.
const RANDOM_PIANO_STYLES: ReadonlyArray<VoicingStyle> = [
  "drop2",
  "drop3",
  "rootless",
  "shell",
  "spread",
  "two-hand",
];

const PLAYBACK_BPM = 80;

interface AudioContextLike {
  state: "suspended" | "running" | "closed";
  resume(): Promise<void>;
}

function createAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  return new Ctor();
}

interface DisplayChord {
  input: string;
  chord: IndexedChord;
}

function clampVariant(variant: number, maxVariants: number): number {
  if (!Number.isFinite(variant)) return 1;
  if (maxVariants <= 1) return 1;
  if (variant < 1) return 1;
  if (variant > maxVariants) return maxVariants;
  return Math.floor(variant);
}

function App() {
  const t = useT();
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [chords, setChords] = useState<DisplayChord[]>([]);
  const [cardVariants, setCardVariants] = useState<Record<number, number>>({});
  const [lockedCards, setLockedCards] = useState<Set<number>>(new Set());
  const [pianoStyles, setPianoStyles] = useState<Record<number, VoicingStyle>>({});
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackHandleRef = useRef<PlaybackHandle | null>(null);

  const handleResult = useCallback((resolved: DisplayChord[], _errors: ParseError[]) => {
    setChords(resolved);
    setCardVariants({});
    setLockedCards(new Set());
    setPianoStyles({});
    playbackHandleRef.current?.stop();
  }, []);

  const getPianoStyle = useCallback(
    (index: number): VoicingStyle => pianoStyles[index] ?? "auto",
    [pianoStyles],
  );

  function handlePianoStyleChange(index: number, style: VoicingStyle) {
    setPianoStyles((prev) => ({ ...prev, [index]: style }));
  }

  function getVariantForCard(index: number, maxVariants: number): number {
    return clampVariant(cardVariants[index] ?? 1, maxVariants);
  }

  function handleCardVariantChange(index: number, nextVariant: number, maxVariants: number) {
    setCardVariants((prev) => ({
      ...prev,
      [index]: clampVariant(nextVariant, maxVariants),
    }));
  }

  function handleToggleLock(index: number) {
    setLockedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const pianoVoicings = useMemo(() => {
    const noteSets = chords.map((c) => parseNotes(c.chord.entry));
    const styles = chords.map((_, i) => getPianoStyle(i));
    return computeVoiceLedProgression(noteSets, styles);
  }, [chords, getPianoStyle]);

  const isPlaying = activeChordIndex !== null;

  function handleTogglePlayback() {
    if (isPlaying) {
      playbackHandleRef.current?.stop();
      return;
    }
    if (pianoVoicings.length === 0) return;
    if (!audioContextRef.current) {
      audioContextRef.current = createAudioContext();
    }
    const ctx = audioContextRef.current;
    if (!ctx) return;
    if ((ctx as AudioContextLike).state === "suspended") {
      void (ctx as AudioContextLike).resume();
    }
    const schedule = buildPlaybackSchedule(pianoVoicings, PLAYBACK_BPM);
    playbackHandleRef.current = playSchedule(schedule, ctx, setActiveChordIndex);
  }

  // Stop any in-flight playback when the progression changes or the
  // component unmounts. The cleanup uses the ref snapshot at effect time.
  useEffect(() => {
    return () => {
      playbackHandleRef.current?.stop();
    };
  }, [chords, pianoVoicings]);

  function randomizeAll() {
    if (instrument === "guitar") {
      setCardVariants((prev) => {
        const next = { ...prev };
        chords.forEach((chordResult, index) => {
          const maxVariants = chordResult.chord.variationCount;
          if (lockedCards.has(index)) {
            next[index] = clampVariant(prev[index] ?? 1, maxVariants);
            return;
          }
          next[index] = maxVariants > 1 ? Math.floor(Math.random() * maxVariants) + 1 : 1;
        });
        return next;
      });
      return;
    }
    // Piano: pick a random applicable explicit style per unlocked card.
    setPianoStyles((prev) => {
      const next = { ...prev };
      chords.forEach((chordResult, index) => {
        if (lockedCards.has(index)) return;
        const notes = parseNotes(chordResult.chord.entry);
        const applicable = RANDOM_PIANO_STYLES.filter((style) =>
          isStyleApplicable(notes, style),
        );
        if (applicable.length === 0) {
          next[index] = "auto";
          return;
        }
        next[index] = applicable[Math.floor(Math.random() * applicable.length)];
      });
      return next;
    });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header instrument={instrument} onInstrumentChange={setInstrument} />

      <main className="flex-1 flex flex-col gap-8 py-8">
        {/* Input Section */}
        <ProgressionInput onResult={handleResult} chordsEmpty={chords.length === 0} />

        {/* Action Bar */}
        {chords.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={randomizeAll}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: "var(--interactive-warm-bg)",
                color: "var(--interactive-warm-text)",
                border: "1px solid var(--interactive-warm-border)",
                fontWeight: "var(--weight-medium)",
                transitionDuration: "var(--duration-normal)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-warm-bg-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--interactive-warm-bg)";
              }}
            >
              {instrument === "guitar" ? "Randomize All Variants" : "Randomize All Voicings"}
            </button>
          </div>
        )}

        {/* Playback bar (piano only) */}
        {chords.length > 0 && instrument === "piano" && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleTogglePlayback}
              aria-label={isPlaying ? "Stop playback" : "Play progression"}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: isPlaying
                  ? "var(--interactive-accent-bg)"
                  : "var(--interactive-warm-bg)",
                color: isPlaying
                  ? "var(--interactive-accent-text)"
                  : "var(--interactive-warm-text)",
                border: `1px solid ${isPlaying ? "var(--interactive-accent-border)" : "var(--interactive-warm-border)"}`,
                fontWeight: "var(--weight-medium)",
                transitionDuration: "var(--duration-normal)",
                fontFamily: "var(--font-body)",
              }}
            >
              {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              {isPlaying ? "Stop" : "Play progression"}
            </button>
          </div>
        )}

        {/* Chord Cards */}
        {chords.length > 0 && (
          <section className="w-full max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-4">
              {chords.map((chordResult, index) => {
                const maxVariants = chordResult.chord.variationCount;
                return (
                  <ChordCard
                    key={`${chordResult.input}-${index}`}
                    chord={chordResult.chord}
                    instrument={instrument}
                    displayName={chordResult.input}
                    variant={getVariantForCard(index, maxVariants)}
                    onVariantChange={(nextVariant) =>
                      handleCardVariantChange(index, nextVariant, maxVariants)
                    }
                    isLocked={lockedCards.has(index)}
                    onToggleLock={() => handleToggleLock(index)}
                    voicing={pianoVoicings[index]}
                    pianoStyle={getPianoStyle(index)}
                    onPianoStyleChange={(style) => handlePianoStyleChange(index, style)}
                    isPlaying={activeChordIndex === index}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {chords.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p
              className="text-center max-w-md"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}
            >
              {t("emptyStateHint")}
              <br />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                Try: Cmaj7 Am9 Dm7 G7
              </span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
