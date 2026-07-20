export type ConversationKind = "voice" | "text" | null;

export function voiceAudioHealthIssue(options: {
  live: boolean;
  agentReplyCount: number;
  sessionKind: ConversationKind;
  audioPacketCount: number;
  agentReplyAudioBaseline: number;
}): "text-only" | "missing-audio" | null {
  if (!options.live || options.agentReplyCount === 0) return null;
  if (options.sessionKind !== "voice") return "text-only";
  return options.audioPacketCount > options.agentReplyAudioBaseline
    ? null
    : "missing-audio";
}
