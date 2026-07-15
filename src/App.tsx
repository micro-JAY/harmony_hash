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
import type {
  Instrument,
  IndexedChord,
  ParseError,
  ScaleType,
  VoicingStyle,
  Workspace,
} from "./lib/types";
import Header from "./components/Header";
import OnboardingModal from "./components/OnboardingModal";
import type { NoteNeuralNetworkState } from "./components/NoteNeuralNetwork";
import type {
  TheoryDisclosures,
  TheoryWorkspaceContext,
} from "./components/TheoryWorkspace";
import ProgressionInput from "./components/ProgressionInput";
import ShareProgression from "./components/ShareProgression";
import ChordCard from "./components/ChordCard";
import { useT } from "./i18n/I18nContext";
import {
  computeVoiceLedProgression,
  EXPLICIT_VOICING_STYLES,
  isVoicingStyleAvailable,
} from "./lib/harmonyBrain";
import { getSvgPath, lookupChord, parseNotes } from "./lib/chordData";
import { buildMidiPlaybackSchedule, playSchedule } from "./lib/audioEngine";
import {
  createProgressionPlaybackController,
  type PlaybackControllerState,
} from "./lib/progressionPlayback";
import type { ChordModifierOption } from "./lib/chordModifiers";
import type { VoiceAgentRuntimeProps } from "./voice/VoiceAgentRuntime";
import VoiceRuntimeFallback from "./voice/VoiceRuntimeFallback";
import {
  builderProgressionFor,
  DEFAULT_THEORY_CONTEXT,
  scaleLearningDefinitionFor,
  scaleSynthesiaToHasherHandoff,
  type HarmonyContext,
  type CircleKey,
  type ScaleFormulaType,
} from "./lib/theory";
import { createProgressionBridge } from "./voice/progressionBridge";
import {
  parseProgressionShareUrl,
  type ProgressionShareParseResult,
} from "./lib/progressionShare";
import {
  remapIndex,
  remapIndexedRecord,
  remapIndexedSet,
  reconcileTimeline,
  transactTimeline,
  type TimelineDraftItem,
  type TimelineItem,
  type TimelineItemId,
  type TimelineMutation,
  type TimelineTransactionResult,
} from "./lib/timelineTransactions";
import type { GuitarMidiVoicing } from "./lib/guitarPlayback";
import {
  isExplicitOnboardingDismissal,
  onboardingPersistence,
  type OnboardingCloseReason,
} from "./lib/onboardingPersistence";

const FretboardExplorer = lazy(() => import("./components/FretboardExplorer"));
const TheoryWorkspace = lazy(() => import("./components/TheoryWorkspace"));
const ImprovInsight = lazy(() => import("./components/ImprovInsight"));

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

function readInitialProgressionShare(): ProgressionShareParseResult {
  if (typeof window === "undefined") return { status: "absent" };
  return parseProgressionShareUrl(window.location.href);
}

