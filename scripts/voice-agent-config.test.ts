import { describe, expect, it } from "vitest";
import {
  TOOL_NAMES,
  TOOL_SCHEMAS,
} from "../src/voice/toolSchemas";
import {
  DEFAULT_TTS_MODEL_ID,
  assertAgentCanBeNarrowlyUpdated,
  assertLiveAgentConfiguration,
  assertPreservedAgentUpdate,
  buildClientToolPayload,
  buildCreatePayload,
  buildUpdatePayload,
  clientToolMatchesSource,
  findReusableClientToolId,
  readAgentConfiguration,
  readLinkedTool,
  type AgentConfigurationSnapshot,
  type LinkedToolSnapshot,
} from "./voice-agent-config";

const PROMPT = "Ground every answer in the current progression.";
const TOOL_IDS = TOOL_NAMES.map((name) => `tool_${name}`);

function sourceToolConfig(index: number) {
  const source = TOOL_SCHEMAS[index];
  if (!source) throw new Error(`Missing source tool at index ${index}`);
  return buildClientToolPayload(source).tool_config;
}

function linkedTool(
  index: number,
  overrides: Record<string, unknown> = {},
  responseMocks: unknown[] = [],
): LinkedToolSnapshot {
  return readLinkedTool({
    id: TOOL_IDS[index],
    tool_config: { ...sourceToolConfig(index), ...overrides },
    response_mocks: responseMocks,
  });
}

function linkedTools(): LinkedToolSnapshot[] {
  return TOOL_SCHEMAS.map((_, index) => linkedTool(index));
}

