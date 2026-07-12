import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import type { Instrument, IndexedChord, ParseError, VoicingStyle, Workspace } from "./lib/types";
import Header from "./components/Header";
import ProgressionInput from "./components/ProgressionInput";
import ChordCard from "./components/ChordCard";
import { useT } from "./i18n/I18nContext";
import { computeVoiceLedProgression, isStyleApplicable } from "./lib/harmonyBrain";
import { parseNotes } from "./lib/chordData";
import { buildPlaybackSchedule, playSchedule, type PlaybackHandle } from "./lib/audioEngine";
import type { ChordModifierOption } from "./lib/chordModifiers";
import { VoiceAgentProvider, VoiceAgentPanel, createProgressionBridge } from "./voice";

const FretboardExplorer = lazy(() => import("./components/FretboardExplorer"));
const ImprovInsight = lazy(() => import("./components/ImprovInsight"));

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

// Reindex an index-keyed map/set after removing one position: drop the removed
// index and shift everything above it down by one, so per-card state stays
// aligned with the chords that remain.
function shiftIndexedRecord<T>(map: Record<number, T>, removed: number): Record<number, T> {
  const next: Record<number, T> = {};
  for (const key of Object.keys(map)) {
    const i = Number(key);
    if (i < removed) next[i] = map[i];
    else if (i > removed) next[i - 1] = map[i];
  }
  return next;
}

function shiftIndexedSet(set: ReadonlySet<number>, removed: number): Set<number> {
  const next = new Set<number>();
  for (const i of set) {
    if (i < removed) next.add(i);
    else if (i > removed) next.add(i - 1);
  }
  return next;
}

