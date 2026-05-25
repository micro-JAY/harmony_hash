/** Harmony Hash voice companion — public entry point. */

export { VoiceAgentProvider } from "./VoiceAgentProvider";
export type { VoiceAgentProviderProps, TranscriptEntry } from "./VoiceAgentProvider";

export { VoiceAgentPanel } from "./VoiceAgentPanel";
export { useProgressionAgentTools } from "./useProgressionAgentTools";

export { createProgressionBridge } from "./progressionBridge";
export type { BridgeChord, ProgressionBridgeDeps } from "./progressionBridge";

export { TOOL_SCHEMAS, TOOL_NAMES } from "./toolSchemas";
export type { ClientToolSchema } from "./toolSchemas";

export type {
  ProgressionBridge,
  ProgressionSnapshot,
  ProgressionAnalysis,
  ChordRef,
  PlaybackResult,
} from "./types";
