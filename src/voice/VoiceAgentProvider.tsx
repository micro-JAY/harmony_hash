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
  const [sessionKind, setSessionKind] = useState<"voice" | "text" | null>(null);
  const [audioPacketCount, setAudioPacketCount] = useState(0);
  const [agentReplyCount, setAgentReplyCount] = useState(0);
  const [agentReplyAudioBaseline, setAgentReplyAudioBaseline] = useState(0);
  const audioPacketCountRef = useRef(0);
  const currentTurnAudioBaselineRef = useRef(0);

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
      if (msg.role === "user") {
        currentTurnAudioBaselineRef.current = audioPacketCountRef.current;
      } else {
        setAgentReplyAudioBaseline(currentTurnAudioBaselineRef.current);
        setAgentReplyCount((count) => count + 1);
      }
      const id = nextIdRef.current++;
      setTranscript((prev) => [...prev.slice(-19), { id, role: msg.role, text }]);
    },
    [],
  );

  const handleConversationCreated = useCallback((conversation: { type: "voice" | "text" }) => {
    audioPacketCountRef.current = 0;
    currentTurnAudioBaselineRef.current = 0;
    setAudioPacketCount(0);
    setAgentReplyCount(0);
    setAgentReplyAudioBaseline(0);
    setSessionKind(conversation.type);
  }, []);

  const handleAudio = useCallback((base64Audio: string) => {
    if (base64Audio.length === 0) return;
    audioPacketCountRef.current += 1;
    setAudioPacketCount(audioPacketCountRef.current);
  }, []);

  const providerOverrides = useMemo(
    () => ({ conversation: { textOnly: false } }),
    [],
  );

  const value = useMemo<VoiceAgentContextValue>(
    () => ({
      bridge,
      agentId,
      signedUrlEndpoint,
      transcript,
      sessionKind,
      audioPacketCount,
      agentReplyCount,
      agentReplyAudioBaseline,
    }),
    [
      bridge,
      agentId,
      signedUrlEndpoint,
      transcript,
      sessionKind,
      audioPacketCount,
      agentReplyCount,
      agentReplyAudioBaseline,
    ],
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
        textOnly={false}
        overrides={providerOverrides}
        onConversationCreated={handleConversationCreated}
        onAudio={handleAudio}
        onMessage={handleMessage}
        onDisconnect={() => {
          setSessionKind(null);
          void clearFocusAfterSession();
        }}
        onError={handleProviderError}
      >
        {children}
      </ConversationProvider>
    </VoiceAgentContext.Provider>
  );
}
