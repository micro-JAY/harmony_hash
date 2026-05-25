/** Harmony Hash voice companion — public entry point. */

export { VoiceAgentProvider } from "./VoiceAgentProvider";
export type { VoiceAgentProviderProps, TranscriptEntry } from "./VoiceAgentProvider";

export { VoiceAgentPanel } from "./VoiceAgentPanel";
export { useProgressionAgentTools } from "./useProgressionAgentTools";

// `createProgressionBridge` is exported once the real adapter lands in
// progressionBridge.ts (Stage 3). The package's exampleAdapter.ts is not copied.

export { TOOL_SCHEMAS, TOOL_NAMES } from "./toolSchemas";
export type { ClientToolSchema } from "./toolSchemas";

export type {
  ProgressionBridge,
  ProgressionSnapshot,
  ProgressionAnalysis,
  CompatibleScale,
  ChordRef,
  SuggestionMode,
} from "./types";
