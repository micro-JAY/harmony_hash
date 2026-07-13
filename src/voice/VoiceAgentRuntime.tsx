import { VoiceAgentPanel } from "./VoiceAgentPanel";
import { VoiceAgentProvider } from "./VoiceAgentProvider";
import type { ProgressionBridge } from "./types";

export interface VoiceAgentRuntimeProps {
  bridge: ProgressionBridge;
  agentId: string;
  signedUrlEndpoint: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Owns the ElevenLabs-backed provider and popup inside one dynamic-import
 * boundary. App keeps this mounted after first use so closing Hanz does not
 * discard the session transcript or registered client tools.
 */
export default function VoiceAgentRuntime({
  bridge,
  agentId,
  signedUrlEndpoint,
  open,
  onClose,
}: VoiceAgentRuntimeProps) {
  return (
    <VoiceAgentProvider
      bridge={bridge}
      agentId={agentId}
      signedUrlEndpoint={signedUrlEndpoint}
    >
      <VoiceAgentPanel open={open} onClose={onClose} />
    </VoiceAgentProvider>
  );
}