function App() {
  const t = useT();
  const [initialShare] = useState(readInitialProgressionShare);
  const importedChordCount = initialShare.status === "valid" ? initialShare.share.chords.length : 0;
  const [instrument, setInstrument] = useState<Instrument>(() =>
    initialShare.status === "valid" ? initialShare.share.instrument : "guitar",
  );
  const [workspace, setWorkspace] = useState<Workspace>("builder");
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const [onboardingOpen, setOnboardingOpen] = useState(
    () => !onboardingPersistence.isDismissed(),
  );
  const [timeline, setTimeline] = useState<Array<TimelineItem<DisplayChord>>>(() =>
    initialShare.status === "valid"
      ? initialShare.share.chords.map(({ input, chord }, index) => ({
          id: index + 1,
          value: { input, chord },
        }))
      : [],
  );
  const timelineRef = useRef(timeline);
  const chords = useMemo(() => timeline.map((item) => item.value), [timeline]);
  const chordsRef = useRef(chords);
  const [cardVariants, setCardVariants] = useState<Record<number, number>>({});
  const [guitarPlaybackVoicings, setGuitarPlaybackVoicings] = useState<
    Record<TimelineItemId, GuitarMidiVoicing>
  >({});
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
  const [hasherContext, setHasherContext] = useState<HarmonyContext>({
    key: "C",
    scaleType: "major",
  });
  const [improvOpen, setImprovOpen] = useState(false);
  const [improvOpenedFromTheory, setImprovOpenedFromTheory] = useState(false);
  const [improvTheoryContext, setImprovTheoryContext] = useState<{
    readonly root: string;
    readonly scaleId: ScaleFormulaType;
  } | null>(null);
  const [theoryContext, setTheoryContext] = useState<TheoryWorkspaceContext>(
    DEFAULT_THEORY_CONTEXT,
  );
  const [theoryDisclosures, setTheoryDisclosures] = useState<TheoryDisclosures>({
    circle: true,
    scales: false,
    network: false,
  });
  const [hasherContextLaunch, setHasherContextLaunch] = useState<{
    key: string;
    scaleType?: ScaleType;
    notice?: string;
    version: number;
  }>();
  const [noteNetworkState, setNoteNetworkState] = useState<NoteNeuralNetworkState>({
    root: "C",
    familyId: "major",
    relationship: "relative",
    selectedScaleId: "major",
  });
  const [playbackController] = useState(() =>
    createProgressionPlaybackController({
      createContext: createAudioContext,
      schedule: (request, context, onChordChange) =>
        playSchedule(
          buildMidiPlaybackSchedule(
            request.voicings,
            request.bpm,
            request.beatsPerChord,
          ),
          context,
          onChordChange,
          request.timbre,
        ),
      onChordChange: setActiveChordIndex,
      onStateChange: setPlaybackPhase,
      onError: (error) => console.error("Progression playback failed", error),
    }),
  );
  const nextCardKeyRef = useRef(importedChordCount + 1);
  const initialTimelineVersion = importedChordCount > 0 ? 1 : 0;
  const timelineVersionRef = useRef(initialTimelineVersion);
  const [timelineVersion, setTimelineVersion] = useState(initialTimelineVersion);

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
    const nextTimeline = resolved.map((value) => ({
      id: nextCardKeyRef.current++,
      value,
    }));
    markTimelineMutation();
    chordsRef.current = resolved;
    timelineRef.current = nextTimeline;
    setTimeline(nextTimeline);
    setCardVariants({});
    setGuitarPlaybackVoicings({});
    setLockedCards(new Set());
    setPianoStyles({});
    setHighlightedChordIndex(null);
    playbackController.stop();
  }, [markTimelineMutation, playbackController]);

  const commitTimelineTransaction = useCallback((
    transaction: TimelineTransactionResult<TimelineItem<DisplayChord>>,
  ) => {
    if (!transaction.changed) return false;

    const nextTimeline = [...transaction.items];
    const nextChords = nextTimeline.map((item) => item.value);
    timelineRef.current = nextTimeline;
    chordsRef.current = nextChords;
    markTimelineMutation();
    setTimeline(nextTimeline);
    setCardVariants((current) => remapIndexedRecord(current, transaction.map));
    const survivingIds = new Set(nextTimeline.map((item) => item.id));
    setGuitarPlaybackVoicings((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => survivingIds.has(Number(id))),
    ));
    setPianoStyles((current) => remapIndexedRecord(current, transaction.map));
    setLockedCards((current) => remapIndexedSet(current, transaction.map));
    setHighlightedChordIndex((current) => remapIndex(current, transaction.map));
    setActiveChordIndex(null);
    playbackController.stop();
    return true;
  }, [markTimelineMutation, playbackController]);

  const applyTimelineMutation = useCallback((mutation: TimelineMutation<DisplayChord>) => {
    const timelineMutation: TimelineMutation<TimelineItem<DisplayChord>> = mutation.type === "insert"
      ? {
          type: "insert",
          boundary: mutation.boundary,
          item: { id: nextCardKeyRef.current++, value: mutation.item },
        }
      : mutation;
    return commitTimelineTransaction(transactTimeline(timelineRef.current, timelineMutation));
  }, [commitTimelineTransaction]);

  const applyTimelineDraft = useCallback((
    draft: readonly TimelineDraftItem<string>[],
  ): readonly TimelineItem<DisplayChord>[] => {
    const currentById = new Map(
      timelineRef.current.map((item) => [item.id, item] as const),
    );
    const target = draft.map((draftItem): TimelineItem<DisplayChord> => {
      const chord = lookupChord(draftItem.value);
      if (!chord) {
        throw new Error(`Composer draft contains an unavailable chord: ${draftItem.value}`);
      }
      if (draftItem.id !== null) {
        const existing = currentById.get(draftItem.id);
        if (!existing) {
          throw new Error(`Composer draft references stale timeline item ${draftItem.id}`);
        }
        if (existing.value.input === draftItem.value) return existing;
        return { id: existing.id, value: { input: draftItem.value, chord } };
      }
      return {
        id: nextCardKeyRef.current++,
        value: { input: draftItem.value, chord },
      };
    });
    const transaction = reconcileTimeline(timelineRef.current, target);
    commitTimelineTransaction(transaction);
    return transaction.items;
  }, [commitTimelineTransaction]);

  const appendChordsToTimeline = useCallback((next: DisplayChord[]) => {
    if (next.length === 0) return;
    const appendedItems = next.map((value) => ({
      id: nextCardKeyRef.current++,
      value,
    }));
    const appendedTimeline = [...timelineRef.current, ...appendedItems];
    const appended = appendedTimeline.map((item) => item.value);
    timelineRef.current = appendedTimeline;
    chordsRef.current = appended;
    markTimelineMutation();
    setTimeline(appendedTimeline);
    setActiveChordIndex(null);
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

  const handleUseScaleInHasher = useCallback((root: string, scaleId: ScaleFormulaType) => {
    const handoff = scaleSynthesiaToHasherHandoff(root, scaleId);
    const scaleLabel = t(scaleLearningDefinitionFor(scaleId).label);
    setHasherContextLaunch((current) => ({
      key: handoff.root,
      scaleType: handoff.kind === "supported-mode" ? handoff.mode : undefined,
      notice: handoff.kind === "supported-mode"
        ? undefined
        : `${scaleLabel} is not a Hasher preset mode. Root ${root}, formula ${handoff.formula.join(" · ")}, and notes ${handoff.notes.join(" · ")} were kept for Free Input.`,
      version: (current?.version ?? 0) + 1,
    }));
    setWorkspace("builder");
  }, [t]);

  const handleTheoryDisclosureChange = useCallback((
    tool: keyof TheoryDisclosures,
    expanded: boolean,
  ) => {
    setTheoryDisclosures((current) => ({ ...current, [tool]: expanded }));
  }, []);

  const handleOpenTheoryImprov = useCallback((root: string) => {
    setImprovTheoryContext({ root, scaleId: theoryContext.scaleId });
    setImprovOpenedFromTheory(true);
    setImprovOpen(true);
    setWorkspace("builder");
    requestAnimationFrame(() => {
      document.getElementById("hasher-improv-insight")?.focus();
    });
  }, [theoryContext.scaleId]);

  const handleToggleImprov = useCallback(() => {
    if (!improvOpen) {
      setImprovTheoryContext(null);
      setImprovOpenedFromTheory(false);
      setImprovOpen(true);
      return;
    }
    setImprovOpen(false);
    if (!improvOpenedFromTheory) return;
    setImprovOpenedFromTheory(false);
    setWorkspace("theory");
    requestAnimationFrame(() => {
      document.getElementById("theory-circle-improv-trigger")?.focus();
    });
  }, [improvOpen, improvOpenedFromTheory]);

  const theoryActive = workspace === "theory"
    || workspace === "circle"
    || workspace === "scales"
    || workspace === "network";

  useEffect(() => {
    if (workspace !== "circle" && workspace !== "scales" && workspace !== "network") return;
    setTheoryDisclosures((current) => ({ ...current, [workspace]: true }));
  }, [workspace]);

  const getPianoStyle = useCallback(
    (index: number): VoicingStyle => pianoStyles[index] ?? "auto",
    [pianoStyles],
  );

  function handlePianoStyleChange(index: number, style: VoicingStyle) {
    playbackController.stop();
    setPianoStyles((prev) => ({ ...prev, [index]: style }));
  }

  const getVariantForCard = useCallback(
    (index: number, maxVariants: number): number =>
      clampVariant(cardVariants[index] ?? 1, maxVariants),
    [cardVariants],
  );

  function handleCardVariantChange(index: number, nextVariant: number, maxVariants: number) {
    playbackController.stop();
    const itemId = timeline[index]?.id;
    if (itemId !== undefined) {
      setGuitarPlaybackVoicings((current) => {
        if (!(itemId in current)) return current;
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
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
  const indexedTimelineChords = useMemo(
    () => chords.map((chord) => chord.chord),
    [chords],
  );
  const guitarMidiVoicings = useMemo(() => timeline.map((item, index) => {
    const variant = getVariantForCard(index, item.value.chord.variationCount);
    const expectedPath = getSvgPath(item.value.chord, variant);
    const voicing = guitarPlaybackVoicings[item.id];
    return expectedPath && voicing?.sourcePath === expectedPath
      ? voicing.notes.map((note) => note.midi)
      : [];
  }), [getVariantForCard, guitarPlaybackVoicings, timeline]);
  const guitarPlaybackReady = guitarMidiVoicings.length > 0
    && guitarMidiVoicings.every((voicing) => voicing.length > 0);

  const isPlaying = playbackPhase === "playing";
  const isPlaybackStarting = playbackPhase === "starting";

  function startProgressionPlayback() {
    return playbackController.start({
      timbre: instrument,
      voicings: instrument === "piano"
        ? pianoVoicings.map((voicing) => voicing.notes.map((note) => note.midi))
        : guitarMidiVoicings,
      bpm: PLAYBACK_BPM,
      beatsPerChord: 2,
    });
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
    playbackController.stop();
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

  const removeChordAt = useCallback((index: number) => {
    applyTimelineMutation({ type: "remove", index });
  }, [applyTimelineMutation]);

  const replaceChordAt = useCallback((index: number, option: ChordModifierOption) => {
    const currentTimeline = timelineRef.current;
    if (!Number.isInteger(index) || index < 0 || index >= currentTimeline.length) {
      throw new RangeError(`Chord replacement index ${index} is outside the timeline`);
    }
    const nextTimeline = currentTimeline.map((item, itemIndex) =>
      itemIndex === index
        ? { ...item, value: { input: option.label, chord: option.chord } }
        : item,
    );
    const nextChords = nextTimeline.map((item) => item.value);
    timelineRef.current = nextTimeline;
    chordsRef.current = nextChords;
    const itemId = currentTimeline[index].id;
    setGuitarPlaybackVoicings((current) => {
      if (!(itemId in current)) return current;
      const next = { ...current };
      delete next[itemId];
      return next;
    });
    markTimelineMutation();
    setTimeline(nextTimeline);
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
  const instrumentRef = useRef(instrument);
  const pianoVoicingsRef = useRef(pianoVoicings);
  const randomizeAllRef = useRef(randomizeAll);
  const startPlaybackRef = useRef(startProgressionPlayback);
  useEffect(() => {
    timelineRef.current = timeline;
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
        appendChords: appendChordsToTimeline,
        removeChordAt: (index) => removeChordAt(index),
        startPlayback: () => startPlaybackRef.current(),
        randomizeVoicings: () => randomizeAllRef.current(),
        setHighlight: (index) => setHighlightedChordIndex(index),
      }),
    [appendChordsToTimeline, handleResult, removeChordAt],
  );

  const handleInstrumentChange = useCallback((nextInstrument: Instrument) => {
    playbackController.stop();
    setInstrument(nextInstrument);
  }, [playbackController]);

  const handleOnboardingClose = useCallback((reason: OnboardingCloseReason) => {
    if (isExplicitOnboardingDismissal(reason)) onboardingPersistence.dismiss();
    setOnboardingOpen(false);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        instrument={instrument}
        onInstrumentChange={handleInstrumentChange}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onOpenHelp={() => setOnboardingOpen(true)}
        helpButtonRef={helpButtonRef}
      />

      <main
        className={workspace === "builder"
          ? "flex-1 flex flex-col gap-5 py-5 md:gap-8 md:py-8"
          : "flex-1 flex flex-col gap-5 pb-6"
        }
      >
          {workspace === "builder" && initialShare.status === "invalid" ? (
            <section className="w-full px-4" aria-label={t("Shared progression status")}>
              <p
                role="alert"
                className="mx-auto max-w-3xl rounded-lg"
                style={{
                  marginTop: 0,
                  marginBottom: 0,
                  padding: "var(--space-3) var(--space-4)",
                  color: "var(--status-error-text)",
                  backgroundColor: "var(--status-error-bg)",
                  border: "1px solid var(--status-error-border)",
                  fontSize: "var(--text-sm)",
                  lineHeight: "var(--leading-normal)",
                }}
              >
                {initialShare.message} {t("Start a new progression below.")}
              </p>
            </section>
          ) : null}

          <div hidden={workspace !== "builder"}>
            <ProgressionInput
              onResult={handleResult}
              onApplyTimelineDraft={applyTimelineDraft}
              onContextChange={setHasherContext}
              timeline={timeline}
              timelineVersion={timelineVersion}
              timelineVersionRef={timelineVersionRef}
              onRequestVoice={handleRequestVoice}
              onVoiceIntent={ensureVoiceRuntime}
              contextLaunch={hasherContextLaunch}
            />
          </div>

          {workspace === "fretboard" ? (
            <Suspense
              fallback={(
                <section className="flex flex-1 items-center justify-center px-4 py-16" role="status">
                  <span className="readout">{t(`Loading ${workspace}…`)}</span>
                </section>
              )}
            >
              <FretboardExplorer />
            </Suspense>
          ) : null}

          <div hidden={!theoryActive}>
            <Suspense
              fallback={(
                <section className="flex flex-1 items-center justify-center px-4 py-16" role="status">
                  <span className="readout">{t("Loading Tune Toolbox…")}</span>
                </section>
              )}
            >
              <TheoryWorkspace
                active={theoryActive}
                context={theoryContext}
                onContextChange={setTheoryContext}
                disclosures={theoryDisclosures}
                onDisclosureChange={handleTheoryDisclosureChange}
                networkState={noteNetworkState}
                onNetworkStateChange={setNoteNetworkState}
                onUseCircleKey={handleUseCircleKey}
                onUseScaleInHasher={handleUseScaleInHasher}
                onOpenImprov={handleOpenTheoryImprov}
              />
            </Suspense>
          </div>

          {/* Progression playback and voicing actions. */}
          <section
            className="w-full px-4"
            aria-label={t("Progression actions")}
            data-hasher-key={hasherContext.key}
            data-hasher-mode={hasherContext.scaleType}
          >
            <div className="w-full flex flex-col items-stretch justify-center gap-3 md:flex-row md:flex-wrap md:items-start">
              {workspace === "builder" && (
                <div
                  className={`flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center ${chords.length > 0 ? "" : "hidden"}`}
                >
                  <button
                    onClick={randomizeAll}
                    className="hh-action transition-all"
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
                    {t(instrument === "guitar" ? "Randomize All Variants" : "Randomize All Voicings")}
                  </button>

                  <button
                      type="button"
                      onClick={handleTogglePlayback}
                      aria-label={
                        isPlaybackStarting
                          ? t("Starting playback")
                          : isPlaying
                            ? t("Stop playback")
                            : t("Play progression")
                      }
                      aria-busy={isPlaybackStarting}
                      disabled={isPlaybackStarting || (instrument === "guitar" && !guitarPlaybackReady)}
                      className="hh-action transition-all"
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
                      {t(isPlaybackStarting ? "Starting…" : isPlaying ? "Stop" : "Play progression")}
                    </button>

                  <ShareProgression instrument={instrument} chords={chords} />

                  <button
                    type="button"
                    aria-expanded={improvOpen}
                    aria-controls="hasher-improv-insight"
                    onClick={handleToggleImprov}
                    className="hh-action transition-all"
                    style={{
                      backgroundColor: improvOpen
                        ? "var(--interactive-academy-bg-hover)"
                        : "var(--interactive-academy-bg)",
                      color: "var(--interactive-academy-text)",
                      border: "1px solid var(--interactive-academy-border)",
                      fontWeight: "var(--weight-medium)",
                    }}
                  >
                    {t("Improv Insight")}
                  </button>

                  <button
                    type="button"
                    onClick={handleRequestVoice}
                    onPointerEnter={ensureVoiceRuntime}
                    onFocus={ensureVoiceRuntime}
                    className="hh-action transition-all"
                    style={{
                      backgroundColor: "var(--interactive-secondary-bg)",
                      color: "var(--interactive-secondary-text)",
                      border: "1px solid var(--interactive-secondary-border)",
                      fontWeight: "var(--weight-medium)",
                    }}
                  >
                    {t("Hanz")}
                  </button>
                </div>
              )}
            </div>
          </section>

          {workspace === "builder" && improvOpen && (chords.length > 0 || improvOpenedFromTheory) ? (
            <section id="hasher-improv-insight" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4">
              <Suspense fallback={<span className="readout">{t("Loading Improv Insight…")}</span>}>
                <ImprovInsight
                  chords={chords}
                  moodId={null}
                  theoryContext={improvTheoryContext}
                  expanded
                  hideTrigger
                  onExpandedChange={setImprovOpen}
                  onClose={handleToggleImprov}
                />
              </Suspense>
            </section>
          ) : null}

          {workspace === "builder" && chords.length > 0 && (
          <section
            className="mx-auto w-full max-w-[96rem] px-4"
            aria-label={t("Chord cards output")}
          >
            <div className="hh-chord-card-grid" data-instrument={instrument}>
              {chords.map((chordResult, index) => {
                const maxVariants = chordResult.chord.variationCount;
                return (
                  <ChordCard
                    key={timeline[index]?.id ?? index}
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
                    onGuitarPlaybackVoicingChange={(voicing) => {
                      const itemId = timeline[index]?.id;
                      if (itemId === undefined) return;
                      setGuitarPlaybackVoicings((current) => {
                        if (voicing === null) {
                          if (!(itemId in current)) return current;
                          const next = { ...current };
                          delete next[itemId];
                          return next;
                        }
                        if (current[itemId] === voicing) return current;
                        return { ...current, [itemId]: voicing };
                      });
                    }}
                    harmonyContext={hasherContext}
                    timelineIndex={index}
                    timelineChords={indexedTimelineChords}
                    isPlaying={activeChordIndex === index}
                    isAgentHighlighted={highlightedChordIndex === index}
                  />
                );
              })}
            </div>
          </section>
          )}

          {workspace === "builder" && chords.length === 0 && (
          <div className="flex min-h-28 items-center justify-center px-4">
            <p
              className="text-center max-w-md"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}
            >
              {t("emptyStateHint")}
              <br />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                {t("Try: Cmaj7 Am9 Dm7 G7")}
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
      {onboardingOpen ? (
        <OnboardingModal
          brandLabel={t("HARMONY HASH — TONARI LABS")}
          title={t("Find your harmony.")}
          description={t("Interactive chord explorer. Discover harmony across keys and modes.")}
          closeLabel={t("Close Harmony Hash introduction")}
          primaryActionLabel={t("START HASHING")}
          onRequestClose={handleOnboardingClose}
          returnFocusRef={helpButtonRef}
          visual={(
            <img
              src="/hh_logo.png"
              alt=""
              aria-hidden="true"
              className="hh-onboarding-logo"
              width="1000"
              height="1000"
            />
          )}
        >
          <section className="hh-onboarding-destination hh-onboarding-destination--hasher">
            <span aria-hidden="true" className="hh-onboarding-destination-mark">#</span>
            <div>
              <h2>{t("Hasher")}</h2>
              <p>{t("Build progressions")}</p>
            </div>
          </section>
          <section className="hh-onboarding-destination hh-onboarding-destination--toolbox">
            <span aria-hidden="true" className="hh-onboarding-destination-mark">◎</span>
            <div>
              <h2>{t("Tune Toolbox")}</h2>
              <p>{t("Connect theory")}</p>
            </div>
          </section>
          <section className="hh-onboarding-destination hh-onboarding-destination--fret">
            <span aria-hidden="true" className="hh-onboarding-destination-mark">▦</span>
            <div>
              <h2>{t("Fret Finder")}</h2>
              <p>{t("Map the neck")}</p>
            </div>
          </section>
        </OnboardingModal>
      ) : null}
      </div>
  );
}

export default App;
