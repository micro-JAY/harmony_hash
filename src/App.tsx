import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { Play, Square } from "lucide-react";
import type { Instrument, IndexedChord, ParseError, VoicingStyle, Workspace } from "./lib/types";
import Header from "./components/Header";
import type { NoteNeuralNetworkState } from "./components/NoteNeuralNetwork";
import ProgressionInput from "./components/ProgressionInput";
import ChordCard from "./components/ChordCard";
import { useT } from "./i18n/I18nContext";
import {
  computeVoiceLedProgression,
  EXPLICIT_VOICING_STYLES,
  isVoicingStyleAvailable,
} from "./lib/harmonyBrain";
import { lookupChord, parseNotes } from "./lib/chordData";
import { buildPlaybackSchedule, playSchedule } from "./lib/audioEngine";
import {
  createProgressionPlaybackController,
  type PlaybackControllerState,
} from "./lib/progressionPlayback";
import type { ChordModifierOption } from "./lib/chordModifiers";
import type { VoiceAgentRuntimeProps } from "./voice/VoiceAgentRuntime";
import VoiceRuntimeFallback from "./voice/VoiceRuntimeFallback";
import {
  builderProgressionFor,
  type CircleKey,
  type MoodId,
  type ScaleFormulaType,
} from "./lib/theory";
import { createProgressionBridge } from "./voice/progressionBridge";

const FretboardExplorer = lazy(() => import("./components/FretboardExplorer"));
const CircleOfFifths = lazy(() => import("./components/CircleOfFifths"));
const ScaleSynthesia = lazy(() => import("./components/ScaleSynthesia"));
const NoteNeuralNetwork = lazy(() => import("./components/NoteNeuralNetwork"));

let voiceRuntimePromise: Promise<typeof import("./voice/VoiceAgentRuntime")> | null = null;

function loadVoiceAgentRuntime() {
  if (!voiceRuntimePromise) {
    voiceRuntimePromise = import("./voice/VoiceAgentRuntime").catch((error: unknown) => {
      voiceRuntimePromise = null;
      throw error;
    });
  }
  return voiceRuntimePromise;
}

