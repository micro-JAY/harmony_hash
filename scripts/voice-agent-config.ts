import {
  TOOL_NAMES,
  TOOL_SCHEMAS,
  type ClientToolSchema,
} from "../src/voice/toolSchemas";

export const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const DEFAULT_TTS_MODEL_ID = "eleven_flash_v2";

const KNOWN_PROMPT_FIELDS = new Set([
  "prompt",
  "llm",
  "temperature",
  "max_tokens",
  "knowledge_base",
  "tools",
  "tool_ids",
  "built_in_tools",
  "mcp_server_ids",
  "native_mcp_server_ids",
]);

const PARSED_CAPABILITY_SUBTREES = new Set([
  "conversation_config.agent.prompt",
  "conversation_config.agent.prompt.tools",
  "conversation_config.agent.prompt.tool_ids",
  "conversation_config.agent.prompt.built_in_tools",
  "conversation_config.agent.prompt.mcp_server_ids",
  "conversation_config.agent.prompt.native_mcp_server_ids",
  "workflow",
  "conversation_config.workflow",
]);

const CAPABILITY_FIELD_NAMES = new Set([
  "tools",
  "tool_ids",
  "additional_tool_ids",
  "built_in_tools",
  "mcp_server_ids",
  "native_mcp_server_ids",
  "workflow",
  "action_ids",
  "integration_ids",
  "integrations",
  "transfers",
  "procedures",
]);

const KNOWN_CLIENT_TOOL_CONFIG_FIELDS = new Set([
  "type",
  "name",
  "description",
  "parameters",
  "expects_response",
  "execution_mode",
  "assignments",
  "dynamic_variables",
  "interruption_mode",
  "pre_tool_speech",
  "response_timeout_secs",
  "tool_call_sound",
  "tool_call_sound_behavior",
  "tool_error_handling_mode",
  "disable_interruptions",
  "force_pre_tool_speech",
  "response_body_schema",
  "api_schema_overrides",
  "tool_version",
]);

const KNOWN_TOOL_RECORD_FIELDS = new Set([
  "id",
  "tool_config",
  "response_mocks",
  "access_info",
  "usage_stats",
  "icons",
  "execution",
]);

const SOURCE_CLIENT_TOOL_BEHAVIOR = {
  execution_mode: "immediate",
  assignments: [] as never[],
  dynamic_variables: { dynamic_variable_placeholders: {} },
  interruption_mode: "allow",
  pre_tool_speech: "auto",
  response_timeout_secs: 30,
  tool_call_sound: null,
  tool_call_sound_behavior: "auto",
  tool_error_handling_mode: "auto",
} as const;

export interface ClientToolContract {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  expectsResponse: boolean;
  executionMode: string;
  assignmentCount: number;
  dynamicVariableCount: number;
  dynamicVariables: Record<string, unknown>;
  interruptionMode: string;
  preToolSpeech: string;
  responseTimeoutSeconds: number;
  toolCallSound: string | null;
  toolCallSoundBehavior: string;
  toolErrorHandlingMode: string;
  disableInterruptions: boolean;
  forcePreToolSpeech: boolean;
  responseBodySchema: unknown;
  apiSchemaOverrides: unknown;
  unknownConfigFields: string[];
}

export interface LinkedToolSnapshot {
  id: string;
  type: string;
  name: string;
  clientContract: ClientToolContract | null;
  responseMockCount: number;
  taskSupport: string;
  unknownToolFields: string[];
  unknownExecutionFields: string[];
}

export interface AgentConfigurationSnapshot {
  agentId: string;
  name: string;
  voiceId: string;
  ttsModelId: string;
  ttsConfig: Record<string, unknown>;
  authEnabled: boolean;
  allowlist: string[];
  toolIds: string[];
  builtInToolNames: string[];
  mcpServerIds: string[];
  nativeMcpServerIds: string[];
  workflowNodeCount: number;
  workflowEdgeCount: number;
  legacyClientTools: ClientToolContract[];
  legacyNonClientToolNames: string[];
  unknownCapabilityFields: string[];
}

