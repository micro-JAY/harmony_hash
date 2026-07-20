/**
 * Voice-agent React context + hook, split out from VoiceAgentProvider.tsx so the
 * provider file exports only a component (react-refresh/only-export-components),
 * mirroring the repo's I18nContext.ts / I18nProvider.tsx split.
 */
import { createContext, useContext } from "react";
import type { ProgressionBridge } from "./types";

export interface TranscriptEntry {
  id: number;
  role: "user" | "agent";
  text: string;
}

export interface VoiceAgentContextValue {
  bridge: ProgressionBridge;
  agentId: string;
  /** Optional; explicit `undefined` is allowed so the value can be spread from props. */
  signedUrlEndpoint?: string | undefined;
  transcript: TranscriptEntry[];
  sessionKind: "voice" | "text" | null;
  audioPacketCount: number;
  agentReplyCount: number;
  /** Audio packet count captured when the latest user turn began. */
  agentReplyAudioBaseline: number;
}

export const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

/** Read voice-agent config/state. Throws if used outside <VoiceAgentProvider/>. */
export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) {
    throw new Error("Voice agent hooks must be used inside <VoiceAgentProvider>");
  }
  return ctx;
}
