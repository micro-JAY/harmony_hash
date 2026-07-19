export {
  isRootDiatonic,
  pitchClassOf,
  scaleDegreeOf,
  scaleIntervalsFor,
  scaleIntervalFormulaFor,
  scalePitchClasses,
  spellScaleNotes,
} from "./scaleBasics";
export type { ScaleFormulaType } from "./scaleBasics";

export {
  ARPEGGIO_PATTERNS,
  buildScalePlaybackSchedule,
  buildScalePracticeSequence,
  parseScaleLearningDefinitions,
  PRACTICE_NOTE_LENGTHS,
  practiceNoteDurationSeconds,
  SCALE_PRACTICE_BEATS_PER_BAR,
  SCALE_PRACTICE_BPM,
  SCALE_FAMILIES,
  SCALE_LEARNING,
  scaleDegreeName,
  scaleLearningDefinitionFor,
  scaleLearningForFamily,
  scaleStepLabels,
} from "./scaleCatalog";
export type {
  ArpeggioType,
  PracticeNoteLength,
  PracticeDirection,
  PracticeMaterial,
  ScaleFamilyId,
  ScaleLearningDefinition,
  ScalePracticeNote,
} from "./scaleCatalog";

export {
  buildModeNetwork,
  characteristicIntervalFor,
  MODE_FAMILIES,
  modeFamilyForScale,
  modeFamilyDefinitionFor,
} from "./modeNetwork";
export type {
  ModeFamilyId,
  ModeNetwork,
  ModeNetworkNode,
  ModeRelationship,
} from "./modeNetwork";

export {
  buildFretboardRows,
  defaultFretboardTuningId,
  fretboardTuningDefinitionFor,
  fretboardTuningFor,
  fretboardTuningsFor,
  intervalLabelFor,
  noteLabelForPitchClass,
} from "./fretboard";
export type {
  FretboardInstrument,
  FretboardPosition,
  FretboardString,
  FretboardStringRow,
  FretboardTuning,
  FretboardTuningId,
} from "./fretboard";

export { chordPitchClasses, deriveChordTones } from "./chordTones";
export type { ChordTone, ChordToneRole } from "./chordTones";

export {
  buildFretboardPattern,
  CAGED_FORM_OPTIONS,
  decorateFretboardPositions,
  PATTERN_COMPATIBILITY_REASON,
  THREE_NPS_OPTIONS,
} from "./fretboardPatterns";
export type {
  CagedFormId,
  DecoratedFretboardPosition,
  FretboardPatternEnvelope,
  FretboardPatternFamily,
  FretboardPatternResult,
  FretboardPatternSelection,
  ThreeNpsStartDegree,
} from "./fretboardPatterns";

export {
  findLastResolvedChord,
  harmonicFitTier,
  modalRootIdentityFor,
  modalRootLegend,
  scoreChordKeyFit,
  scoreJazzChordFit,
  scoreJazzVocabularyFit,
  scoreModalChordFit,
  scoreNextChordFit,
  scoreRootMotionFit,
  scoreVoiceLeadingFit,
} from "./harmonicSuggestions";
export type {
  HarmonicFitComponents,
  HarmonicFitResult,
  HarmonicFitTier,
  HarmonyContext,
  JazzHarmonicFitComponents,
  JazzHarmonicFitResult,
  ModalHarmonicFitResult,
  ModalRootIdentity,
} from "./harmonicSuggestions";

export {
  applyMoodToHarmonicFit,
  filterScaleSuggestionsByMood,
  MOODS,
  MOOD_IDS,
  moodDefinitionFor,
  parseMoodDefinitions,
  scoreChordMoodFit,
} from "./moodEngine";
export type {
  MoodChordFit,
  MoodChordQuality,
  MoodDefinition,
  MoodHarmonicFitComponents,
  MoodHarmonicFitResult,
  MoodId,
  MoodKind,
  MoodScaleCandidate,
} from "./moodEngine";

export {
  adjacentCircleKeys,
  builderProgressionFor,
  CIRCLE_KEYS,
  circleKeyAt,
  diatonicChordsFor,
} from "./circleOfFifths";
export type { CircleKey } from "./circleOfFifths";

export {
  canonicalTheoryRoot,
  createTheoryContext,
  DEFAULT_THEORY_CONTEXT,
  scaleSynthesiaToHasherHandoff,
  SUPPORTED_HASHER_SCALE_MAP,
  THEORY_MOOD_ANY,
} from "./theoryContext";
export type {
  HasherHandoff,
  SupportedHasherHandoff,
  TheoryContext,
  TheoryMood,
  TheoryRelationshipId,
  UnsupportedHasherHandoff,
} from "./theoryContext";

export {
  buildTheoryRelationshipCatalog,
  selectCircleRelationshipEdges,
} from "./theoryRelationships";
export type {
  RelationshipDirection,
  RelationshipExplanationKey,
  RelationshipStrength,
  RelationshipStrengthLabel,
  TheoryNodeCluster,
  TheoryNodeKind,
  TheoryRelationshipCatalog,
  TheoryRelationshipEdge,
  TheoryRelationshipKind,
  TheoryRelationshipNode,
} from "./theoryRelationships";

export {
  buildNoteNetworkLayout,
  calculateNoteNetworkPanBounds,
  clampNoteNetworkPan,
  clampNoteNetworkZoom,
  networkBoundsOverlap,
  NOTE_NETWORK_ZOOM_BOUNDS,
  terminateNetworkEdgeAtBounds,
  wrapNoteNetworkLabel,
} from "./noteNetworkLayout";
export type {
  NetworkBounds,
  NetworkClusterBounds,
  NetworkLabelMetadata,
  NetworkPoint,
  NetworkZoomBounds,
  NoteNetworkPanBounds,
  NoteNetworkLayout,
  NoteNetworkLayoutEdge,
  NoteNetworkLayoutNode,
  NoteNetworkLayoutOptions,
} from "./noteNetworkLayout";

export {
  createNoteNetworkSimulation,
  moveNoteNetworkNode,
  noteNetworkNodeRadius,
  NOTE_NETWORK_PHYSICS,
  releaseNoteNetworkNode,
  resizeNoteNetworkSimulation,
  settleNoteNetworkSimulation,
  stepNoteNetworkSimulation,
  wakeNoteNetworkSimulation,
} from "./noteNetworkPhysics";
export type {
  NoteNetworkPhysicsConfig,
  NoteNetworkPhysicsEdge,
  NoteNetworkPhysicsNode,
  NoteNetworkSimulation,
} from "./noteNetworkPhysics";