function sourceClientToolConfig(tool: ClientToolSchema) {
  return {
    type: "client" as const,
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    expects_response: tool.expectsResponse,
    ...SOURCE_CLIENT_TOOL_BEHAVIOR,
  };
}

export function buildClientToolPayload(tool: ClientToolSchema) {
  return {
    tool_config: sourceClientToolConfig(tool),
    response_mocks: [] as never[],
  };
}

function exactSourceToolIds(toolIds: readonly string[]): string[] {
  if (toolIds.length !== TOOL_SCHEMAS.length) {
    throw new Error(
      `Expected ${TOOL_SCHEMAS.length} source tool ids, received ${toolIds.length}`,
    );
  }
  const uniqueIds = new Set(toolIds);
  if (uniqueIds.size !== toolIds.length || toolIds.some((id) => id.length === 0)) {
    throw new Error("Source tool ids must be unique non-empty strings");
  }
  return [...toolIds];
}

export function buildCreatePayload(
  systemPrompt: string,
  voiceId: string,
  toolIds: readonly string[],
) {
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
          tool_ids: exactSourceToolIds(toolIds),
          built_in_tools: {},
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
export function buildUpdatePayload(
  systemPrompt: string,
  toolIds: readonly string[],
) {
  return {
    conversation_config: {
      agent: {
        prompt: {
          prompt: systemPrompt,
          tool_ids: exactSourceToolIds(toolIds),
          built_in_tools: {},
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

function booleanAt(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${path} must be a boolean`);
  return value;
}

function nestedRecord(
  root: Record<string, unknown>,
  keys: string[],
): Record<string, unknown> {
  let current = root;
  const traversed: string[] = [];
  for (const key of keys) {
    traversed.push(key);
    current = recordAt(current[key], traversed.join("."));
  }
  return current;
}

function optionalStringArray(
  root: Record<string, unknown>,
  key: string,
  path: string,
): string[] {
  const value = root[key];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.map((entry, index) => stringAt(entry, `${path}[${index}]`));
}

function optionalConfiguredRecordKeys(
  root: Record<string, unknown>,
  key: string,
  path: string,
): string[] {
  const value = root[key];
  if (value === undefined || value === null) return [];
  // ElevenLabs serializes every supported built-in as a null placeholder.
  return Object.entries(recordAt(value, path))
    .filter(([, config]) => config !== null)
    .map(([name]) => name);
}

function optionalArrayLength(value: unknown, path: string): number {
  if (value === undefined || value === null) return 0;
  if (!Array.isArray(value)) throw new Error(`${path} must be an array`);
  return value.length;
}

function optionalString(
  value: unknown,
  path: string,
  fallback: string,
): string {
  return value === undefined || value === null
    ? fallback
    : stringAt(value, path);
}

function optionalNullableString(value: unknown, path: string): string | null {
  return value === undefined || value === null ? null : stringAt(value, path);
}

function optionalBoolean(
  value: unknown,
  path: string,
  fallback: boolean,
): boolean {
  return value === undefined || value === null
    ? fallback
    : booleanAt(value, path);
}

function optionalNumber(
  value: unknown,
  path: string,
  fallback: number,
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be a finite number`);
  }
  return value;
}

function readClientToolContract(
  config: Record<string, unknown>,
  path: string,
): ClientToolContract {
  const dynamicVariables = config.dynamic_variables;
  let dynamicVariableCount = 0;
  if (dynamicVariables !== undefined && dynamicVariables !== null) {
    const dynamic = recordAt(dynamicVariables, `${path}.dynamic_variables`);
    const placeholders = dynamic.dynamic_variable_placeholders;
    if (placeholders !== undefined && placeholders !== null) {
      dynamicVariableCount = Object.keys(
        recordAt(placeholders, `${path}.dynamic_variables.dynamic_variable_placeholders`),
      ).length;
    }
  }

  const normalizedDynamicVariables =
    dynamicVariables === undefined || dynamicVariables === null
      ? {}
      : Object.fromEntries(
          Object.entries(
            recordAt(dynamicVariables, `${path}.dynamic_variables`),
          ).filter(([key, value]) => {
            if (key !== "dynamic_variable_placeholders") return true;
            if (value === undefined || value === null) return false;
            return Object.keys(
              recordAt(
                value,
                `${path}.dynamic_variables.dynamic_variable_placeholders`,
              ),
            ).length > 0;
          }),
        );

  return {
    name: stringAt(config.name, `${path}.name`),
    description: stringAt(config.description, `${path}.description`),
    parameters: recordAt(config.parameters, `${path}.parameters`),
    expectsResponse: booleanAt(config.expects_response, `${path}.expects_response`),
    executionMode:
      config.execution_mode === undefined
        ? "immediate"
        : stringAt(config.execution_mode, `${path}.execution_mode`),
    assignmentCount: optionalArrayLength(config.assignments, `${path}.assignments`),
    dynamicVariableCount,
    dynamicVariables: normalizedDynamicVariables,
    interruptionMode: optionalString(
      config.interruption_mode,
      `${path}.interruption_mode`,
      SOURCE_CLIENT_TOOL_BEHAVIOR.interruption_mode,
    ),
    preToolSpeech: optionalString(
      config.pre_tool_speech,
      `${path}.pre_tool_speech`,
      SOURCE_CLIENT_TOOL_BEHAVIOR.pre_tool_speech,
    ),
    responseTimeoutSeconds: optionalNumber(
      config.response_timeout_secs,
      `${path}.response_timeout_secs`,
      SOURCE_CLIENT_TOOL_BEHAVIOR.response_timeout_secs,
    ),
    toolCallSound: optionalNullableString(
      config.tool_call_sound,
      `${path}.tool_call_sound`,
    ),
    toolCallSoundBehavior: optionalString(
      config.tool_call_sound_behavior,
      `${path}.tool_call_sound_behavior`,
      SOURCE_CLIENT_TOOL_BEHAVIOR.tool_call_sound_behavior,
    ),
    toolErrorHandlingMode: optionalString(
      config.tool_error_handling_mode,
      `${path}.tool_error_handling_mode`,
      SOURCE_CLIENT_TOOL_BEHAVIOR.tool_error_handling_mode,
    ),
    disableInterruptions: optionalBoolean(
      config.disable_interruptions,
      `${path}.disable_interruptions`,
      false,
    ),
    forcePreToolSpeech: optionalBoolean(
      config.force_pre_tool_speech,
      `${path}.force_pre_tool_speech`,
      false,
    ),
    responseBodySchema: config.response_body_schema ?? null,
    apiSchemaOverrides: config.api_schema_overrides ?? null,
    unknownConfigFields: Object.keys(config).filter(
      (key) => !KNOWN_CLIENT_TOOL_CONFIG_FIELDS.has(key),
    ),
  };
}

export function readLinkedTool(payload: unknown): LinkedToolSnapshot {
  const root = recordAt(payload, "tool");
  const config = recordAt(root.tool_config, "tool.tool_config");
  const type = stringAt(config.type, "tool.tool_config.type");
  const name = stringAt(config.name, "tool.tool_config.name");
  const executionValue = root.execution;
  let taskSupport = "forbidden";
  let unknownExecutionFields: string[] = [];
  if (executionValue !== undefined && executionValue !== null) {
    const execution = recordAt(executionValue, "tool.execution");
    if (
      execution.task_support !== undefined &&
      execution.taskSupport !== undefined
    ) {
      throw new Error("tool.execution must not define duplicate task support fields");
    }
    taskSupport = optionalString(
      execution.task_support ?? execution.taskSupport,
      "tool.execution.task_support",
      "forbidden",
    );
    unknownExecutionFields = Object.keys(execution).filter(
      (key) => key !== "task_support" && key !== "taskSupport",
    );
  }
  return {
    id: stringAt(root.id, "tool.id"),
    type,
    name,
    clientContract:
      type === "client" ? readClientToolContract(config, "tool.tool_config") : null,
    responseMockCount: optionalArrayLength(
      root.response_mocks,
      "tool.response_mocks",
    ),
    taskSupport,
    unknownToolFields: Object.keys(root).filter(
      (key) => !KNOWN_TOOL_RECORD_FIELDS.has(key),
    ),
    unknownExecutionFields,
  };
}

function readLegacyTools(prompt: Record<string, unknown>): {
  clientTools: ClientToolContract[];
  nonClientNames: string[];
} {
  const value = prompt.tools;
  if (value === undefined || value === null) {
    return { clientTools: [], nonClientNames: [] };
  }
  if (!Array.isArray(value)) {
    throw new Error("conversation_config.agent.prompt.tools must be an array");
  }

  const clientTools: ClientToolContract[] = [];
  const nonClientNames: string[] = [];
  value.forEach((entry, index) => {
    const path = `conversation_config.agent.prompt.tools[${index}]`;
    const tool = recordAt(entry, path);
    const type = stringAt(tool.type, `${path}.type`);
    if (type === "client") {
      clientTools.push(readClientToolContract(tool, path));
    } else {
      nonClientNames.push(stringAt(tool.name, `${path}.name`));
    }
  });
  return { clientTools, nonClientNames };
}

function workflowCounts(value: unknown, path: string): {
  nodes: number;
  edges: number;
  unknownFields: string[];
} {
  if (value === undefined || value === null) {
    return { nodes: 0, edges: 0, unknownFields: [] };
  }
  const workflow = recordAt(value, path);
  if (workflow.prevent_subagent_loops !== undefined) {
    booleanAt(
      workflow.prevent_subagent_loops,
      `${path}.prevent_subagent_loops`,
    );
  }
  const configuredNodeCount = (nodesValue: unknown): number => {
    if (nodesValue === undefined || nodesValue === null) return 0;
    const nodes = recordAt(nodesValue, `${path}.nodes`);
    return Object.entries(nodes).filter(([id, value]) => {
      if (id !== "start_node") return true;
      const node = recordAt(value, `${path}.nodes.start_node`);
      if (node.type !== "start") return true;
      if (!Array.isArray(node.edge_order) || node.edge_order.length > 0) return true;
      if (Object.keys(node).some((key) =>
        key !== "type" && key !== "edge_order" && key !== "position"
      )) return true;
      if (node.position === undefined || node.position === null) return false;
      const position = recordAt(node.position, `${path}.nodes.start_node.position`);
      return Object.entries(position).some(([key, coordinate]) =>
        (key !== "x" && key !== "y") ||
        typeof coordinate !== "number" ||
        !Number.isFinite(coordinate)
      );
    }).length;
  };
  const nodes = workflow.nodes === undefined || workflow.nodes === null
    ? 0
    : configuredNodeCount(workflow.nodes);
  const edges = workflow.edges === undefined || workflow.edges === null
    ? 0
    : Object.keys(recordAt(workflow.edges, `${path}.edges`)).length;
  return {
    nodes,
    edges,
    unknownFields: Object.keys(workflow)
      .filter(
        (key) =>
          key !== "nodes" &&
          key !== "edges" &&
          key !== "prevent_subagent_loops",
      )
      .map((key) => `${path}.${key}`),
  };
}

function unknownPromptCapabilityFields(prompt: Record<string, unknown>): string[] {
  return Object.keys(prompt).filter((key) => !KNOWN_PROMPT_FIELDS.has(key));
}

function nestedCapabilityFields(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      nestedCapabilityFields(entry, `${path}[${index}]`),
    );
  }
  if (!isRecord(value)) return [];

  const results: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (PARSED_CAPABILITY_SUBTREES.has(currentPath)) continue;
    const normalized = key.toLowerCase();
    if (
      CAPABILITY_FIELD_NAMES.has(key) ||
      normalized.includes("tool") ||
      normalized.includes("mcp")
    ) {
      results.push(currentPath);
      continue;
    }
    results.push(...nestedCapabilityFields(entry, currentPath));
  }
  return results;
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
  const allowlist = auth.allowlist.map((entry, index) => {
    if (typeof entry === "string") return entry;
    const item = recordAt(entry, `platform_settings.auth.allowlist[${index}]`);
    return stringAt(
      item.hostname,
      `platform_settings.auth.allowlist[${index}].hostname`,
    );
  });
  const legacy = readLegacyTools(prompt);
  const rootWorkflow = workflowCounts(root.workflow, "workflow");
  const conversationWorkflow = workflowCounts(
    conversation.workflow,
    "conversation_config.workflow",
  );

  return {
    agentId: stringAt(root.agent_id, "agent_id"),
    name: stringAt(root.name, "name"),
    voiceId: stringAt(tts.voice_id, "conversation_config.tts.voice_id"),
    ttsModelId: stringAt(tts.model_id, "conversation_config.tts.model_id"),
    ttsConfig: tts,
    authEnabled: booleanAt(
      auth.enable_auth,
      "platform_settings.auth.enable_auth",
    ),
    allowlist,
    toolIds: optionalStringArray(
      prompt,
      "tool_ids",
      "conversation_config.agent.prompt.tool_ids",
    ),
    builtInToolNames: optionalConfiguredRecordKeys(
      prompt,
      "built_in_tools",
      "conversation_config.agent.prompt.built_in_tools",
    ),
    mcpServerIds: optionalStringArray(
      prompt,
      "mcp_server_ids",
      "conversation_config.agent.prompt.mcp_server_ids",
    ),
    nativeMcpServerIds: optionalStringArray(
      prompt,
      "native_mcp_server_ids",
      "conversation_config.agent.prompt.native_mcp_server_ids",
    ),
    workflowNodeCount: rootWorkflow.nodes + conversationWorkflow.nodes,
    workflowEdgeCount: rootWorkflow.edges + conversationWorkflow.edges,
    legacyClientTools: legacy.clientTools,
    legacyNonClientToolNames: legacy.nonClientNames,
    unknownCapabilityFields: [...new Set([
      ...unknownPromptCapabilityFields(prompt),
      ...rootWorkflow.unknownFields,
      ...conversationWorkflow.unknownFields,
      ...nestedCapabilityFields(root),
    ])],
  };
}

function canonicalize(value: unknown, key = ""): unknown {
  if (Array.isArray(value)) {
    const values = value.map((entry) => canonicalize(entry));
    return key === "required" && values.every((entry) => typeof entry === "string")
      ? [...values].sort()
      : values;
  }
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter((entryKey) => {
        if (entryKey !== "required") return true;
        const required = value[entryKey];
        return !Array.isArray(required) || required.length > 0;
      })
      .sort()
      .map((entryKey) => [entryKey, canonicalize(value[entryKey], entryKey)]),
  );
}

