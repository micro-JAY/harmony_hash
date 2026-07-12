export {
  isRootDiatonic,
  pitchClassOf,
  scaleDegreeOf,
  scalePitchClasses,
} from "./scaleBasics";

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