const PLAYBACK_BPM = 80;

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
  const [playbackPhase, setPlaybackPhase] = useState<PlaybackControllerState>("idle");
  // Voice-companion highlight, kept SEPARATE from activeChordIndex: the latter is
  // the playback cursor (isPlaying derives from it), so the agent highlighting a
  // chord must not look like playback or block the Play button / play tool.
  const [highlightedChordIndex, setHighlightedChordIndex] = useState<number | null>(null);

  useEffect(() => {
    if (import.meta.env.VITE_HH_E2E !== "true") return;

    const testWindow = window as Window & {
      __hhSetHanzFocus?: (index: number | null) => void;
    };
    testWindow.__hhSetHanzFocus = setHighlightedChordIndex;
    return () => {
      delete testWindow.__hhSetHanzFocus;
    };
  }, []);
  const [hanzOpen, setHanzOpen] = useState(false);
  const [voiceRuntimeRequested, setVoiceRuntimeRequested] = useState(false);
  const [VoiceAgentRuntime, setVoiceAgentRuntime] = useState<ComponentType<VoiceAgentRuntimeProps> | null>(null);
  const [voiceRuntimeFailed, setVoiceRuntimeFailed] = useState(false);
  const [moodId, setMoodId] = useState<MoodId | null>(null);
  const [scaleLaunch, setScaleLaunch] = useState<{
    root: string;
    scaleId: ScaleFormulaType;
    version: number;
  }>();
  const [noteNetworkState, setNoteNetworkState] = useState<NoteNeuralNetworkState>({
    root: "E",
    familyId: "harmonic_minor",
    relationship: "relative",
    selectedScaleId: "harmonic_minor",
  });
  const [playbackController] = useState(() =>
    createProgressionPlaybackController({
      createContext: createAudioContext,
      schedule: (voicings, context, onChordChange) =>
        playSchedule(buildPlaybackSchedule(voicings, PLAYBACK_BPM), context, onChordChange),
      onChordChange: setActiveChordIndex,
      onStateChange: setPlaybackPhase,
      onError: (error) => console.error("Progression playback failed", error),
    }),
  );
  const nextCardKeyRef = useRef(1);
  const timelineVersionRef = useRef(0);
  const [timelineVersion, setTimelineVersion] = useState(0);

  const handleCloseHanz = useCallback(() => {
    setHanzOpen(false);
    setHighlightedChordIndex(null);
  }, []);

  useEffect(() => {
    if (workspace !== "builder") handleCloseHanz();
  }, [handleCloseHanz, workspace]);

  const ensureVoiceRuntime = useCallback(() => {
    setVoiceRuntimeFailed(false);
    void loadVoiceAgentRuntime()
      .then((module) => {
        setVoiceAgentRuntime(() => module.default);
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : "Unknown dynamic import error";
        console.error("[harmony-hash-voice-runtime] Voice tools failed to load", detail);
        setVoiceRuntimeFailed(true);
      });
  }, []);

  const handleRequestVoice = useCallback(() => {
    setVoiceRuntimeRequested(true);
    setHanzOpen(true);
    ensureVoiceRuntime();
  }, [ensureVoiceRuntime]);

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
    playbackController.stop();
  }, [markTimelineMutation, playbackController]);

  const handleUseCircleKey = useCallback((key: CircleKey) => {
    const resolved: DisplayChord[] = [];
    for (const input of builderProgressionFor(key)) {
      const chord = lookupChord(input);
      if (!chord) {
        throw new Error(`Circle progression contains an unavailable chord: ${input}`);
      }
      resolved.push({ input, chord });
    }
    handleResult(resolved, []);
    setWorkspace("builder");
  }, [handleResult]);

  const handleOpenScale = useCallback((root: string, scaleId: ScaleFormulaType) => {
    setMoodId(null);
    setScaleLaunch((current) => ({ root, scaleId, version: (current?.version ?? 0) + 1 }));
    setWorkspace("scales");
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

  const isPlaying = playbackPhase === "playing";
  const isPlaybackStarting = playbackPhase === "starting";

  function startProgressionPlayback() {
    return playbackController.start(pianoVoicings);
  }

  function handleTogglePlayback() {
    if (playbackController.getState() !== "idle") {
      playbackController.stop();
      return;
    }
    void startProgressionPlayback();
  }

  // Stop any in-flight playback when the progression changes or the
  // component unmounts. The cleanup uses the ref snapshot at effect time.
  useEffect(() => {
    return () => {
      playbackController.stop();
    };
  }, [chords, pianoVoicings, playbackController]);

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
        const applicable = EXPLICIT_VOICING_STYLES.filter((style) =>
          isVoicingStyleAvailable(notes, style),
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
    playbackController.stop();
  }, [markTimelineMutation, playbackController]);

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
      if (!currentStyle || isVoicingStyleAvailable(parseNotes(option.chord.entry), currentStyle)) {
        return prev;
      }
      return { ...prev, [index]: "auto" };
    });
    playbackController.stop();
  }, [markTimelineMutation, playbackController]);

  // ── Voice companion bridge ──────────────────────────────────────────────
  // Tool callbacks fire OUTSIDE React's render cycle, so the bridge reads live
  // state through refs (never closing over the chords array) and calls the
  // latest randomize/playback closures via refs. Built once; deps are stable.
  const chordsRef = useRef(chords);
  const instrumentRef = useRef(instrument);
  const pianoVoicingsRef = useRef(pianoVoicings);
  const randomizeAllRef = useRef(randomizeAll);
  const startPlaybackRef = useRef(startProgressionPlayback);
  useEffect(() => {
    chordsRef.current = chords;
    instrumentRef.current = instrument;
    pianoVoicingsRef.current = pianoVoicings;
    randomizeAllRef.current = randomizeAll;
    startPlaybackRef.current = startProgressionPlayback;
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
        startPlayback: () => startPlaybackRef.current(),
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
              moodId={moodId}
              onMoodChange={setMoodId}
              chords={chords}
              onRequestVoice={handleRequestVoice}
              onVoiceIntent={ensureVoiceRuntime}
            />
          ) : (
            <Suspense
              fallback={(
                <section className="flex flex-1 items-center justify-center px-4 py-16" role="status">
                  <span className="readout">Loading {workspace}…</span>
                </section>
              )}
            >
              {workspace === "fretboard" ? (
                <FretboardExplorer />
              ) : workspace === "circle" ? (
                <CircleOfFifths onUseKey={handleUseCircleKey} />
              ) : workspace === "scales" ? (
                <ScaleSynthesia
                  key={scaleLaunch?.version ?? 0}
                  moodId={moodId}
                  onMoodChange={setMoodId}
                  initialRoot={scaleLaunch?.root}
                  initialScaleId={scaleLaunch?.scaleId}
                />
              ) : (
                <NoteNeuralNetwork
                  onOpenScale={handleOpenScale}
                  state={noteNetworkState}
                  onStateChange={setNoteNetworkState}
                />
              )}
            </Suspense>
          )}

          {/* Progression playback and voicing actions. */}
          <section
            className="w-full px-4"
            aria-label="Progression actions"
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
                      aria-label={
                        isPlaybackStarting
                          ? "Starting playback"
                          : isPlaying
                            ? "Stop playback"
                            : "Play progression"
                      }
                      aria-busy={isPlaybackStarting}
                      disabled={isPlaybackStarting}
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
                      {isPlaybackStarting ? "Starting…" : isPlaying ? "Stop" : "Play progression"}
                    </button>
                  )}

                </div>
              )}
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
                    priorVoicing={pianoVoicings[index - 1]}
                    pianoStyle={getPianoStyle(index)}
                    onPianoStyleChange={(style) => handlePianoStyleChange(index, style)}
                    onChordChange={(option) => replaceChordAt(index, option)}
                    isPlaying={activeChordIndex === index}
                    isAgentHighlighted={highlightedChordIndex === index}
                  />
                );
              })}
            </div>
          </section>
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
      {voiceRuntimeRequested ? (
        VoiceAgentRuntime ? (
          <VoiceAgentRuntime
            bridge={voiceBridge}
            agentId={import.meta.env.VITE_HH_VOICE_AGENT_ID ?? ""}
            signedUrlEndpoint="/api/voice/signed-url"
            open={hanzOpen}
            onClose={handleCloseHanz}
          />
        ) : hanzOpen ? (
          <VoiceRuntimeFallback
            failed={voiceRuntimeFailed}
            onClose={handleCloseHanz}
            onReload={() => window.location.reload()}
          />
        ) : null
      ) : null}
      </div>
  );
}

export default App;