function sourceContract(tool: ClientToolSchema): ClientToolContract {
  return {
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
    expectsResponse: tool.expectsResponse,
    executionMode: "immediate",
    assignmentCount: 0,
    dynamicVariableCount: 0,
    dynamicVariables: {},
    interruptionMode: SOURCE_CLIENT_TOOL_BEHAVIOR.interruption_mode,
    preToolSpeech: SOURCE_CLIENT_TOOL_BEHAVIOR.pre_tool_speech,
    responseTimeoutSeconds: SOURCE_CLIENT_TOOL_BEHAVIOR.response_timeout_secs,
    toolCallSound: SOURCE_CLIENT_TOOL_BEHAVIOR.tool_call_sound,
    toolCallSoundBehavior: SOURCE_CLIENT_TOOL_BEHAVIOR.tool_call_sound_behavior,
    toolErrorHandlingMode: SOURCE_CLIENT_TOOL_BEHAVIOR.tool_error_handling_mode,
    disableInterruptions: false,
    forcePreToolSpeech: false,
    responseBodySchema: null,
    apiSchemaOverrides: null,
    unknownConfigFields: [],
  };
}

function contractFingerprint(contract: ClientToolContract): string {
  return JSON.stringify(canonicalize(contract));
}

export function clientToolMatchesSource(
  tool: LinkedToolSnapshot,
  source: ClientToolSchema,
): boolean {
  return (
    tool.type === "client" &&
    tool.clientContract !== null &&
    tool.responseMockCount === 0 &&
    tool.taskSupport === "forbidden" &&
    tool.unknownToolFields.length === 0 &&
    tool.unknownExecutionFields.length === 0 &&
    contractFingerprint(tool.clientContract) === contractFingerprint(sourceContract(source))
  );
}

