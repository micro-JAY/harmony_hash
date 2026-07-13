import { ConversationProvider } from "@elevenlabs/react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { ProgressionBridge } from "./types";
import { sanitizeProviderDetail } from "../lib/sanitizeProviderDetail";
import {
  VoiceAgentContext,
  type TranscriptEntry,
  type VoiceAgentContextValue,
} from "./voiceAgentContext";
import { clearVoiceFocus } from "./sessionLifecycle";

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

  // Monotonic transcript ids. `slice(-19)` caps the array at 20, so `prev.length`
  // would stick at 20 and hand React duplicate keys (stale/misordered rows in long
  // sessions). Increment a ref OUTSIDE the setState updater — the updater can run
  // twice under StrictMode, but an event handler runs once.
  const nextIdRef = useRef(0);

  // onMessage receives ElevenLabs' MessagePayload. Verified against the installed
  // @elevenlabs/react 1.6.3 / @elevenlabs/client: { message, role, ... }.
  const handleMessage = useCallback(
    (msg: { message: string; role: "user" | "agent" }) => {
      const text = msg.message?.trim();
      if (!text) return;
      const id = nextIdRef.current++;
      setTranscript((prev) => [...prev.slice(-19), { id, role: msg.role, text }]);
    },
    [],
  );

  const value = useMemo<VoiceAgentContextValue>(
    () => ({ bridge, agentId, signedUrlEndpoint, transcript }),
    [bridge, agentId, signedUrlEndpoint, transcript],
  );

  const clearFocusAfterSession = useCallback(async () => {
    try {
      await clearVoiceFocus(bridge);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.error("[harmony-hash-voice] Could not clear Hanz focus", sanitizeProviderDetail(detail));
    }
  }, [bridge]);

  const handleProviderError = useCallback((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[harmony-hash-voice]", sanitizeProviderDetail(detail));
    void clearFocusAfterSession();
  }, [clearFocusAfterSession]);

  return (
    <VoiceAgentContext.Provider value={value}>
      <ConversationProvider
        onMessage={handleMessage}
        onDisconnect={() => void clearFocusAfterSession()}
        onError={handleProviderError}
      >
        {children}
      </ConversationProvider>
    </VoiceAgentContext.Provider>
  );
}
