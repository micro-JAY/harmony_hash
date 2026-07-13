import { describe, expect, it } from "vitest";
import { TOOL_SCHEMAS } from "../src/voice/toolSchemas";
import { buildClientToolPayload } from "./voice-agent-config";
import {
  provisionVoiceAgent,
  type ProvisionVoiceAgentOptions,
} from "./provision-voice-agent";

const AGENT_ID = "agent_test";
const AGENTS_API = "https://api.elevenlabs.io/v1/convai/agents";
const TOOLS_API = "https://api.elevenlabs.io/v1/convai/tools";
const TOOL_IDS = TOOL_SCHEMAS.map((tool) => `tool_${tool.name}`);

interface RecordedRequest {
  url: string;
  method: string;
  body: unknown;
}

function sourceAt(index: number) {
  const source = TOOL_SCHEMAS[index];
  if (!source) throw new Error(`Missing source tool at index ${index}`);
  return source;
}

function toolIdAt(index: number): string {
  const toolId = TOOL_IDS[index];
  if (!toolId) throw new Error(`Missing tool id at index ${index}`);
  return toolId;
}

function toolRecord(index: number, id = toolIdAt(index)) {
  return {
    id,
    ...buildClientToolPayload(sourceAt(index)),
  };
}

function agentPayload(options: {
  toolIds?: string[];
  builtInTools?: Record<string, unknown>;
  tts?: Record<string, unknown>;
} = {}) {
  return {
    agent_id: AGENT_ID,
    name: "Hanz Hasher",
    conversation_config: {
      agent: {
        prompt: {
          tool_ids: options.toolIds ?? [...TOOL_IDS],
          built_in_tools: options.builtInTools ?? {},
          tools: TOOL_SCHEMAS.map((tool) =>
            buildClientToolPayload(tool).tool_config
          ),
        },
      },
      tts: {
        voice_id: "voice_custom",
        model_id: "eleven_v3_conversational",
        stability: 0.4,
        speed: 1,
        ...options.tts,
      },
    },
    platform_settings: {
      auth: { enable_auth: true, allowlist: [] },
    },
  };
}

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function createMockFetch(
  handler: (request: RecordedRequest) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; requests: RecordedRequest[] } {
  const requests: RecordedRequest[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const method = init?.method ?? "GET";
    const body: unknown =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    const request = { url, method, body };
    requests.push(request);
    return handler(request);
  };
  return { fetchImpl, requests };
}

function toolIndexFromUrl(url: string, ids = TOOL_IDS): number {
  if (!url.startsWith(`${TOOLS_API}/`)) return -1;
  const id = decodeURIComponent(url.slice(`${TOOLS_API}/`.length));
  return ids.indexOf(id);
}

function provisionOptions(
  fetchImpl: typeof fetch,
  overrides: Partial<ProvisionVoiceAgentOptions> = {},
): ProvisionVoiceAgentOptions {
  return {
    apiKey: "test-api-key",
    systemPrompt: "Ground every answer in the current progression.",
    existingAgentId: AGENT_ID,
    fetchImpl,
    log: () => undefined,
    ...overrides,
  };
}

