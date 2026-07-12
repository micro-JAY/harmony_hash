export {
  isRootDiatonic,
  pitchClassOf,
  scaleDegreeOf,
  scaleIntervalsFor,
  scalePitchClasses,
} from "./scaleBasics";

export {
  buildFretboardRows,
  fretboardTuningFor,
  intervalLabelFor,
  noteLabelForPitchClass,
} from "./fretboard";
export type {
  FretboardInstrument,
  FretboardPosition,
  FretboardString,
  FretboardStringRow,
} from "./fretboard";

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