function livePayload(
  promptOverrides: Record<string, unknown> = {},
  rootOverrides: Record<string, unknown> = {},
) {
  return {
    agent_id: "agent_test",
    name: "Hanz Hasher",
    conversation_config: {
      agent: {
        prompt: {
          prompt: PROMPT,
          tool_ids: [...TOOL_IDS],
          built_in_tools: {},
          // Some tenants still mirror migrated tools here. The linked toolbox
          // records remain authoritative, but a non-client mirror must fail.
          tools: TOOL_SCHEMAS.map((_, index) => sourceToolConfig(index)),
          ...promptOverrides,
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
        allowlist: [],
      },
    },
    ...rootOverrides,
  };
}

function snapshot(
  overrides: Partial<AgentConfigurationSnapshot> = {},
): AgentConfigurationSnapshot {
  return { ...readAgentConfiguration(livePayload()), ...overrides };
}

describe("voice agent payloads", () => {
  it("builds source-owned toolbox client contracts", () => {
    expect(buildClientToolPayload(TOOL_SCHEMAS[0])).toEqual({
      tool_config: {
        type: "client",
        name: TOOL_SCHEMAS[0].name,
        description: TOOL_SCHEMAS[0].description,
        parameters: TOOL_SCHEMAS[0].parameters,
        expects_response: TOOL_SCHEMAS[0].expectsResponse,
        execution_mode: "immediate",
        assignments: [],
        dynamic_variables: { dynamic_variable_placeholders: {} },
        interruption_mode: "allow",
        pre_tool_speech: "auto",
        response_timeout_secs: 30,
        tool_call_sound: null,
        tool_call_sound_behavior: "auto",
        tool_error_handling_mode: "auto",
      },
      response_mocks: [],
    });
  });

  it("keeps full defaults in modern create payloads", () => {
    const payload = buildCreatePayload(PROMPT, "voice_create", TOOL_IDS);
    expect(payload).toMatchObject({
      name: "Harmony Hash — Progression Companion",
      conversation_config: {
        agent: {
          language: "en",
          prompt: {
            prompt: PROMPT,
            llm: "gemini-2.5-flash",
            tool_ids: TOOL_IDS,
            built_in_tools: {},
          },
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
    expect(payload.conversation_config.agent.prompt).not.toHaveProperty("tools");
  });

  it("updates only source-owned prompt, modern tools, and signed auth", () => {
    const payload = buildUpdatePayload(PROMPT, TOOL_IDS);
    expect(Object.keys(payload).sort()).toEqual([
      "conversation_config",
      "platform_settings",
    ]);
    expect(Object.keys(payload.conversation_config.agent.prompt).sort()).toEqual([
      "built_in_tools",
      "prompt",
      "tool_ids",
    ]);
    expect(payload.conversation_config.agent.prompt).toEqual({
      prompt: PROMPT,
      tool_ids: TOOL_IDS,
      built_in_tools: {},
    });
    expect(payload.platform_settings.auth).toEqual({
      enable_auth: true,
      allowlist: [],
    });
    expect(JSON.stringify(payload)).not.toContain("voice_id");
    expect(JSON.stringify(payload)).not.toContain("model_id");
    expect(JSON.stringify(payload)).not.toContain("first_message");
    expect(JSON.stringify(payload)).not.toContain("temperature");
    expect(payload.conversation_config.agent.prompt).not.toHaveProperty("tools");
  });

  it("rejects incomplete, duplicate, or empty source tool ids", () => {
    expect(() => buildUpdatePayload(PROMPT, TOOL_IDS.slice(1))).toThrow(
      "Expected 9 source tool ids",
    );
    expect(() =>
      buildUpdatePayload(PROMPT, [...TOOL_IDS.slice(0, -1), TOOL_IDS[0]]),
    ).toThrow("unique non-empty");
    expect(() =>
      buildUpdatePayload(PROMPT, [...TOOL_IDS.slice(0, -1), ""]),
    ).toThrow("unique non-empty");
  });
});

describe("voice agent response parsing", () => {
  it("reads modern capability fields and the optional legacy mirror", () => {
    const parsed = readAgentConfiguration(livePayload({
      mcp_server_ids: ["mcp_workspace"],
      native_mcp_server_ids: ["mcp_native"],
    }, {
      workflow: { nodes: { start_node: { type: "start" } }, edges: {} },
    }));

    expect(parsed).toMatchObject({
      agentId: "agent_test",
      name: "Hanz Hasher",
      voiceId: "voice_custom",
      ttsModelId: "eleven_v3_conversational",
      authEnabled: true,
      allowlist: [],
      toolIds: TOOL_IDS,
      builtInToolNames: [],
      mcpServerIds: ["mcp_workspace"],
      nativeMcpServerIds: ["mcp_native"],
      workflowNodeCount: 1,
      workflowEdgeCount: 0,
      legacyNonClientToolNames: [],
      unknownCapabilityFields: [],
    });
    expect(parsed.legacyClientTools.map((tool) => tool.name)).toEqual(TOOL_NAMES);
  });

  it("reads allowlist hostname objects without exposing other fields", () => {
    const payload = livePayload();
    payload.platform_settings.auth.allowlist = [
      { hostname: "preview.harmony.tonari.ai" },
    ];
    expect(readAgentConfiguration(payload).allowlist).toEqual([
      "preview.harmony.tonari.ai",
    ]);
  });

  it("records unknown prompt capability fields for fail-closed review", () => {
    const parsed = readAgentConfiguration(livePayload({
      future_tool_bindings: ["tool_future"],
      ordinary_prompt_setting: true,
    }));
    expect(parsed.unknownCapabilityFields).toEqual([
      "future_tool_bindings",
      "ordinary_prompt_setting",
    ]);
  });

  it("records nested override and opaque workflow authority", () => {
    const payload = livePayload({}, {
      workflow: { nodes: {}, edges: {}, tools: ["tool_hidden"] },
    });
    Object.assign(payload.conversation_config, {
      language_presets: {
        es: {
          overrides: {
            agent: { prompt: { tool_ids: ["tool_language_override"] } },
          },
        },
      },
    });
    expect(readAgentConfiguration(payload).unknownCapabilityFields).toEqual([
      "workflow.tools",
      "conversation_config.language_presets.es.overrides.agent.prompt.tool_ids",
    ]);
  });

  it("accepts the documented empty workflow guard but rejects invalid typing", () => {
    expect(() =>
      readAgentConfiguration(livePayload({}, {
        workflow: {
          nodes: {},
          edges: {},
          prevent_subagent_loops: false,
        },
      })),
    ).not.toThrow();
    expect(() =>
      readAgentConfiguration(livePayload({}, {
        workflow: {
          nodes: {},
          edges: {},
          prevent_subagent_loops: "false",
        },
      })),
    ).toThrow("workflow.prevent_subagent_loops must be a boolean");
  });
});

describe("voice agent verification", () => {
  it("accepts exact auth, capability surfaces, ids, and client contracts", () => {
    expect(() =>
      assertLiveAgentConfiguration(snapshot(), "agent_test", PROMPT, linkedTools()),
    ).not.toThrow();
  });

  it("rejects live system-prompt drift", () => {
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ systemPrompt: "Drifted provider prompt" }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("system prompt does not match source");
  });

  it("rejects auth, id, and allowlist drift", () => {
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ agentId: "agent_other" }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("Expected agent");
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ authEnabled: false }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("authentication is disabled");
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ allowlist: ["harmony.tonari.ai"] }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("allowlist must be empty");
  });

  it("rejects unexpected linked tools and unresolved tool ids", () => {
    const webhook = readLinkedTool({
      id: "tool_webhook",
      tool_config: { type: "webhook", name: "send_data" },
    });
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ toolIds: [...TOOL_IDS, webhook.id] }),
        "agent_test",
        PROMPT,
        [...linkedTools(), webhook],
      ),
    ).toThrow("count does not match source");
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ toolIds: [...TOOL_IDS, "tool_unresolved"] }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("Resolved linked tools do not match");
  });

  it("rejects duplicate tool ids", () => {
    expect(() =>
      assertLiveAgentConfiguration(
        snapshot({ toolIds: [...TOOL_IDS.slice(0, -1), TOOL_IDS[0]] }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("must not contain duplicates");
  });

  it("rejects same-name linked contract drift", () => {
    const drifted = linkedTools();
    drifted[3] = linkedTool(3, {
      description: "A different contract under the expected name",
      parameters: {
        type: "object",
        properties: { unexpected: { type: "string" } },
      },
      expects_response: false,
    });
    expect(() =>
      assertLiveAgentConfiguration(snapshot(), "agent_test", PROMPT, drifted),
    ).toThrow("contract for replace_progression does not match source");
  });

  it("rejects execution, assignment, dynamic-variable, response-mock, and unknown drift", () => {
    const cases = [
      linkedTool(0, { execution_mode: "async" }),
      linkedTool(0, { assignments: [{ dynamic_variable: "user" }] }),
      linkedTool(0, {
        dynamic_variables: {
          dynamic_variable_placeholders: { account_id: "example" },
        },
      }),
      linkedTool(0, {
        dynamic_variables: {
          dynamic_variable_placeholders: {},
          future_authority: true,
        },
      }),
      linkedTool(0, { interruption_mode: "disable_during_tool" }),
      linkedTool(0, { pre_tool_speech: "force" }),
      linkedTool(0, { response_timeout_secs: 5 }),
      linkedTool(0, { tool_call_sound: "typing" }),
      linkedTool(0, { tool_call_sound_behavior: "always" }),
      linkedTool(0, { tool_error_handling_mode: "custom" }),
      linkedTool(0, { disable_interruptions: true }),
      linkedTool(0, { force_pre_tool_speech: true }),
      linkedTool(0, { response_body_schema: { type: "object" } }),
      linkedTool(0, { api_schema_overrides: { url: "https://example.test" } }),
      linkedTool(0, {}, [{ mock_result: "unexpected" }]),
      linkedTool(0, { future_client_authority: true }),
    ];
    cases.forEach((driftedTool) => {
      const current = linkedTools();
      current[0] = driftedTool;
      expect(() =>
        assertLiveAgentConfiguration(snapshot(), "agent_test", PROMPT, current),
      ).toThrow("contract for get_progression does not match source");
    });
  });

  it("rejects task execution authority and unknown toolbox record fields", () => {
    const taskCapable = readLinkedTool({
      id: TOOL_IDS[0],
      tool_config: sourceToolConfig(0),
      response_mocks: [],
      execution: { taskSupport: "optional" },
    });
    const unknownRoot = readLinkedTool({
      id: TOOL_IDS[0],
      tool_config: sourceToolConfig(0),
      response_mocks: [],
      future_authority: true,
    });
    [taskCapable, unknownRoot].forEach((driftedTool) => {
      const current = linkedTools();
      current[0] = driftedTool;
      expect(() =>
        assertLiveAgentConfiguration(snapshot(), "agent_test", PROMPT, current),
      ).toThrow("contract for get_progression does not match source");
    });
  });

  it("rejects built-in, MCP, workflow, legacy non-client, and future surfaces", () => {
    const cases: Array<[Partial<AgentConfigurationSnapshot>, string]> = [
      [{ builtInToolNames: ["transfer_to_number"] }, "built-in tools"],
      [{ mcpServerIds: ["mcp_workspace"] }, "MCP servers"],
      [{ nativeMcpServerIds: ["mcp_native"] }, "native MCP servers"],
      [{ workflowNodeCount: 1 }, "workflow nodes"],
      [{ workflowEdgeCount: 1 }, "workflow edges"],
      [{ legacyNonClientToolNames: ["send_data"] }, "legacy non-client tools"],
      [{ unknownCapabilityFields: ["future_tool_bindings"] }, "unknown capability"],
    ];
    cases.forEach(([overrides, message]) => {
      expect(() =>
        assertLiveAgentConfiguration(
          snapshot(overrides),
          "agent_test",
          PROMPT,
          linkedTools(),
        ),
      ).toThrow(message);
    });
  });

  it("ignores null built-in placeholders while retaining configured tools", () => {
    const parsed = readAgentConfiguration(livePayload({
      built_in_tools: {
        end_call: null,
        language_detection: null,
        transfer_to_number: {},
      },
    }));

    expect(parsed.builtInToolNames).toEqual(["transfer_to_number"]);
  });

  it("ignores only the inert provider start node in a workflow", () => {
    const inert = readAgentConfiguration(livePayload({}, {
      workflow: {
        nodes: {
          start_node: {
            type: "start",
            edge_order: [],
            position: { x: 0, y: 0 },
          },
        },
        edges: {},
      },
    }));
    expect(inert.workflowNodeCount).toBe(0);
    expect(inert.workflowEdgeCount).toBe(0);

    const configured = [
      { type: "start", edge_order: ["next"], position: { x: 0, y: 0 } },
      { type: "start", edge_order: [], position: { x: 0, y: 0 }, tools: [] },
      { type: "override_agent", edge_order: [], position: { x: 0, y: 0 } },
    ];
    configured.forEach((startNode) => {
      const parsed = readAgentConfiguration(livePayload({}, {
        workflow: { nodes: { start_node: startNode }, edges: {} },
      }));
      expect(parsed.workflowNodeCount).toBe(1);
    });
  });

  it("ignores current inert prompt and capability defaults", () => {
    const parsed = readAgentConfiguration(livePayload({
      reasoning_effort: null,
      opener: null,
      thinking_budget: null,
      enable_reasoning_summary: false,
      enable_parallel_tool_calls: false,
      custom_llm: null,
      speech_engine: null,
      ignore_default_personality: false,
      rag: {
        enabled: false,
        embedding_model: "e5_mistral_7b_instruct",
        optional_rag_enabled: false,
        max_vector_distance: 0.6,
        max_documents_length: 10000,
        max_retrieved_rag_chunks_count: 20,
        num_candidates: null,
        query_rewrite_prompt_override: null,
      },
      timezone: "UTC",
      backup_llm_config: { preference: "system_default" },
      cascade_timeout_seconds: 10,
      knowledge_base: [],
    }, {
      platform_settings: {
        auth: { enable_auth: true, allowlist: [] },
        overrides: {
          conversation_config_override: {
            agent: { prompt: { tool_ids: false, native_mcp_server_ids: false } },
          },
        },
      },
      procedures: {},
    }));

    expect(parsed.unknownCapabilityFields).toEqual([]);
  });

  it("retains active current-schema capabilities for the update guard", () => {
    const cases: Array<[Record<string, unknown>, Record<string, unknown>, string]> = [
      [{ enable_parallel_tool_calls: true }, {}, "enable_parallel_tool_calls"],
      [{ custom_llm: {} }, {}, "custom_llm"],
      [{ rag: { enabled: true, optional_rag_enabled: false } }, {}, "rag"],
      [{ knowledge_base: [{ id: "kb", usage_mode: "prompt" }] }, {}, "knowledge_base"],
      [{}, { procedures: { build: {} } }, "procedures"],
      [{}, {
        platform_settings: {
          auth: { enable_auth: true, allowlist: [] },
          overrides: {
            conversation_config_override: {
              agent: { prompt: { tool_ids: true } },
            },
          },
        },
      }, "tool_ids"],
      [{}, {
        platform_settings: {
          auth: { enable_auth: true, allowlist: [] },
          overrides: {
            conversation_config_override: {
              agent: { prompt: { llm: true } },
            },
          },
        },
      }, "llm"],
      [{}, {
        conversation_config: {
          agent: livePayload().conversation_config.agent,
          tts: livePayload().conversation_config.tts,
          language_presets: {
            es: { overrides: { agent: { prompt: { custom_llm: { url: "https://llm.test" } } } } },
          },
        },
      }, "custom_llm"],
      [{}, {
        conversation_config: {
          agent: livePayload().conversation_config.agent,
          tts: livePayload().conversation_config.tts,
          language_presets: {
            es: { overrides: { agent: { prompt: { rag: { enabled: true } } } } },
          },
        },
      }, "rag"],
      [{}, {
        conversation_config: {
          agent: livePayload().conversation_config.agent,
          tts: livePayload().conversation_config.tts,
          language_presets: {
            es: { overrides: { agent: { prompt: { knowledge_base: [{ id: "kb" }] } } } },
          },
        },
      }, "knowledge_base"],
      [{}, {
        platform_settings: {
          auth: { enable_auth: true, allowlist: [] },
          overrides: {
            conversation_config_override: {
              agent: { prompt: { tool_ids: {} } },
            },
          },
        },
      }, "tool_ids"],
      [{}, {
        conversation_config: {
          agent: livePayload().conversation_config.agent,
          tts: livePayload().conversation_config.tts,
          language_presets: {
            es: { overrides: { agent: { prompt: { custom_llm: [] } } } },
          },
        },
      }, "custom_llm"],
      [{}, {
        conversation_config: {
          agent: livePayload().conversation_config.agent,
          tts: livePayload().conversation_config.tts,
          language_presets: {
            es: { overrides: { agent: { prompt: { rag: [] } } } },
          },
        },
      }, "rag"],
    ];

    cases.forEach(([prompt, root, expected]) => {
      expect(readAgentConfiguration(livePayload(prompt, root)).unknownCapabilityFields)
        .toEqual(expect.arrayContaining([expect.stringContaining(expected)]));
    });
  });

  it("treats the legacy client mirror as inventory, not tool authority", () => {
    const parsed = readAgentConfiguration(livePayload({
      tools: TOOL_SCHEMAS.map((_, index) =>
        index === 3
          ? { ...sourceToolConfig(index), description: "drifted" }
          : sourceToolConfig(index),
      ),
    }));
    expect(() =>
      assertLiveAgentConfiguration(parsed, "agent_test", PROMPT, linkedTools()),
    ).not.toThrow();

    const incomplete = readAgentConfiguration(livePayload({
      tools: TOOL_SCHEMAS.slice(1).map((_, index) => sourceToolConfig(index + 1)),
    }));
    expect(() =>
      assertLiveAgentConfiguration(incomplete, "agent_test", PROMPT, linkedTools()),
    ).toThrow("legacy client tools count does not match source");
  });

  it("blocks ambiguous preserved capabilities before any narrow update", () => {
    expect(() => assertAgentCanBeNarrowlyUpdated(snapshot())).not.toThrow();
    expect(() =>
      assertAgentCanBeNarrowlyUpdated(
        snapshot({ workflowNodeCount: 1 }),
      ),
    ).toThrow("remove them explicitly before");
  });

  it("reuses only exact source-owned client contracts", () => {
    const tools = linkedTools();
    expect(findReusableClientToolId(TOOL_SCHEMAS[0], tools)).toBe(TOOL_IDS[0]);
    const sourceParameters = sourceToolConfig(0).parameters;
    const normalized = linkedTool(0, {
      parameters: { ...sourceParameters, required: [], description: "" },
    });
    expect(clientToolMatchesSource(normalized, TOOL_SCHEMAS[0])).toBe(true);
    const described = linkedTool(0, {
      parameters: { ...sourceParameters, description: "Provider drift" },
    });
    expect(clientToolMatchesSource(described, TOOL_SCHEMAS[0])).toBe(false);
    const providerNormalizedAddChords = linkedTool(2, {
      parameters: {
        type: "object",
        required: ["chords"],
        description: "",
        properties: {
          chords: {
            type: "array",
            description:
              "Chord symbols to append, in order, e.g. ['Am','F','C','G']. Send at most 24 symbols, each at most 48 characters.",
            items: {
              type: "string",
              description: "A chord symbol, e.g. 'Am7'.",
              enum: null,
              is_system_provided: false,
              dynamic_variable: "",
              allowed_values_dynamic_variable: "",
              constant_value: "",
              is_omitted: false,
            },
            dynamic_variable: "",
            constant_value: null,
            is_omitted: false,
          },
        },
      },
    });
    expect(clientToolMatchesSource(providerNormalizedAddChords, TOOL_SCHEMAS[2])).toBe(true);
    const providerOwnedValue = linkedTool(2, {
      parameters: {
        ...providerNormalizedAddChords.clientContract?.parameters,
        properties: {
          chords: {
            type: "array",
            description:
              "Chord symbols to append, in order, e.g. ['Am','F','C','G']. Send at most 24 symbols, each at most 48 characters.",
            items: { type: "string", description: "A chord symbol, e.g. 'Am7'." },
            dynamic_variable: "injected_chords",
          },
        },
      },
    });
    expect(clientToolMatchesSource(providerOwnedValue, TOOL_SCHEMAS[2])).toBe(false);
    const drifted = [linkedTool(0, { description: "drifted" }), ...tools.slice(1)];
    expect(findReusableClientToolId(TOOL_SCHEMAS[0], drifted)).toBeUndefined();
    expect(clientToolMatchesSource(tools[0], TOOL_SCHEMAS[0])).toBe(true);
  });

  it("proves a narrow update preserved identity, voice, and TTS model", () => {
    const before = snapshot();
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot(),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).not.toThrow();
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({ name: "Overwritten name" }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("name changed");
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({ voiceId: "voice_overwritten" }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("voice id changed");
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({ ttsModelId: "eleven_flash_v2" }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("TTS model changed");
    expect(() =>
      assertPreservedAgentUpdate(
        before,
        snapshot({
          ttsConfig: {
            ...before.ttsConfig,
            stability: 0.1,
          },
        }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("TTS configuration changed");
  });

  it("rejects post-update system-prompt drift", () => {
    expect(() =>
      assertPreservedAgentUpdate(
        snapshot(),
        snapshot({ systemPrompt: "Stale prompt after update" }),
        "agent_test",
        PROMPT,
        linkedTools(),
      ),
    ).toThrow("system prompt does not match source");
  });
});
