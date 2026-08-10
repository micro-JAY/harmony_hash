import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  OpenAIRealtimeSession,
  type RealtimeConnectionStatus,
} from "./openAIRealtimeSession";
import type { ProgressionBridge } from "./types";
import {
  VoiceAgentContext,
  VoiceAgentEventCoordinator,
  type TranscriptEntry,
  type VoiceAgentContextValue,
} from "./voiceAgentContext";

export interface VoiceAgentProviderProps {
  /** Adapter over the host app's progression-builder state (see progressionBridge.ts). */
  bridge: ProgressionBridge;
  /** Worker route that mints a short-lived, fixed-configuration Realtime client secret. */
  clientSecretEndpoint: string;
  children: ReactNode;
}

/** Owns one OpenAI Realtime transport while its popup can open and close freely. */
export function VoiceAgentProvider({
  bridge,
  clientSecretEndpoint,
  children,
}: VoiceAgentProviderProps) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>("disconnected");
  const [message, setMessage] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [sessionKind, setSessionKind] = useState<"voice" | "text" | null>(null);
  const [audioPacketCount, setAudioPacketCount] = useState(0);
  const [agentReplyCount, setAgentReplyCount] = useState(0);
  const [agentReplyAudioBaseline, setAgentReplyAudioBaseline] = useState(0);

  const [coordinator] = useState(
    () => new VoiceAgentEventCoordinator(bridge, {
      setTranscript,
      setSessionKind,
      setAudioPacketCount,
      setAgentReplyCount,
      setAgentReplyAudioBaseline,
      setFatalError: (errorMessage) => {
        setSessionKind(null);
        setMessage(errorMessage);
        setStatus("error");
      },
    }),
  );

  const [session] = useState(() => {
    const realtimeSession = new OpenAIRealtimeSession({
      onStatus: (nextStatus, nextMessage) => {
        setStatus(nextStatus);
        setMessage(nextMessage);
        if (nextStatus === "connected") coordinator.handleConnected();
        if (nextStatus === "error") coordinator.handleDisconnected();
      },
      onEvent: (event) => coordinator.handleEvent(event),
      onPacketCount: (packetCount) => coordinator.handlePacketCount(packetCount),
      onPlaybackError: setPlaybackError,
      onDisconnected: () => coordinator.handleDisconnected(),
    });
    coordinator.attachTransport(realtimeSession);
    return realtimeSession;
  });

  const startSession = useCallback(async (signal?: AbortSignal) => {
    if (
      session.connectionStatus === "connecting"
      || session.connectionStatus === "connected"
    ) {
      return;
    }
    coordinator.beginSession(bridge);
    await session.start(clientSecretEndpoint, signal);
  }, [bridge, clientSecretEndpoint, coordinator, session]);

  const endSession = useCallback(async () => {
    try {
      await session.stop();
    } finally {
      await coordinator.clearFocus();
    }
  }, [coordinator, session]);

  const setVolume = useCallback(({ volume }: { volume: number }) => {
    session.setVolume(volume);
  }, [session]);

  useEffect(() => {
    const handlePageHide = () => {
      void endSession();
    };
    const handlePageShow = () => session.checkDeadline();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") session.checkDeadline();
    };
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [endSession, session]);

  useEffect(() => () => {
    void session.dispose();
    void coordinator.clearFocus();
  }, [coordinator, session]);

  const value = useMemo<VoiceAgentContextValue>(
    () => ({
      bridge,
      clientSecretEndpoint,
      status,
      message,
      playbackError,
      startSession,
      endSession,
      setVolume,
      transcript,
      sessionKind,
      audioPacketCount,
      agentReplyCount,
      agentReplyAudioBaseline,
    }),
    [
      bridge,
      clientSecretEndpoint,
      status,
      message,
      playbackError,
      startSession,
      endSession,
      setVolume,
      transcript,
      sessionKind,
      audioPacketCount,
      agentReplyCount,
      agentReplyAudioBaseline,
    ],
  );

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
}