function App() {
  const t = useT();
  const [instrument, setInstrument] = useState<Instrument>("guitar");
  const [workspace, setWorkspace] = useState<Workspace>("builder");
  const [chords, setChords] = useState<DisplayChord[]>([]);
  const [cardKeys, setCardKeys] = useState<number[]>([]);
  const [cardVariants, setCardVariants] = useState<Record<number, number>>({});
  const [lockedCards, setLockedCards] = useState<Set<number>>(new Set());
  const [pianoStyles, setPianoStyles] = useState<Record<number, VoicingStyle>>({});
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  // Voice-companion highlight, kept SEPARATE from activeChordIndex: the latter is
  // the playback cursor (isPlaying derives from it), so the agent highlighting a
  // chord must not look like playback or block the Play button / play tool.
  const [highlightedChordIndex, setHighlightedChordIndex] = useState<number | null>(null);
  const [showImprovInsight, setShowImprovInsight] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const playbackHandleRef = useRef<PlaybackHandle | null>(null);
  const nextCardKeyRef = useRef(1);
  const timelineVersionRef = useRef(0);
  const [timelineVersion, setTimelineVersion] = useState(0);

  const markTimelineMutation = useCallback(() => {
    const nextVersion = timelineVersionRef.current + 1;
    timelineVersionRef.current = nextVersion;
    setTimelineVersion(nextVersion);
  }, []);

  const handleResult = useCallback((resolved: DisplayChord[], _errors: ParseError[]) => {
    markTimelineMutation();
    setChords(resolved);
    setCardKeys(resolved.map(() => nextCardKeyRef.current++));
    setCardVariants({});
    setLockedCards(new Set());
    setPianoStyles({});
    setHighlightedChordIndex(null);
    playbackHandleRef.current?.stop();
  }, [markTimelineMutation]);

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

  // Remove one chord and REINDEX the per-card maps so surviving chords keep their
  // variant/lock/style choices (index-keyed state would otherwise misalign). The
  // voice companion's remove_chord tool uses this — an intentionally LOCAL edit,
  // unlike handleResult which resets the whole timeline.
  const removeChordAt = useCallback((index: number) => {
    markTimelineMutation();
    setChords((prev) => prev.filter((_, i) => i !== index));
    setCardKeys((prev) => prev.filter((_, i) => i !== index));
    setCardVariants((prev) => shiftIndexedRecord(prev, index));
    setPianoStyles((prev) => shiftIndexedRecord(prev, index));
    setLockedCards((prev) => shiftIndexedSet(prev, index));
    setHighlightedChordIndex((h) =>
      h === null || h === index ? null : h > index ? h - 1 : h,
    );
    playbackHandleRef.current?.stop();
  }, [markTimelineMutation]);

  const replaceChordAt = useCallback((index: number, option: ChordModifierOption) => {
    markTimelineMutation();
    setChords((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index ? { input: option.label, chord: option.chord } : item,
      ),
    );
    setCardVariants((prev) => ({
      ...prev,
      [index]: clampVariant(prev[index] ?? 1, option.chord.variationCount),
    }));
    setPianoStyles((prev) => {
      const currentStyle = prev[index];
      if (!currentStyle || isStyleApplicable(parseNotes(option.chord.entry), currentStyle)) {
        return prev;
      }
      return { ...prev, [index]: "auto" };
    });
    playbackHandleRef.current?.stop();
  }, [markTimelineMutation]);

  // ── Voice companion bridge ──────────────────────────────────────────────
  // Tool callbacks fire OUTSIDE React's render cycle, so the bridge reads live
  // state through refs (never closing over the chords array) and calls the
  // latest randomize/playback closures via refs. Built once; deps are stable.
  const chordsRef = useRef(chords);
  const instrumentRef = useRef(instrument);
  const activeIndexRef = useRef(activeChordIndex);
  const pianoVoicingsRef = useRef(pianoVoicings);
  const randomizeAllRef = useRef(randomizeAll);
  const togglePlaybackRef = useRef(handleTogglePlayback);
  useEffect(() => {
    chordsRef.current = chords;
    instrumentRef.current = instrument;
    activeIndexRef.current = activeChordIndex;
    pianoVoicingsRef.current = pianoVoicings;
    randomizeAllRef.current = randomizeAll;
    togglePlaybackRef.current = handleTogglePlayback;
  });

  // Built once and stable. Every method reads live state through the refs above
  // and runs only when an ElevenLabs tool callback fires — outside React's render
  // cycle — and the bridge renders nothing. The react-hooks/refs rule can't see
  // that these reads are deferred, so it's disabled on this construction only.
  const voiceBridge = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- ref reads run on tool-callback invocation, never during render (the mandated ref-mirror pattern)
      createProgressionBridge({
        getChords: () => chordsRef.current,
        getInstrument: () => instrumentRef.current,
        getVoicings: () => pianoVoicingsRef.current,
        setProgression: (next) => handleResult(next, []),
        appendChords: (next) => {
          markTimelineMutation();
          const newKeys = next.map(() => nextCardKeyRef.current++);
          setChords((prev) => [...prev, ...next]);
          setCardKeys((prev) => [...prev, ...newKeys]);
        },
        removeChordAt: (index) => removeChordAt(index),
        startPlayback: () => {
          if (activeIndexRef.current === null) togglePlaybackRef.current();
        },
        randomizeVoicings: () => randomizeAllRef.current(),
        setHighlight: (index) => setHighlightedChordIndex(index),
      }),
    [handleResult, markTimelineMutation, removeChordAt],
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        instrument={instrument}
        onInstrumentChange={setInstrument}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
      />

      <VoiceAgentProvider
        bridge={voiceBridge}
        agentId={import.meta.env.VITE_HH_VOICE_AGENT_ID ?? ""}
        signedUrlEndpoint="/api/voice/signed-url"
      >
        <main
          className={workspace === "builder"
            ? "flex-1 flex flex-col gap-5 py-5 md:gap-8 md:py-8"
            : "flex-1 flex flex-col gap-5 pb-6"
          }
        >
          {workspace === "builder" ? (
            <ProgressionInput
              onResult={handleResult}
              timelineVersion={timelineVersion}
              timelineVersionRef={timelineVersionRef}
            />
          ) : (
            <Suspense
              fallback={(
                <section className="flex flex-1 items-center justify-center px-4 py-16" role="status">
                  <span className="readout">Loading fretboard…</span>
                </section>
              )}
            >
              <FretboardExplorer />
            </Suspense>
          )}

          {/* The provider, panel, and tree position remain stable across both
              workspaces so navigation never tears down an active session. */}
          <section
            className="w-full px-4"
            aria-label={workspace === "builder" ? "Progression actions" : "Workspace companion"}
          >
            <div className="w-full flex flex-col items-stretch justify-center gap-3 md:flex-row md:flex-wrap md:items-start">
              {workspace === "builder" && (
                <div
                  className={`flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center ${chords.length > 0 ? "" : "hidden"}`}
                >
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

                  {instrument === "piano" && (
                    <button
                      type="button"
                      onClick={handleTogglePlayback}
                      aria-label={isPlaying ? "Stop playback" : "Play progression"}
                      className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all"
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
                  )}

                  <button
                    type="button"
                    onClick={() => setShowImprovInsight((current) => !current)}
                    aria-expanded={showImprovInsight}
                    aria-controls="improv-insight-panel"
                    className="px-5 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      backgroundColor: showImprovInsight
                        ? "var(--interactive-academy-bg)"
                        : "var(--interactive-secondary-bg)",
                      color: showImprovInsight
                        ? "var(--interactive-academy-text)"
                        : "var(--interactive-secondary-text)",
                      border: `1px solid ${showImprovInsight
                        ? "var(--interactive-academy-border)"
                        : "var(--interactive-secondary-border)"}`,
                      transitionDuration: "var(--duration-normal)",
                    }}
                  >
                    {showImprovInsight ? "Hide compatible scales" : "Show compatible scales"}
                  </button>
                </div>
              )}

              <VoiceAgentPanel />
            </div>
          </section>

          {workspace === "builder" && chords.length > 0 && (
          <section
            className="w-full max-w-7xl mx-auto px-4"
            aria-label="Chord cards output"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:flex lg:flex-wrap lg:justify-center">
              {chords.map((chordResult, index) => {
                const maxVariants = chordResult.chord.variationCount;
                return (
                  <ChordCard
                    key={cardKeys[index] ?? index}
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
                    onChordChange={(option) => replaceChordAt(index, option)}
                    isPlaying={activeChordIndex === index || highlightedChordIndex === index}
                  />
                );
              })}
            </div>
          </section>
          )}

          {workspace === "builder" && chords.length > 0 && showImprovInsight && (
            <Suspense
              fallback={(
                <section className="w-full px-4" aria-label="Improv Insight" role="status">
                  <div
                    className="mx-auto max-w-7xl rounded-2xl p-6"
                    style={{ backgroundColor: "var(--surface-raised)", border: "1px solid var(--border-subtle)" }}
                  >
                    <span className="readout">Ranking compatible scales…</span>
                  </div>
                </section>
              )}
            >
              <ImprovInsight chords={chords} />
            </Suspense>
          )}

          {workspace === "builder" && chords.length === 0 && (
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
      </VoiceAgentProvider>
    </div>
  );
}

export default App;
