import { VoiceAgentPanel } from "./VoiceAgentPanel";
import { VoiceAgentProvider } from "./VoiceAgentProvider";
import type { ProgressionBridge } from "./types";

export interface VoiceAgentRuntimeProps {
  bridge: ProgressionBridge;
  clientSecretEndpoint: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Owns the OpenAI Realtime provider and popup inside one dynamic-import
 * boundary. App keeps this mounted after first use so closing Hanz does not
 * discard the session transcript or active client tools.
 */
export default function VoiceAgentRuntime({
  bridge,
  clientSecretEndpoint,
  open,
  onClose,
}: VoiceAgentRuntimeProps) {
  return (
    <VoiceAgentProvider
      bridge={bridge}
      clientSecretEndpoint={clientSecretEndpoint}
    >
      <VoiceAgentPanel open={open} onClose={onClose} />
    </VoiceAgentProvider>
  );
}
