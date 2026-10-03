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
import { ArrowDown, ArrowUp, Compass, Play, Square, Wrench } from "lucide-react";
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
import PrivacyPolicy from "./components/PrivacyPolicy";
import ShareProgression from "./components/ShareProgression";
import ChordCard from "./components/ChordCard";
import FloatingChordCards from "./components/FloatingChordCards";
import type { ChordPreviewRequest } from "./components/ChordReferenceGrid";
import type { ChordPinRequest, ChordPreviewPoint } from "./components/chordPreviewIntent";
import { useT } from "./i18n/I18nContext";
import {
  computeVoiceLedProgression,
  EXPLICIT_VOICING_STYLES,
  isVoicingStyleAvailable,
  PIANO_OCTAVE_SHIFT_MAX,
  PIANO_OCTAVE_SHIFT_MIN,
  shiftVoicedChordOctaves,
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
import type { GuitarMidiVoicingState } from "./lib/guitarPlayback";
import type { DiscoveryPlaybackRequest } from "./lib/discovery/discoveryAudio";
import { getInstrumentVariantCount, getUkuleleVoicing } from "./lib/ukuleleVoicings";
import {
  isExplicitOnboardingDismissal,
  onboardingPersistence,
  type OnboardingCloseReason,
} from "./lib/onboardingPersistence";
import { randomOnboardingDescription } from "./onboardingCopy";

const TheoryWorkspace = lazy(() => import("./components/TheoryWorkspace"));
const Discovery = lazy(() => import("./components/Discovery"));
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
  const [discoveryVisited, setDiscoveryVisited] = useState(false);

  function handleWorkspaceChange(next: Workspace) {
    if (next === "discovery") setDiscoveryVisited(true);
    setWorkspace(next);
  }
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
  const [ukuleleVariants, setUkuleleVariants] = useState<Record<number, number>>({});
  const [guitarVoicingStates, setGuitarVoicingStates] = useState<
    Record<TimelineItemId, GuitarMidiVoicingState>
  >({});
  const [lockedCards, setLockedCards] = useState<Set<number>>(new Set());
  const [pianoStyles, setPianoStyles] = useState<Record<number, VoicingStyle>>({});
  const [pianoOctaveOffsets, setPianoOctaveOffsets] = useState<Record<TimelineItemId, number>>({});
  const [activeChordIndex, setActiveChordIndex] = useState<number | null>(null);
  const [playbackPhase, setPlaybackPhase] = useState<PlaybackControllerState>("idle");
  // Voice-companion highlight, kept SEPARATE from activeChordIndex: the latter is
  // the playback cursor (isPlaying derives from it), so the agent highlighting a
  // chord must not look like playback or block the Play button / play tool.
  const [highlightedChordIndex, setHighlightedChordIndex] = useState<number | null>(null);
  const [chordBrowserOpen, setChordBrowserOpen] = useState(false);
  const [chordPreview, setChordPreview] = useState<ChordPreviewRequest | null>(null);
  const [chordPinRequest, setChordPinRequest] = useState<ChordPinRequest | null>(null);
  const nextChordPinRequestIdRef = useRef(1);
  const chordPreviewDismissTimerRef = useRef<number | null>(null);

  const cancelChordPreviewDismiss = useCallback(() => {
    if (chordPreviewDismissTimerRef.current === null) return;
    window.clearTimeout(chordPreviewDismissTimerRef.current);
    chordPreviewDismissTimerRef.current = null;
  }, []);

  const dismissChordPreviewNow = useCallback(() => {
    cancelChordPreviewDismiss();
    setChordPreview(null);
  }, [cancelChordPreviewDismiss]);

  const scheduleChordPreviewDismiss = useCallback(() => {
    cancelChordPreviewDismiss();
    chordPreviewDismissTimerRef.current = window.setTimeout(() => {
      chordPreviewDismissTimerRef.current = null;
      setChordPreview(null);
    }, 180);
  }, [cancelChordPreviewDismiss]);

  const handleChordPreview = useCallback((request: ChordPreviewRequest) => {
    cancelChordPreviewDismiss();
    setChordPreview(request);
  }, [cancelChordPreviewDismiss]);

  const handleDiscoveryChordPin = useCallback((chordName: string, point: ChordPreviewPoint) => {
    if (!lookupChord(chordName)) return;
    setChordPinRequest({
      requestId: nextChordPinRequestIdRef.current++,
      chordName,
      point,
    });
  }, []);

  const handleChordPinRequestHandled = useCallback((requestId: number) => {
    setChordPinRequest((current) => current?.requestId === requestId ? null : current);
  }, []);

  useEffect(() => () => cancelChordPreviewDismiss(), [cancelChordPreviewDismiss]);

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
    fretboard: false,
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
            request.allowRests,
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
  const [chordAudition] = useState(() => {
    let timelineIndex: number | null = null;
    const controller = createProgressionPlaybackController({
      createContext: createAudioContext,
      schedule: (request, context, onChordChange) =>
        playSchedule(
          buildMidiPlaybackSchedule(
            request.voicings,
            request.bpm,
            request.beatsPerChord,
            request.allowRests,
          ),
          context,
          onChordChange,
          request.timbre,
        ),
      onChordChange: (index) => {
        setActiveChordIndex(index === null ? null : timelineIndex);
      },
      onStateChange: () => undefined,
      onError: (error) => console.error("Chord audition failed", error),
    });
    return {
      controller,
      setTimelineIndex: (index: number) => {
        timelineIndex = index;
      },
    };
  });
  const chordAuditionController = chordAudition.controller;
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
    if (workspace !== "builder") dismissChordPreviewNow();
  }, [dismissChordPreviewNow, handleCloseHanz, workspace]);

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
    setUkuleleVariants({});
    setGuitarVoicingStates({});
    setLockedCards(new Set());
    setPianoStyles({});
    setPianoOctaveOffsets({});
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
    setUkuleleVariants((current) => remapIndexedRecord(current, transaction.map));
    const survivingIds = new Set(nextTimeline.map((item) => item.id));
    setGuitarVoicingStates((current) => Object.fromEntries(
      Object.entries(current).filter(([id]) => survivingIds.has(Number(id))),
    ));
    setPianoOctaveOffsets((current) => Object.fromEntries(
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
    || workspace === "fretboard"
    || workspace === "circle"
    || workspace === "scales"
    || workspace === "network";

  useEffect(() => {
    if (workspace !== "fretboard" && workspace !== "circle" && workspace !== "scales" && workspace !== "network") return;
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
      clampVariant((instrument === "ukulele" ? ukuleleVariants : cardVariants)[index] ?? 1, maxVariants),
    [cardVariants, instrument, ukuleleVariants],
  );

  function handleCardVariantChange(index: number, nextVariant: number, maxVariants: number) {
    playbackController.stop();
    if (instrument === "ukulele") {
      setUkuleleVariants((prev) => ({ ...prev, [index]: clampVariant(nextVariant, maxVariants) }));
      return;
    }
    const itemId = timeline[index]?.id;
    if (itemId !== undefined) {
      setGuitarVoicingStates((current) => {
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

  function pianoOctaveOffsetAt(index: number): number {
    const itemId = timeline[index]?.id;
    return itemId === undefined ? 0 : pianoOctaveOffsets[itemId] ?? 0;
  }

  function handlePianoOctaveShift(index: number, direction: -1 | 1) {
    const itemId = timeline[index]?.id;
    if (itemId === undefined) return;
    playbackController.stop();
    setPianoOctaveOffsets((current) => {
      const nextOffset = Math.min(
        PIANO_OCTAVE_SHIFT_MAX,
        Math.max(PIANO_OCTAVE_SHIFT_MIN, (current[itemId] ?? 0) + direction),
      );
      const next = { ...current };
      if (nextOffset === 0) delete next[itemId];
      else next[itemId] = nextOffset;
      return next;
    });
  }

  const canLowerPianoProgression = timeline.length > 0
    && timeline.every((_, index) => pianoOctaveOffsetAt(index) > PIANO_OCTAVE_SHIFT_MIN);
  const canRaisePianoProgression = timeline.length > 0
    && timeline.every((_, index) => pianoOctaveOffsetAt(index) < PIANO_OCTAVE_SHIFT_MAX);

  function handlePianoProgressionOctaveShift(direction: -1 | 1) {
    if (direction < 0 ? !canLowerPianoProgression : !canRaisePianoProgression) return;
    playbackController.stop();
    setPianoOctaveOffsets((current) => {
      const next = { ...current };
      for (const item of timeline) {
        const nextOffset = (current[item.id] ?? 0) + direction;
        if (nextOffset === 0) delete next[item.id];
        else next[item.id] = nextOffset;
      }
      return next;
    });
  }

  const basePianoVoicings = useMemo(() => {
    const noteSets = chords.map((c) => parseNotes(c.chord.entry));
    const styles = chords.map((_, i) => getPianoStyle(i));
    return computeVoiceLedProgression(noteSets, styles);
  }, [chords, getPianoStyle]);
  const pianoVoicings = useMemo(() => basePianoVoicings.map((voicing, index) => {
    const itemId = timeline[index]?.id;
    return shiftVoicedChordOctaves(voicing, itemId === undefined ? 0 : pianoOctaveOffsets[itemId] ?? 0);
  }), [basePianoVoicings, pianoOctaveOffsets, timeline]);
  const indexedTimelineChords = useMemo(
    () => chords.map((chord) => chord.chord),
    [chords],
  );
  const guitarMidiVoicings = useMemo(() => timeline.map((item, index) => {
    const variant = clampVariant(cardVariants[index] ?? 1, item.value.chord.variationCount);
    const expectedPath = getSvgPath(item.value.chord, variant);
    const state = guitarVoicingStates[item.id];
    return expectedPath && state?.status === "ready" && state.voicing.sourcePath === expectedPath
      ? state.voicing.notes.map((note) => note.midi)
      : [];
  }), [cardVariants, guitarVoicingStates, timeline]);
  const guitarMidiFailed = timeline.some((item, index) => {
    const variant = clampVariant(cardVariants[index] ?? 1, item.value.chord.variationCount);
    const expectedPath = getSvgPath(item.value.chord, variant);
    const state = guitarVoicingStates[item.id];
    if (!expectedPath) return true;
    return state?.status === "error"
      && (state.sourcePath === null || state.sourcePath === expectedPath);
  });
  const guitarPlaybackReady = guitarMidiVoicings.length > 0
    && guitarMidiVoicings.every((voicing) => voicing.length > 0);
  const ukuleleMidiVoicings = useMemo(() => chords.map(({ chord }, index) => (
    getUkuleleVoicing(chord, ukuleleVariants[index] ?? 1)?.notes.map((note) => note.midi) ?? []
  )), [chords, ukuleleVariants]);
  const ukulelePlaybackReady = ukuleleMidiVoicings.some((voicing) => voicing.length > 0);
  const midiExportVoicings = useMemo(
    () => instrument === "piano"
      ? pianoVoicings.map((voicing) => voicing.notes.map((note) => note.midi))
      : instrument === "ukulele" ? ukuleleMidiVoicings : guitarMidiVoicings,
    [guitarMidiVoicings, instrument, pianoVoicings, ukuleleMidiVoicings],
  );
  const instrumentPlaybackReady = instrument === "piano"
    || (instrument === "ukulele" ? ukulelePlaybackReady : guitarPlaybackReady);
  const midiExportAvailability = instrumentPlaybackReady
    ? "ready"
    : instrument === "ukulele" || guitarMidiFailed
      ? "error"
      : "preparing";
  const discoveryPlaybackRequest = useMemo<DiscoveryPlaybackRequest | null>(() => (
    chords.length > 0 && instrumentPlaybackReady
      ? {
          timbre: instrument,
          voicings: midiExportVoicings,
          bpm: PLAYBACK_BPM,
          beatsPerChord: 2,
          allowRests: instrument === "ukulele",
        }
      : null
  ), [chords.length, instrument, instrumentPlaybackReady, midiExportVoicings]);
  const discoveryProgressionLabels = useMemo(() => chords.map(({ input }) => input), [chords]);

  const isPlaying = playbackPhase === "playing";
  const isPlaybackStarting = playbackPhase === "starting";

  function startProgressionPlayback() {
    chordAuditionController.stop();
    return playbackController.start({
      timbre: instrument,
      voicings: midiExportVoicings,
      bpm: PLAYBACK_BPM,
      beatsPerChord: 2,
      allowRests: instrument === "ukulele",
    });
  }

  function handleChordAudition(index: number) {
    const voicing = midiExportVoicings[index];
    if (!voicing || voicing.length === 0) return;

    playbackController.stop();
    chordAuditionController.stop();
    chordAudition.setTimelineIndex(index);
    void chordAuditionController.start({
      timbre: instrument,
      voicings: [voicing],
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
      chordAuditionController.stop();
    };
  }, [chordAuditionController, chords, midiExportVoicings, playbackController]);

  function randomizeAll() {
    playbackController.stop();
    if (instrument !== "piano") {
      const setVariants = instrument === "ukulele" ? setUkuleleVariants : setCardVariants;
      setVariants((prev) => {
        const next = { ...prev };
        chords.forEach((chordResult, index) => {
          const maxVariants = getInstrumentVariantCount(chordResult.chord, instrument);
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
    setGuitarVoicingStates((current) => {
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
    setUkuleleVariants((prev) => ({
      ...prev,
      [index]: clampVariant(prev[index] ?? 1, getInstrumentVariantCount(option.chord, "ukulele")),
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
  // and runs only when a Realtime tool callback fires — outside React's render
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
    if (nextInstrument === instrument) return;
    playbackController.stop();
    setGuitarVoicingStates({});
    setInstrument(nextInstrument);
  }, [instrument, playbackController]);

  const handleOnboardingClose = useCallback((reason: OnboardingCloseReason) => {
    if (isExplicitOnboardingDismissal(reason)) onboardingPersistence.dismiss();
    setOnboardingOpen(false);
  }, []);

  const guidedTourSteps = useMemo<readonly GuidedTourStep[]>(() => [
    {
      id: "workspaces",
      targetSelector: '[data-tour="workspace-navigation"]',
      title: t("Choose a workspace"),
      body: t("HASHER builds progressions, TUNE TOOLBOX groups FRET FINDER with the theory tools, and DISCOVERY turns notes and your progression into a practice space."),
    },
    {
      id: "describe",
      targetSelector: '[data-tour="hasher-describe"]',
      title: t("Describe what you hear"),
      body: t("Describe a mood or progression and run the builder. The small Harmony prompt opens the companion when you want Voice or Type guidance."),
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
      id: "context",
      targetSelector: '[data-tour="hasher-context"]',
      title: t("Set the harmonic context"),
      body: t("Choose a key and mode once. Presets, chord suggestions, and analysis all follow that shared context."),
    },
    {
      id: "instrument",
      targetSelector: '[data-tour="instrument-switcher"]',
      title: t("Choose your instrument"),
      body: t("Switch between guitar, ukulele, and piano without rebuilding your progression. The same chord timeline drives every view."),
    },
    {
      id: "presets",
      targetSelector: '[data-tour="hasher-presets"]',
      title: t("Start with a preset"),
      body: t("Pick a proven progression, then keep editing it just like one you built yourself."),
    },
    {
      id: "playback",
      targetSelector: '[data-tour="hasher-actions"]',
      title: t("Hear and explore your progression"),
      body: t("Use PLAY to hear the timeline, RANDOMIZE to refresh unlocked voicings, and IMPROV INSIGHT to find compatible scales without changing your chords."),
    },
    {
      id: "cards",
      targetSelector: '[data-tour="chord-output"]',
      title: t("Shape each chord"),
      body: t("Each card renders the same chord for guitar, ukulele, or piano. Lock the voices you want to preserve and use MODIFY for alternatives."),
    },
    {
      id: "toolbox-handoff",
      kind: "handoff",
      destinationSelector: '[data-tour-workspace="theory"]',
      title: t("Continue in Tune Toolbox"),
      instruction: t("Select the highlighted TUNE TOOLBOX tab to continue. The tour will wait for you."),
    },
    {
      id: "fretboard",
      targetSelector: '[data-theory-tool="fretboard"]',
      title: t("Find notes on the fretboard"),
      body: t("FRET FINDER comes first in TUNE TOOLBOX. Explore scales, intervals, and practice patterns without changing your HASHER progression."),
    },
    {
      id: "scales",
      targetSelector: '[data-theory-tool="scales"]',
      title: t("See a scale on the keyboard"),
      body: t("SCALE SYNTHESIA names each degree, shows its color, and can send a compatible root and mode back to HASHER."),
    },
    {
      id: "circle",
      targetSelector: '[data-theory-tool="circle"]',
      title: t("Explore The Circle"),
      body: t("Compare neighboring keys, modes, and practical key changes or open IMPROV INSIGHT without leaving TUNE TOOLBOX."),
    },
    {
      id: "network",
      targetSelector: '[data-theory-tool="network"]',
      title: t("Connect the note network"),
      body: t("NOTE NEURAL NETWORK makes relative, parallel, and neighboring scale relationships visible and keeps the shared theory context in sync."),
    },
    {
      id: "discovery-handoff",
      kind: "handoff",
      destinationSelector: '[data-tour-workspace="discovery"]',
      title: t("Continue in Discovery"),
      instruction: t("Select the highlighted DISCOVERY tab to continue. Your HASHER progression will come with you."),
    },
    {
      id: "discovery-input",
      targetSelector: '[data-tour="discovery-input"]',
      title: t("Play notes in Discovery"),
      body: t("Choose Piano or Fretboard, click notes, use computer keys, or connect MIDI. Discovery keeps this note-first input separate from your HASHER timeline."),
    },
    {
      id: "discovery-results",
      targetSelector: '[data-tour="discovery-results"]',
      title: t("Name the harmony you find"),
      body: t("Discovery identifies the notes you play, shows intervals and alternate matches, and lets you pin a recognized chord for reference."),
    },
    {
      id: "discovery-improv",
      targetSelector: '[data-tour="discovery-improv"]',
      title: t("Highlight a scale path"),
      body: t("IMPROV INSIGHT ranks scales for your HASHER progression. Choose a recommendation, then turn Highlight on to map its tones across the active instrument."),
    },
    {
      id: "discovery-loop",
      targetSelector: '[data-tour="discovery-loop"]',
      title: t("Practice over your progression"),
      body: t("Loop the read-only HASHER progression, set a tempo, and play over it. Your original chords stay unchanged."),
    },
  ], [t]);

  const handleBeforeTourStep = useCallback((step: GuidedTourStep) => {
    if (step.id === "toolbox-handoff" || step.id === "discovery-handoff") return;
    if (
      step.id === "fretboard"
      || step.id === "circle"
      || step.id === "scales"
      || step.id === "network"
    ) {
      setWorkspace("theory");
      setTheoryDisclosures((current) => ({
        ...current,
        [step.id]: true,
      }));
      return;
    }
    if (step.id.startsWith("discovery-")) {
      setDiscoveryVisited(true);
      setWorkspace("discovery");
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
    setChordBrowserOpen(false);
    dismissChordPreviewNow();
    setWorkspace("builder");
    setOnboardingOpen(false);
    setTourOpen(true);
  }, [dismissChordPreviewNow, handleResult, theoryDisclosures, workspace]);

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
        onWorkspaceChange={handleWorkspaceChange}
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
              chordBrowserOpen={chordBrowserOpen}
              onChordBrowserOpenChange={setChordBrowserOpen}
              chordPreviewEnabled={workspace === "builder"}
              contextLaunch={hasherContextLaunch}
              onChordPreview={handleChordPreview}
              onChordPreviewDismiss={scheduleChordPreviewDismiss}
            />
          </div>

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

          {discoveryVisited ? (
            <div hidden={workspace !== "discovery"}>
              <Suspense fallback={<section className="hh-workspace" role="status">{t("Loading Discovery…")}</section>}>
                <Discovery
                  active={workspace === "discovery"}
                  playbackRequest={discoveryPlaybackRequest}
                  progressionChords={chords}
                  progressionLabels={discoveryProgressionLabels}
                  onBeforeLoopStart={playbackController.stop}
                  onPinChord={handleDiscoveryChordPin}
                />
              </Suspense>
            </div>
          ) : null}

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
                  {instrument === "piano" ? (
                    <div
                      role="group"
                      aria-label={t("Progression octave")}
                      data-testid="progression-octave-control"
                      className="flex min-h-10 items-center justify-center gap-2 rounded-lg px-2"
                      style={{
                        backgroundColor: "var(--surface-overlay)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "var(--text-xs)",
                      }}
                    >
                      <button
                        type="button"
                        aria-label={t("Lower whole progression one octave")}
                        disabled={!canLowerPianoProgression}
                        onClick={() => handlePianoProgressionOctaveShift(-1)}
                        className="flex min-h-8 min-w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: "var(--interactive-accent-text)", border: "1px solid var(--interactive-accent-border)" }}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <span>{t("ALL OCTAVES")}</span>
                      <button
                        type="button"
                        aria-label={t("Raise whole progression one octave")}
                        disabled={!canRaisePianoProgression}
                        onClick={() => handlePianoProgressionOctaveShift(1)}
                        className="flex min-h-8 min-w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40"
                        style={{ color: "var(--interactive-accent-text)", border: "1px solid var(--interactive-accent-border)" }}
                      >
                        <ArrowUp size={14} />
                      </button>
                    </div>
                  ) : null}
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
                      disabled={isPlaybackStarting || !instrumentPlaybackReady}
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

                  <ShareProgression
                    instrument={instrument}
                    chords={chords}
                    midiVoicings={midiExportVoicings}
                    midiAvailability={midiExportAvailability}
                  />

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
                const maxVariants = getInstrumentVariantCount(chordResult.chord, instrument);
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
                    pianoOctaveOffset={pianoOctaveOffsetAt(index)}
                    onPianoOctaveShift={(direction) => handlePianoOctaveShift(index, direction)}
                    onChordChange={(option) => replaceChordAt(index, option)}
                    onGuitarPlaybackVoicingChange={(state) => {
                      const itemId = timeline[index]?.id;
                      if (itemId === undefined) return;
                      setGuitarVoicingStates((current) => ({
                        ...current,
                        [itemId]: state,
                      }));
                    }}
                    harmonyContext={hasherContext}
                    timelineIndex={index}
                    timelineChords={indexedTimelineChords}
                    isPlaying={activeChordIndex === index}
                    isAgentHighlighted={highlightedChordIndex === index}
                    onAudition={midiExportVoicings[index]?.length > 0
                      ? () => handleChordAudition(index)
                      : undefined}
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
      <PrivacyPolicy />
      <FloatingChordCards
        instrument={instrument}
        harmonyContext={hasherContext}
        preview={chordPreview}
        onPreviewEnter={cancelChordPreviewDismiss}
        onPreviewLeave={scheduleChordPreviewDismiss}
        onPreviewDismiss={dismissChordPreviewNow}
        pinRequest={chordPinRequest}
        onPinRequestHandled={handleChordPinRequestHandled}
      />
      {voiceRuntimeRequested ? (
        VoiceAgentRuntime ? (
          <VoiceAgentRuntime
            bridge={voiceBridge}
            clientSecretEndpoint="/api/voice/client-secret"
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
            <div className="hh-onboarding-logo-stack" aria-hidden="true">
              <img
                src="/hh_logo.png"
                alt=""
                className="hh-onboarding-logo hh-onboarding-logo--dark"
                width="1000"
                height="1000"
              />
              <img
                src="/hh_logo_light.jpg"
                alt=""
                className="hh-onboarding-logo hh-onboarding-logo--light"
                width="1000"
                height="1000"
              />
            </div>
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
              <p>{t("Fret Finder + theory")}</p>
            </div>
          </section>
          <section className="hh-onboarding-destination hh-onboarding-destination--discovery">
            <Compass
              aria-hidden="true"
              className="hh-onboarding-destination-mark"
              data-onboarding-destination-icon="discovery"
              size={24}
              strokeWidth={1.75}
            />
            <div>
              <h2>{t("Discovery")}</h2>
              <p>{t("Play and discover")}</p>
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