export function findReusableClientToolId(
  source: ClientToolSchema,
  tools: readonly LinkedToolSnapshot[],
): string | undefined {
  return tools.find((tool) => clientToolMatchesSource(tool, source))?.id;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function assertSourceToolContracts(
  tools: readonly LinkedToolSnapshot[],
  label: string,
): void {
  if (tools.length !== TOOL_SCHEMAS.length) {
    throw new Error(
      `${label} count does not match source (expected ${TOOL_SCHEMAS.length}; received ${tools.length})`,
    );
  }
  const actualNames = sorted(tools.map((tool) => tool.name));
  const expectedNames = sorted(TOOL_NAMES);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `${label} names do not match source (expected ${expectedNames.join(", ")}; received ${actualNames.join(", ")})`,
    );
  }
  TOOL_SCHEMAS.forEach((source) => {
    const matches = tools.filter((tool) => tool.name === source.name);
    if (matches.length !== 1 || !clientToolMatchesSource(matches[0], source)) {
      throw new Error(`${label} contract for ${source.name} does not match source`);
    }
  });
}

function assertLegacyToolContracts(
  contracts: readonly ClientToolContract[],
): void {
  if (contracts.length === 0) return;
  const tools: LinkedToolSnapshot[] = contracts.map((contract, index) => ({
    id: `legacy-${index}`,
    type: "client",
    name: contract.name,
    clientContract: contract,
    responseMockCount: 0,
    taskSupport: "forbidden",
    unknownToolFields: [],
    unknownExecutionFields: [],
  }));
  assertSourceToolContracts(tools, "Agent legacy client tools");
}