describe("voice agent provisioning orchestration", () => {
  it("keeps verify-only provisioning read-only", async () => {
    const { fetchImpl, requests } = createMockFetch((request) => {
      if (request.method !== "GET") {
        throw new Error(`Unexpected write: ${request.method} ${request.url}`);
      }
      if (request.url === `${AGENTS_API}/${AGENT_ID}`) {
        return jsonResponse(agentPayload());
      }
      const index = toolIndexFromUrl(request.url);
      if (index >= 0) return jsonResponse(toolRecord(index));
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    await expect(
      provisionVoiceAgent(provisionOptions(fetchImpl, { verifyOnly: true })),
    ).resolves.toEqual({ action: "verified", agentId: AGENT_ID });
    expect(requests).toHaveLength(1 + TOOL_SCHEMAS.length);
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });

  it("performs no writes when a preserved capability blocks the update", async () => {
    const { fetchImpl, requests } = createMockFetch((request) => {
      if (request.method !== "GET") {
        throw new Error(`Unexpected write: ${request.method} ${request.url}`);
      }
      if (request.url === `${AGENTS_API}/${AGENT_ID}`) {
        return jsonResponse(agentPayload({
          builtInTools: { transfer_to_number: {} },
        }));
      }
      const index = toolIndexFromUrl(request.url);
      if (index >= 0) return jsonResponse(toolRecord(index));
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    await expect(
      provisionVoiceAgent(provisionOptions(fetchImpl)),
    ).rejects.toThrow("built-in tools");
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });

  it("GET-verifies a created tool before attaching it to the agent", async () => {
    const missingIndex = TOOL_SCHEMAS.length - 1;
    const existingIds = TOOL_IDS.slice(0, missingIndex);
    const createdId = "tool_created_highlight";
    const allIds = [...existingIds, createdId];
    let patched = false;

    const { fetchImpl, requests } = createMockFetch((request) => {
      if (request.url === `${AGENTS_API}/${AGENT_ID}` && request.method === "GET") {
        return jsonResponse(agentPayload({
          toolIds: patched ? allIds : existingIds,
          builtInTools: {
            end_call: null,
            language_detection: null,
            run_subagent: null,
          },
        }));
      }
      if (request.url === TOOLS_API && request.method === "POST") {
        expect(request.body).toEqual(buildClientToolPayload(sourceAt(missingIndex)));
        return jsonResponse(toolRecord(missingIndex, createdId));
      }
      if (request.url === `${AGENTS_API}/${AGENT_ID}` && request.method === "PATCH") {
        patched = true;
        expect(request.body).toMatchObject({
          conversation_config: {
            agent: { prompt: { tool_ids: allIds } },
          },
        });
        return jsonResponse({});
      }
      if (request.method === "GET" && request.url.startsWith(`${TOOLS_API}/`)) {
        const id = decodeURIComponent(request.url.slice(`${TOOLS_API}/`.length));
        if (id === createdId) return jsonResponse(toolRecord(missingIndex, createdId));
        const index = TOOL_IDS.indexOf(id);
        if (index >= 0) return jsonResponse(toolRecord(index));
      }
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    await expect(
      provisionVoiceAgent(provisionOptions(fetchImpl)),
    ).resolves.toEqual({ action: "updated", agentId: AGENT_ID });

    const createIndex = requests.findIndex(
      (request) => request.method === "POST" && request.url === TOOLS_API,
    );
    const persistedReadIndex = requests.findIndex(
      (request, index) =>
        index > createIndex &&
        request.method === "GET" &&
        request.url === `${TOOLS_API}/${createdId}`,
    );
    const patchIndex = requests.findIndex(
      (request) => request.method === "PATCH" && request.url === `${AGENTS_API}/${AGENT_ID}`,
    );
    expect(createIndex).toBeGreaterThanOrEqual(0);
    expect(persistedReadIndex).toBeGreaterThan(createIndex);
    expect(patchIndex).toBeGreaterThan(persistedReadIndex);
  });

  it("rejects when post-update readback no longer preserves TTS", async () => {
    let patched = false;
    const logs: string[] = [];
    const { fetchImpl, requests } = createMockFetch((request) => {
      if (request.url === `${AGENTS_API}/${AGENT_ID}` && request.method === "GET") {
        return jsonResponse(agentPayload({
          tts: patched ? { stability: 0.2 } : undefined,
        }));
      }
      if (request.url === `${AGENTS_API}/${AGENT_ID}` && request.method === "PATCH") {
        patched = true;
        return jsonResponse({});
      }
      const index = toolIndexFromUrl(request.url);
      if (request.method === "GET" && index >= 0) {
        return jsonResponse(toolRecord(index));
      }
      throw new Error(`Unexpected request: ${request.method} ${request.url}`);
    });

    await expect(
      provisionVoiceAgent(provisionOptions(fetchImpl, {
        log: (message) => logs.push(message),
      })),
    ).rejects.toThrow("TTS configuration changed");
    expect(requests.some((request) => request.method === "PATCH")).toBe(true);
    expect(logs).not.toContain("Updated and verified existing agent");
  });
});
