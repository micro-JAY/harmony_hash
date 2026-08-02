import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Guitar, Play, Square, Wrench } from "lucide-react";
import type {
  Instrument,
  IndexedChord,
  ParseError,
  ScaleType,
  VoicingStyle,
  Workspace,
} from "./lib/types";
import Header from "./components/Header";
import InstrumentToggle from "./components/InstrumentToggle";
import GuidedTour, { type GuidedTourStep } from "./components/GuidedTour";
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

const PLAYBACK_BPM = 110;

const ONBOARDING_DESCRIPTION_KEYS = [
  "Harmony doesn't have to be hard.",
  "Find the harmony inside every chord.",
  "Start with a chord. Discover where it wants to go.",
] as const;

function randomOnboardingDescription() {
  return ONBOARDING_DESCRIPTION_KEYS[
    Math.floor(Math.random() * ONBOARDING_DESCRIPTION_KEYS.length)
  ] ?? ONBOARDING_DESCRIPTION_KEYS[0];
}

function TheoryImprovFocusRegion({ children }: { children: ReactNode }) {
  const regionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    regionRef.current?.focus();
  }, []);

  return (
    <section
      ref={regionRef}
      id="theory-improv-insight"
      tabIndex={-1}
      aria-labelledby="improv-insight-title"
      className="mx-auto w-full max-w-6xl px-4 pb-6"
    >
      {children}
    </section>
  );
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
  const [onboardingOpen, setOnboardingOpen] = useState(() => {
    // Keep the returning-visitor fixture useful for automated flows while the
    // real app intentionally introduces the welcome screen on every visit.
    if (import.meta.env.VITE_HH_E2E === "true") return !onboardingPersistence.isDismissed();
    return true;
  });
  const [onboardingDescriptionKey, setOnboardingDescriptionKey] = useState(
    randomOnboardingDescription,
  );
  const [tourOpen, setTourOpen] = useState(false);
  const tourRestoreRef = useRef<{
    workspace: Workspace;
    theoryDisclosures: TheoryDisclosures;
    seededTimeline: boolean;
  } | null>(null);
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
  const [improvOrigin, setImprovOrigin] = useState<"builder" | "theory" | null>(null);
  const improvReturnFocusIdRef = useRef("theory-circle-improv-trigger");
  const [improvTheoryContext, setImprovTheoryContext] = useState<{
    readonly root: string;
    readonly scaleId: ScaleFormulaType;
  } | null>(null);
  const [theoryContext, setTheoryContext] = useState<TheoryWorkspaceContext>(
    DEFAULT_THEORY_CONTEXT,
  );
  const [theoryDisclosures, setTheoryDisclosures] = useState<TheoryDisclosures>({
    circle: false,
    scales: true,
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

  const handleOpenTheoryImprov = useCallback((root: string, returnFocusId = "theory-circle-improv-trigger") => {
    improvReturnFocusIdRef.current = returnFocusId;
    setImprovTheoryContext({ root, scaleId: theoryContext.scaleId });
    setImprovOrigin("theory");
    setImprovOpen(true);
  }, [theoryContext.scaleId]);

  const handleCloseImprov = useCallback(() => {
    const closingOrigin = improvOrigin;
    setImprovOpen(false);
    setImprovOrigin(null);
    requestAnimationFrame(() => {
      document.getElementById(
        closingOrigin === "theory"
          ? improvReturnFocusIdRef.current
          : "hasher-improv-trigger",
      )?.focus();
    });
  }, [improvOrigin]);

  const handleToggleBuilderImprov = useCallback(() => {
    if (improvOpen && improvOrigin === "builder") {
      handleCloseImprov();
      return;
    }
    setImprovTheoryContext(null);
    setImprovOrigin("builder");
    setImprovOpen(true);
  }, [handleCloseImprov, improvOpen, improvOrigin]);

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

  const guidedTourSteps = useMemo<readonly GuidedTourStep[]>(() => [
    {
      id: "workspaces",
      targetSelector: '[data-tour="workspace-navigation"]',
      title: t("Choose a workspace"),
      body: t("HASHER builds progressions, TUNE TOOLBOX connects the theory, and FRET FINDER maps the result across the instrument."),
    },
    {
      id: "instrument",
      targetSelector: '[data-tour="instrument-switcher"]',
      title: t("Choose your instrument"),
      body: t("Switch between guitar and piano without rebuilding your progression. The same chord timeline drives both views."),
    },
    {
      id: "context",
      targetSelector: '[data-tour="hasher-context"]',
      title: t("Set the harmonic context"),
      body: t("Choose a key and mode once. Presets, chord suggestions, and analysis all follow that shared context."),
    },
    {
      id: "presets",
      targetSelector: '[data-tour="hasher-presets"]',
      title: t("Start with a preset"),
      body: t("Pick a proven progression, then keep editing it just like one you built yourself."),
    },
    {
      id: "describe",
      targetSelector: '[data-tour="hasher-describe"]',
      title: t("Describe what you hear"),
      body: t("Describe a mood or progression and run the builder. If you get stuck, check the small help prompt; Hanz Hasher has you covered."),
    },
    {
      id: "composer",
      targetSelector: '[data-tour="hasher-composer"]',
      title: t("Build chord by chord"),
      body: t("Type a valid chord and press Enter, click a chord below to append it, or drag chips to place and reorder them."),
    },
    {
      id: "browser",
      targetSelector: '[data-tour="hasher-chord-browser"]',
      title: t("Browse the chord dictionary"),
      body: t("Open BROWSE CHORDS for dictionary-valid choices. Suggestions and colors show how each chord relates to your context."),
    },
    {
      id: "cards",
      targetSelector: '[data-tour="chord-output"]',
      title: t("Shape each chord"),
      body: t("Each card renders the same chord for guitar or piano. Lock the voices you want to preserve and use MODIFY for alternatives."),
    },
    {
      id: "playback",
      targetSelector: '[data-tour="hasher-actions"]',
      title: t("Play what you build"),
      body: t("Use PLAY to hear the full progression. RANDOMIZE (UNLOCKED VOICES) gives unlocked guitar variants or piano voicings a fresh performance without changing your chords."),
    },
    {
      id: "scales",
      targetSelector: '[data-testid="scale-synthesia"]',
      title: t("See a scale on the keyboard"),
      body: t("SCALE SYNTHESIA names each degree, shows its color, and can send a compatible root and mode back to HASHER."),
    },
    {
      id: "circle",
      targetSelector: '[data-testid="circle-of-fifths"]',
      title: t("THE CIRCLE"),
      body: t("Compare neighboring keys, modes, and practical key changes or open IMPROV INSIGHT without leaving TUNE TOOLBOX."),
    },
    {
      id: "network",
      targetSelector: '[data-testid="note-neural-network"]',
      title: t("Connect the note network"),
      body: t("NOTE NEURAL NETWORK makes relative, parallel, and neighboring scale relationships visible and keeps the shared theory context in sync."),
    },
    {
      id: "fretboard",
      targetSelector: '[data-testid="fretboard-workspace"]',
      title: t("Map the fretboard"),
      body: t("FRET FINDER maps the selected scale from open strings through the highest visible fret, with stable interval colors and responsive detail."),
    },
    {
      id: "handoff",
      targetSelector: '[data-tour="workspace-navigation"]',
      title: t("Carry ideas between tools"),
      body: t("Move between HASHER, TUNE TOOLBOX, and FRET FINDER without losing your key, mode, or progression. Send a scale or chord idea back to the workspace where you need it."),
    },
  ], [t]);

  const handleBeforeTourStep = useCallback((step: GuidedTourStep) => {
    if (step.id === "circle" || step.id === "scales" || step.id === "network") {
      setWorkspace("theory");
      setTheoryDisclosures((current) => ({
        ...current,
        [step.id]: true,
      }));
      return;
    }
    if (step.id === "fretboard") {
      setWorkspace("fretboard");
      return;
    }
    setWorkspace("builder");
  }, []);

  const handleStartTour = useCallback(() => {
    const seededTimeline = chordsRef.current.length === 0;
    tourRestoreRef.current = {
      workspace,
      theoryDisclosures,
      seededTimeline,
    };

    if (seededTimeline) {
      const demoChords = ["Cmaj7", "Am7", "Dm7", "G7"].map((input) => {
        const chord = lookupChord(input);
        if (!chord) throw new Error(`Guided tour chord is unavailable: ${input}`);
        return { input, chord };
      });
      handleResult(demoChords, []);
    }

    onboardingPersistence.dismiss();
    setOnboardingOpen(false);
    setTourOpen(true);
  }, [handleResult, theoryDisclosures, workspace]);

  const handleCloseTour = useCallback(() => {
    const restore = tourRestoreRef.current;
    tourRestoreRef.current = null;
    setTourOpen(false);
    if (!restore) return;
    setWorkspace(restore.workspace);
    setTheoryDisclosures(restore.theoryDisclosures);
    if (restore.seededTimeline) handleResult([], []);
  }, [handleResult]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onOpenHelp={() => {
          setOnboardingDescriptionKey(randomOnboardingDescription());
          setOnboardingOpen(true);
        }}
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
              outputTools={(
                <div data-tour="instrument-switcher" className="hh-instrument-picker-slot">
                  <InstrumentToggle
                    instrument={instrument}
                    onInstrumentChange={handleInstrumentChange}
                  />
                </div>
              )}
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
              {improvOpen && improvOrigin === "theory" ? (
                <TheoryImprovFocusRegion>
                  <ImprovInsight
                    chords={chords}
                    moodId={null}
                    theoryContext={improvTheoryContext}
                    expanded
                    hideTrigger
                    onExpandedChange={(expanded) => {
                      if (!expanded) handleCloseImprov();
                    }}
                    onClose={handleCloseImprov}
                  />
                </TheoryImprovFocusRegion>
              ) : null}
            </Suspense>
          </div>

          {/* Progression playback and voicing actions. */}
          <section
            className="w-full px-4"
            aria-label={t("Progression actions")}
            data-hasher-key={hasherContext.key}
            data-hasher-mode={hasherContext.scaleType}
            data-tour="hasher-actions"
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
                    {t("RANDOMIZE (UNLOCKED VOICES)")}
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
                      {t(isPlaying ? "STOP" : "PLAY")}
                    </button>

                  <ShareProgression instrument={instrument} chords={chords} />

                  <button
                    id="hasher-improv-trigger"
                    type="button"
                    aria-expanded={improvOpen && improvOrigin === "builder"}
                    aria-controls="hasher-improv-insight"
                    onClick={handleToggleBuilderImprov}
                    className="hh-action transition-all"
                    style={{
                      backgroundColor: "var(--music-insight-action-bg)",
                      color: "var(--music-insight-action-text)",
                      border: "1px solid var(--music-insight-action-border)",
                      fontWeight: "var(--weight-medium)",
                    }}
                  >
                    {t("Improv Insight")}
                  </button>
                </div>
              )}
            </div>
          </section>

          {workspace === "builder" && improvOpen && improvOrigin === "builder" && chords.length > 0 ? (
            <section id="hasher-improv-insight" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4">
              <Suspense fallback={<span className="readout">{t("Loading Improv Insight…")}</span>}>
                <ImprovInsight
                  chords={chords}
                  moodId={null}
                  theoryContext={improvTheoryContext}
                  expanded
                  hideTrigger
                  onExpandedChange={(expanded) => {
                    if (!expanded) handleCloseImprov();
                  }}
                  onClose={handleCloseImprov}
                />
              </Suspense>
            </section>
          ) : null}

          {workspace === "builder" && chords.length > 0 && (
          <section
            className="mx-auto w-full max-w-[96rem] px-4"
            aria-label={t("Chord cards output")}
            data-tour="chord-output"
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
          <div data-tour="chord-output" className="flex min-h-28 items-center justify-center px-4">
            <p
              className="text-center max-w-md"
              style={{ color: "var(--text-muted)", fontSize: "var(--text-base)" }}
            >
              {t("emptyStateHint")}
              <br />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-sm)" }}>
                {t("Don't know where to start? Try a preset!")}
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
          title={t("HARMONY HASH")}
          description={t(onboardingDescriptionKey)}
          closeLabel={t("Close Harmony Hash introduction")}
          primaryActionLabel={t("START HASHING")}
          secondaryActionLabel={t("TAKE A TOUR")}
          onRequestClose={handleOnboardingClose}
          onSecondaryAction={handleStartTour}
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
            <Wrench
              aria-hidden="true"
              className="hh-onboarding-destination-mark"
              data-onboarding-destination-icon="toolbox"
              size={24}
              strokeWidth={1.75}
            />
            <div>
              <h2>{t("Tune Toolbox")}</h2>
              <p>{t("Connect theory")}</p>
            </div>
          </section>
          <section className="hh-onboarding-destination hh-onboarding-destination--fret">
            <Guitar
              aria-hidden="true"
              className="hh-onboarding-destination-mark"
              data-onboarding-destination-icon="fret"
              size={24}
              strokeWidth={1.75}
            />
            <div>
              <h2>{t("Fret Finder")}</h2>
              <p>{t("Map the neck")}</p>
            </div>
          </section>
        </OnboardingModal>
      ) : null}
      <GuidedTour
        open={tourOpen}
        steps={guidedTourSteps}
        labels={{
          tour: t("Guided tour"),
          close: t("Close guided tour"),
          previous: t("Previous"),
          next: t("Next"),
          finish: t("Finish tour"),
          step: (current, total) => `${t("Step")} ${current} / ${total}`,
        }}
        onBeforeStep={handleBeforeTourStep}
        onRequestClose={handleCloseTour}
        returnFocusRef={helpButtonRef}
      />
      </div>
  );
}

export default App;