export function assertAgentCanBeNarrowlyUpdated(
  snapshot: AgentConfigurationSnapshot,
): void {
  const prohibited: Array<[string, readonly unknown[] | number]> = [
    ["built-in tools", snapshot.builtInToolNames],
    ["MCP servers", snapshot.mcpServerIds],
    ["native MCP servers", snapshot.nativeMcpServerIds],
    ["workflow nodes", snapshot.workflowNodeCount],
    ["workflow edges", snapshot.workflowEdgeCount],
    ["legacy non-client tools", snapshot.legacyNonClientToolNames],
    ["unknown capability fields", snapshot.unknownCapabilityFields],
  ];
  for (const [label, value] of prohibited) {
    const count = typeof value === "number" ? value : value.length;
    if (count > 0) {
      throw new Error(
        `Agent has ${count} ${label}; remove them explicitly before the narrow source update`,
      );
    }
  }
  assertLegacyToolContracts(snapshot.legacyClientTools);
}

export function assertLiveAgentConfiguration(
  snapshot: AgentConfigurationSnapshot,
  expectedAgentId: string,
  linkedTools: readonly LinkedToolSnapshot[],
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
  assertAgentCanBeNarrowlyUpdated(snapshot);

  const uniqueToolIds = new Set(snapshot.toolIds);
  if (uniqueToolIds.size !== snapshot.toolIds.length) {
    throw new Error("Agent tool_ids must not contain duplicates");
  }
  const linkedToolIds = linkedTools.map((tool) => tool.id);
  if (JSON.stringify(sorted(snapshot.toolIds)) !== JSON.stringify(sorted(linkedToolIds))) {
    throw new Error("Resolved linked tools do not match the agent tool_ids inventory");
  }
  assertSourceToolContracts(linkedTools, "Agent linked client tools");
  assertLegacyToolContracts(snapshot.legacyClientTools);
}

export function assertPreservedAgentUpdate(
  before: AgentConfigurationSnapshot,
  after: AgentConfigurationSnapshot,
  expectedAgentId: string,
  linkedTools: readonly LinkedToolSnapshot[],
): void {
  assertLiveAgentConfiguration(after, expectedAgentId, linkedTools);

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
  if (
    JSON.stringify(canonicalize(before.ttsConfig)) !==
    JSON.stringify(canonicalize(after.ttsConfig))
  ) {
    throw new Error("Agent TTS configuration changed during narrow update");
  }
}
