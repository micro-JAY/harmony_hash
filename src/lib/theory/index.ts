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
  buildScalePlaybackSchedule,
  buildScalePracticeSequence,
  parseScaleLearningDefinitions,
  SCALE_FAMILIES,
  SCALE_LEARNING,
  scaleDegreeName,
  scaleLearningDefinitionFor,
  scaleLearningForFamily,
  scaleStepLabels,
} from "./scaleCatalog";
export type {
  ArpeggioType,
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
  scoreChordKeyFit,
  scoreNextChordFit,
  scoreRootMotionFit,
  scoreVoiceLeadingFit,
} from "./harmonicSuggestions";
export type {
  HarmonicFitComponents,
  HarmonicFitResult,
  HarmonicFitTier,
  HarmonyContext,
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
