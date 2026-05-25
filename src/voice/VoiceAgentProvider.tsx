import { ConversationProvider } from "@elevenlabs/react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { ProgressionBridge } from "./types";
import {
  VoiceAgentContext,
  type TranscriptEntry,
  type VoiceAgentContextValue,
} from "./voiceAgentContext";

export interface VoiceAgentProviderProps {
  /** Adapter over the host app's progression-builder state (see progressionBridge.ts). */
  bridge: ProgressionBridge;
  /** ElevenLabs agent id printed by scripts/provision-voice-agent.ts. */
  agentId: string;
  /**
   * Endpoint that mints a short-lived signed URL (the Worker's
   * /api/voice/signed-url). Required because the provisioned agent has
   * authentication enabled. Omit only for a public dev agent, in which case the
   * bare agentId is used to connect.
   */
  signedUrlEndpoint?: string;
  children: ReactNode;
}

/**
 * Wraps the ElevenLabs ConversationProvider and exposes the progression bridge
 * plus a running transcript to the voice UI. Mount this once around the part of
 * the app that contains <VoiceAgentPanel/>.
 */
export function VoiceAgentProvider({
  bridge,
  agentId,
  signedUrlEndpoint,
  children,
}: VoiceAgentProviderProps) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // onMessage receives ElevenLabs' MessagePayload. Verified against the installed
  // @elevenlabs/react 1.6.3 / @elevenlabs/client: { message, role, ... }.
  const handleMessage = useCallback(
    (msg: { message: string; role: "user" | "agent" }) => {
      const text = msg.message?.trim();
      if (!text) return;
      setTranscript((prev) => [
        ...prev.slice(-19),
        { id: prev.length, role: msg.role, text },
      ]);
    },
    [],
  );

  const value = useMemo<VoiceAgentContextValue>(
    () => ({ bridge, agentId, signedUrlEndpoint, transcript }),
    [bridge, agentId, signedUrlEndpoint, transcript],
  );

  return (
    <VoiceAgentContext.Provider value={value}>
      <ConversationProvider
        onMessage={handleMessage}
        onError={(err: unknown) => console.error("[harmony-hash-voice]", err)}
      >
        {children}
      </ConversationProvider>
    </VoiceAgentContext.Provider>
  );
}
