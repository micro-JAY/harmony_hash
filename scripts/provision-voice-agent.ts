/**
 * Provisions (creates or updates) the Harmony Hash progression-builder voice
 * agent on ElevenLabs, via the REST API.
 *
 * Run it once to create the agent, then re-run it any time you edit
 * agent/system-prompt.md or src/voice/toolSchemas.ts:
 *
 *   ELEVENLABS_API_KEY=sk_...                        \
 *   [HH_VOICE_AGENT_ID=agent_...]  [HH_VOICE_ID=...] \
 *   npx tsx scripts/provision-voice-agent.ts
 *
 * Without HH_VOICE_AGENT_ID it creates a new agent and prints its id — set
 * that as HH_VOICE_AGENT_ID (server env) and pass it to <VoiceAgentProvider
 * agentId=.../> on the client. With HH_VOICE_AGENT_ID it updates in place.
 *
 * REST + snake_case is used deliberately: it matches the documented agent
 * schema exactly and avoids SDK-version casing differences on a large payload.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TOOL_SCHEMAS, type ClientToolSchema } from "../src/voice/toolSchemas";
import { sanitizeProviderDetail } from "../src/lib/sanitizeProviderDetail";
import {
  DEFAULT_VOICE_ID,
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

const AGENTS_API = "https://api.elevenlabs.io/v1/convai/agents";
const TOOLS_API = "https://api.elevenlabs.io/v1/convai/tools";

type ApiCall = (
  url: string,
  method: "GET" | "POST" | "PATCH",
  operation: string,
  body?: unknown,
) => Promise<Record<string, unknown>>;

export interface ProvisionVoiceAgentOptions {
  apiKey: string;
  systemPrompt: string;
  existingAgentId?: string;
  voiceId?: string;
  verifyOnly?: boolean;
  fetchImpl: typeof fetch;
  log: (message: string) => void;
}

export interface ProvisionVoiceAgentResult {
  action: "created" | "updated" | "verified";
  agentId: string;
}

function createApiCall(apiKey: string, fetchImpl: typeof fetch): ApiCall {
  return async (url, method, operation, body) => {
    const res = await fetchImpl(url, {
      method,
      headers: { "xi-api-key": apiKey, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(
        `${operation} failed with ${res.status}: ${sanitizeProviderDetail(text)}`,
      );
    }
    if (!text) return {};
    try {
      const parsed: unknown = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("response was not an object");
      }
      return parsed as Record<string, unknown>;
    } catch {
      throw new Error(`${operation} returned invalid JSON`);
    }
  };
}

async function readLinkedTools(
  call: ApiCall,
  toolIds: readonly string[],
): Promise<LinkedToolSnapshot[]> {
  return Promise.all(
    toolIds.map(async (toolId) =>
      readLinkedTool(
        await call(
          `${TOOLS_API}/${encodeURIComponent(toolId)}`,
          "GET",
          "Read linked client tool",
        ),
      ),
    ),
  );
}

async function createSourceClientTool(
  call: ApiCall,
  source: ClientToolSchema,
): Promise<LinkedToolSnapshot> {
  const created = readLinkedTool(
    await call(
      TOOLS_API,
      "POST",
      `Create source client tool ${source.name}`,
      buildClientToolPayload(source),
    ),
  );
  if (!clientToolMatchesSource(created, source)) {
    throw new Error(`Created client tool ${source.name} does not match source`);
  }
  const readBack = readLinkedTool(
    await call(
      `${TOOLS_API}/${encodeURIComponent(created.id)}`,
      "GET",
      `Verify source client tool ${source.name}`,
    ),
  );
  if (!clientToolMatchesSource(readBack, source)) {
    throw new Error(`Verified client tool ${source.name} does not match source`);
  }
  return readBack;
}

async function reconcileSourceToolIds(
  call: ApiCall,
  linkedTools: readonly LinkedToolSnapshot[],
): Promise<string[]> {
  const result: string[] = [];
  for (const source of TOOL_SCHEMAS) {
    const reusableId = findReusableClientToolId(source, linkedTools);
    result.push(reusableId ?? (await createSourceClientTool(call, source)).id);
  }
  return result;
}

async function loadAgentState(call: ApiCall, agentId: string): Promise<{
  snapshot: AgentConfigurationSnapshot;
  linkedTools: LinkedToolSnapshot[];
}> {
  const snapshot = readAgentConfiguration(
    await call(
      `${AGENTS_API}/${encodeURIComponent(agentId)}`,
      "GET",
      "Read agent configuration",
    ),
  );
  const linkedTools = await readLinkedTools(call, snapshot.toolIds);
  return { snapshot, linkedTools };
}

function printSafeVerification(
  log: (message: string) => void,
  label: string,
  snapshot: AgentConfigurationSnapshot,
  linkedTools: readonly LinkedToolSnapshot[],
): void {
  log(label);
  log(JSON.stringify({
    agentId: snapshot.agentId,
    name: snapshot.name,
    voiceId: snapshot.voiceId,
    ttsModelId: snapshot.ttsModelId,
    signedAuth: snapshot.authEnabled,
    allowlistEntries: snapshot.allowlist.length,
    linkedClientTools: linkedTools.map((tool) => tool.name).sort(),
    linkedToolCount: linkedTools.length,
    legacyClientMirrorCount: snapshot.legacyClientTools.length,
    builtInToolCount: snapshot.builtInToolNames.length,
    mcpServerCount: snapshot.mcpServerIds.length,
    nativeMcpServerCount: snapshot.nativeMcpServerIds.length,
    workflowNodeCount: snapshot.workflowNodeCount,
    workflowEdgeCount: snapshot.workflowEdgeCount,
    unknownCapabilityFieldCount: snapshot.unknownCapabilityFields.length,
  }, null, 2));
}

export async function provisionVoiceAgent(
  options: ProvisionVoiceAgentOptions,
): Promise<ProvisionVoiceAgentResult> {
  if (options.apiKey.length === 0) {
    throw new Error("ELEVENLABS_API_KEY is not set");
  }
  const call = createApiCall(options.apiKey, options.fetchImpl);
  const existingId = options.existingAgentId;
  const verifyOnly = options.verifyOnly ?? false;

  if (existingId) {
    const beforeState = await loadAgentState(call, existingId);
    if (verifyOnly) {
      assertLiveAgentConfiguration(
        beforeState.snapshot,
        existingId,
        beforeState.linkedTools,
      );
      printSafeVerification(
        options.log,
        "Verified existing agent",
        beforeState.snapshot,
        beforeState.linkedTools,
      );
      return { action: "verified", agentId: existingId };
    }

    // Tool IDs can be replaced atomically by the agent PATCH. Other capability
    // surfaces have provider-specific removal semantics, so refuse to mutate a
    // broader agent until an operator removes them explicitly.
    assertAgentCanBeNarrowlyUpdated(beforeState.snapshot);
    const toolIds = await reconcileSourceToolIds(call, beforeState.linkedTools);
    await call(
      `${AGENTS_API}/${encodeURIComponent(existingId)}`,
      "PATCH",
      "Update agent configuration",
      buildUpdatePayload(options.systemPrompt, toolIds),
    );
    const afterState = await loadAgentState(call, existingId);
    assertPreservedAgentUpdate(
      beforeState.snapshot,
      afterState.snapshot,
      existingId,
      afterState.linkedTools,
    );
    printSafeVerification(
      options.log,
      "Updated and verified existing agent",
      afterState.snapshot,
      afterState.linkedTools,
    );
    return { action: "updated", agentId: existingId };
  }

  if (verifyOnly) {
    throw new Error("HH_VOICE_AGENT_ID is required with --verify");
  }

  const toolIds = await reconcileSourceToolIds(call, []);
  const created = await call(
    `${AGENTS_API}/create?enable_versioning=true`,
    "POST",
    "Create agent",
    buildCreatePayload(
      options.systemPrompt,
      options.voiceId ?? DEFAULT_VOICE_ID,
      toolIds,
    ),
  );
  if (typeof created.agent_id !== "string" || created.agent_id.length === 0) {
    throw new Error("ElevenLabs create response did not include an agent_id");
  }
  const state = await loadAgentState(call, created.agent_id);
  assertLiveAgentConfiguration(state.snapshot, created.agent_id, state.linkedTools);
  printSafeVerification(
    options.log,
    `Created agent. Set HH_VOICE_AGENT_ID=${created.agent_id}`,
    state.snapshot,
    state.linkedTools,
  );
  return { action: "created", agentId: created.agent_id };
}

async function runCli(): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
  const here = dirname(fileURLToPath(import.meta.url));
  const systemPrompt = readFileSync(
    resolve(here, "../agent/system-prompt.md"),
    "utf8",
  );
  await provisionVoiceAgent({
    apiKey,
    systemPrompt,
    existingAgentId: process.env.HH_VOICE_AGENT_ID,
    voiceId: process.env.HH_VOICE_ID,
    verifyOnly: process.argv.includes("--verify"),
    fetchImpl: fetch,
    log: console.log,
  });
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (entryPath === fileURLToPath(import.meta.url)) {
  runCli().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : "Voice agent provisioning failed");
    process.exitCode = 1;
  });
}
