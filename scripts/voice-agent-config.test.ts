import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../src/voice/toolSchemas";
import {
  DEFAULT_TTS_MODEL_ID,
  assertLiveAgentConfiguration,
  assertPreservedAgentUpdate,
  buildCreatePayload,
  buildUpdatePayload,
  readAgentConfiguration,
  type AgentConfigurationSnapshot,
} from "./voice-agent-config";

const PROMPT = "Ground every answer in the current progression.";

function snapshot(
  overrides: Partial<AgentConfigurationSnapshot> = {},
): AgentConfigurationSnapshot {
  return {
    agentId: "agent_test",
    name: "Hanz Hasher",
    voiceId: "voice_custom",
    ttsModelId: "eleven_v3_conversational",
    authEnabled: true,
    allowlist: [],
    clientToolNames: [...TOOL_NAMES],
    ...overrides,
  };
}

describe("voice agent payloads", () => {
  it("keeps full defaults in create payloads", () => {
    const payload = buildCreatePayload(PROMPT, "voice_create");
    expect(payload).toMatchObject({
      name: "Harmony Hash — Progression Companion",
      conversation_config: {
        agent: {
          language: "en",
          prompt: { prompt: PROMPT, llm: "gemini-2.5-flash" },
        },
        tts: {
          voice_id: "voice_create",
          model_id: DEFAULT_TTS_MODEL_ID,
        },
      },
      platform_settings: {
        auth: { enable_auth: true, allowlist: [] },
      },
    });
    expect(payload.conversation_config.agent.prompt.tools.map((tool) => tool.name)).toEqual(
      TOOL_NAMES,
    );
  });

  it("updates only source-owned prompt, tools, and signed auth", () => {
    const payload = buildUpdatePayload(PROMPT);
    expect(Object.keys(payload).sort()).toEqual([
      "conversation_config",
      "platform_settings",
    ]);
    expect(Object.keys(payload.conversation_config.agent.prompt).sort()).toEqual([
      "prompt",
      "tools",
    ]);
    expect(payload.platform_settings.auth).toEqual({
      enable_auth: true,
      allowlist: [],
    });
    expect(JSON.stringify(payload)).not.toContain("voice_id");
    expect(JSON.stringify(payload)).not.toContain("model_id");
    expect(JSON.stringify(payload)).not.toContain("first_message");
    expect(JSON.stringify(payload)).not.toContain("temperature");
    expect(payload.conversation_config.agent.prompt.tools.map((tool) => tool.name)).toEqual(
      TOOL_NAMES,
    );
  });
});

describe("voice agent verification", () => {
  it("reads safe verification fields from the live response shape", () => {
    const parsed = readAgentConfiguration({
      agent_id: "agent_test",
      name: "Hanz Hasher",
      conversation_config: {
        agent: {
          prompt: {
            tools: TOOL_NAMES.map((name) => ({ type: "client", name })),
          },
        },
        tts: {
          voice_id: "voice_custom",
          model_id: "eleven_v3_conversational",
        },
      },
      platform_settings: {
        auth: {
          enable_auth: true,
          allowlist: [{ hostname: "preview.harmony.tonari.ai" }],
        },
      },
    });

    expect(parsed).toEqual(
      snapshot({ allowlist: ["preview.harmony.tonari.ai"] }),
    );
  });

  it("accepts the expected id, signed auth, empty allowlist, and exact tools", () => {
    expect(() => assertLiveAgentConfiguration(snapshot(), "agent_test")).not.toThrow();
  });

  it("rejects auth, id, allowlist, and tool drift", () => {
    expect(() =>
      assertLiveAgentConfiguration(snapshot({ agentId: "agent_other" }), "agent_test"),
    ).toThrow("Expected agent");
    expect(() =>
      assertLiveAgentConfiguration(snapshot({ authEnabled: false }), "agent_test"),
    ).toThrow("authentication is disabled");
    expect(() =>
      assertLiveAgentConfiguration(snapshot({ allowlist: ["harmony.tonari.ai"] }), "agent_test"),
    ).toThrow("allowlist must be empty");
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ clientToolNames: TOOL_NAMES.slice(1) }),
        "agent_test",
      ),
    ).toThrow("do not match source");
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ clientToolNames: [...TOOL_NAMES, TOOL_NAMES[0]] }),
        "agent_test",
      ),
    ).toThrow("do not match source");
  });

  it("proves a narrow update preserved identity, voice, and TTS model", () => {
    const before = snapshot();
    expect(() =>
      assertPreservedAgentUpdate(before, snapshot(), "agent_test"),
    ).not.toThrow();
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({ name: "Overwritten name" }),
        "agent_test",
      ),
    ).toThrow("name changed");
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({ voiceId: "voice_overwritten" }),
        "agent_test",
      ),
    ).toThrow("voice id changed");
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({ ttsModelId: "eleven_flash_v2" }),
        "agent_test",
      ),
    ).toThrow("TTS model changed");
  });
});
