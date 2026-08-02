import { HANZ_SYSTEM_PROMPT } from "./hanzSystemPrompt";
import { TOOL_SCHEMAS } from "./toolSchemas";

export const HANZ_REALTIME_MODEL = "gpt-realtime-2.1";
export const HANZ_REALTIME_VOICE = "marin";
export const HANZ_MAX_SESSION_MS = 300_000;
export const HANZ_MAX_SESSION_SECONDS = HANZ_MAX_SESSION_MS / 1_000;

export const HANZ_REALTIME_TOOLS = TOOL_SCHEMAS.map((tool) => ({
  type: "function" as const,
  name: tool.name,
  description: tool.description,
  parameters: {
    ...tool.parameters,
    required: tool.parameters.required ?? [],
    additionalProperties: false,
  },
}));

export function createHanzRealtimeSession(
  nowEpochSeconds = Math.floor(Date.now() / 1_000),
) {
  return {
    type: "realtime" as const,
    model: HANZ_REALTIME_MODEL,
    output_modalities: ["audio"] as const,
    instructions: HANZ_SYSTEM_PROMPT,
    reasoning: { effort: "low" as const },
    audio: {
      input: {
        noise_reduction: { type: "near_field" as const },
        transcription: { model: "gpt-live-transcribe" },
        turn_detection: {
          type: "semantic_vad" as const,
          eagerness: "low" as const,
          create_response: true,
          interrupt_response: true,
        },
      },
      output: {
        voice: HANZ_REALTIME_VOICE,
        speed: 1,
      },
    },
    tools: HANZ_REALTIME_TOOLS,
    tool_choice: "auto" as const,
    max_output_tokens: 1_024,
    expires_at: nowEpochSeconds + HANZ_MAX_SESSION_SECONDS,
    tracing: null,
  };
}
