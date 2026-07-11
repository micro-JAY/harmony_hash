import { TOOL_NAMES, TOOL_SCHEMAS } from "../src/voice/toolSchemas";

export const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const DEFAULT_TTS_MODEL_ID = "eleven_flash_v2";

export interface AgentConfigurationSnapshot {
  agentId: string;
  name: string;
  voiceId: string;
  ttsModelId: string;
  authEnabled: boolean;
  allowlist: string[];
  clientToolNames: string[];
}

function clientTools() {
  return TOOL_SCHEMAS.map((tool) => ({
    type: "client" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    expects_response: tool.expectsResponse,
  }));
}

export function buildCreatePayload(systemPrompt: string, voiceId: string) {
  return {
    name: "Harmony Hash — Progression Companion",
    conversation_config: {
      agent: {
        first_message:
          "Hey, I'm your harmony companion. Want to build a progression together, or should I break down what's already on your timeline?",
        language: "en",
        prompt: {
          prompt: systemPrompt,
          // Low latency matters more than long-form depth during a live turn.
          llm: "gemini-2.5-flash",
          temperature: 0.4,
          tools: clientTools(),
        },
      },
      tts: {
        voice_id: voiceId,
        model_id: DEFAULT_TTS_MODEL_ID,
        stability: 0.4,
        speed: 1.0,
      },
      turn: { turn_eagerness: "normal", turn_timeout: 8 },
      conversation: {
        max_duration_seconds: 900,
        client_events: ["agent_response_complete"],
      },
    },
    platform_settings: {
      summary_language: "en",
      auth: { enable_auth: true, allowlist: [] as string[] },
    },
  };
}

/**
 * Existing agents receive only fields owned by source control. Omitting name,
 * TTS, model, and conversation tuning preserves deliberate dashboard changes.
 */
export function buildUpdatePayload(systemPrompt: string) {
  return {
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          tools: clientTools(),
        },
      },
    },
    platform_settings: {
      // Signed URLs and hostname allowlists are mutually exclusive. An explicit
      // empty list clears a stale allowlist during the nested PATCH merge.
      auth: { enable_auth: true, allowlist: [] as string[] },
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordAt(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${path} must be an object`);
  return value;
}

function stringAt(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${path} must be a non-empty string`);
  }
  return value;
}

function nestedRecord(
  root: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  let current = root;
  for (const key of keys) {
    current = recordAt(current[key], keys.slice(0, keys.indexOf(key) + 1).join("."));
  }
  return current;
}

export function readAgentConfiguration(
  payload: unknown,
): AgentConfigurationSnapshot {
  const root = recordAt(payload, "agent");
  const conversation = nestedRecord(root, ["conversation_config"]);
  const agent = nestedRecord(conversation, ["agent"]);
  const prompt = nestedRecord(agent, ["prompt"]);
  const tts = nestedRecord(conversation, ["tts"]);
  const platform = nestedRecord(root, ["platform_settings"]);
  const auth = nestedRecord(platform, ["auth"]);

  if (!Array.isArray(auth.allowlist)) {
    throw new Error("platform_settings.auth.allowlist must be an array");
  }
  if (typeof auth.enable_auth !== "boolean") {
    throw new Error("platform_settings.auth.enable_auth must be a boolean");
  }
  if (!Array.isArray(prompt.tools)) {
    throw new Error("conversation_config.agent.prompt.tools must be an array");
  }

  const clientToolNames = prompt.tools.flatMap((entry, index) => {
    const tool = recordAt(entry, `conversation_config.agent.prompt.tools[${index}]`);
    if (tool.type !== "client") return [];
    return [stringAt(tool.name, `conversation_config.agent.prompt.tools[${index}].name`)];
  });
  const allowlist = auth.allowlist.map((entry, index) => {
    if (typeof entry === "string") return entry;
    const item = recordAt(entry, `platform_settings.auth.allowlist[${index}]`);
    return stringAt(
      item.hostname,
      `platform_settings.auth.allowlist[${index}].hostname`,
    );
  });

  return {
    agentId: stringAt(root.agent_id, "agent_id"),
    name: stringAt(root.name, "name"),
    voiceId: stringAt(tts.voice_id, "conversation_config.tts.voice_id"),
    ttsModelId: stringAt(tts.model_id, "conversation_config.tts.model_id"),
    authEnabled: auth.enable_auth,
    allowlist,
    clientToolNames,
  };
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

export function assertLiveAgentConfiguration(
  snapshot: AgentConfigurationSnapshot,
  expectedAgentId: string,
): void {
  if (snapshot.agentId !== expectedAgentId) {
    throw new Error(`Expected agent ${expectedAgentId}, received ${snapshot.agentId}`);
  }
  if (!snapshot.authEnabled) {
    throw new Error("Agent signed authentication is disabled");
  }
  if (snapshot.allowlist.length > 0) {
    throw new Error("Agent hostname allowlist must be empty for signed authentication");
  }
  const actualTools = sorted(snapshot.clientToolNames);
  const expectedTools = sorted(TOOL_NAMES);
  if (JSON.stringify(actualTools) !== JSON.stringify(expectedTools)) {
    throw new Error(
      `Agent client tools do not match source (expected ${expectedTools.join(", ")}; received ${actualTools.join(", ")})`,
    );
  }
}

export function assertPreservedAgentUpdate(
  before: AgentConfigurationSnapshot,
  after: AgentConfigurationSnapshot,
  expectedAgentId: string,
): void {
  assertLiveAgentConfiguration(after, expectedAgentId);

  const preserved = [
    ["name", before.name, after.name],
    ["voice id", before.voiceId, after.voiceId],
    ["TTS model", before.ttsModelId, after.ttsModelId],
  ] as const;
  for (const [label, previous, current] of preserved) {
    if (previous !== current) {
      throw new Error(`Agent ${label} changed during narrow update`);
    }
  }
}
