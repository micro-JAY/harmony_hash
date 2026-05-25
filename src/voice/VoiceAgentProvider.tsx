import { ConversationProvider } from "@elevenlabs/react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ProgressionBridge } from "./types";

export interface TranscriptEntry {
  id: number;
  role: "user" | "agent";
  text: string;
}

interface VoiceAgentContextValue {
  bridge: ProgressionBridge;
  agentId: string;
  /** Optional; explicit `undefined` is allowed so the value can be spread from props. */
  signedUrlEndpoint?: string | undefined;
  transcript: TranscriptEntry[];
}

const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

/** Read voice-agent config/state. Throws if used outside <VoiceAgentProvider/>. */
export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) {
    throw new Error("Voice agent hooks must be used inside <VoiceAgentProvider>");
  }
  return ctx;
}

export interface VoiceAgentProviderProps {
  /** Adapter over the host app's progression-builder store (see exampleAdapter.ts). */
  bridge: ProgressionBridge;
  /** ElevenLabs agent id printed by scripts/provision-agent.ts. */
  agentId: string;
  /**
   * Endpoint that mints a short-lived signed URL (see src/server/signedUrlRoute.ts).
   * Required because the provisioned agent has authentication enabled. Omit only
   * for a public dev agent, in which case the bare agentId is used to connect.
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

  // onMessage receives ElevenLabs' MessagePayload. Verified against
  // @elevenlabs/react 1.6.3 / @elevenlabs/client 1.8.1: { message, role, ... }.
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
