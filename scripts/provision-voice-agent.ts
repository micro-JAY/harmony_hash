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
import {
  DEFAULT_VOICE_ID,
  assertLiveAgentConfiguration,
  assertPreservedAgentUpdate,
  buildCreatePayload,
  buildUpdatePayload,
  readAgentConfiguration,
  type AgentConfigurationSnapshot,
} from "./voice-agent-config";

const API = "https://api.elevenlabs.io/v1/convai/agents";
const here = dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

const systemPrompt = readFileSync(resolve(here, "../agent/system-prompt.md"), "utf8");

async function call(
  url: string,
  method: "GET" | "POST" | "PATCH",
  body?: unknown,
): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: { "xi-api-key": apiKey, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

function printSafeVerification(
  label: string,
  snapshot: AgentConfigurationSnapshot,
): void {
  console.log(label);
  console.log(JSON.stringify({
    agentId: snapshot.agentId,
    name: snapshot.name,
    voiceId: snapshot.voiceId,
    ttsModelId: snapshot.ttsModelId,
    signedAuth: snapshot.authEnabled,
    allowlistEntries: snapshot.allowlist.length,
    clientTools: snapshot.clientToolNames,
  }, null, 2));
}

async function main(): Promise<void> {
  const existingId = process.env.HH_VOICE_AGENT_ID;
  const verifyOnly = process.argv.includes("--verify");

  if (existingId) {
    const before = readAgentConfiguration(await call(`${API}/${existingId}`, "GET"));
    if (verifyOnly) {
      assertLiveAgentConfiguration(before, existingId);
      printSafeVerification("Verified existing agent", before);
      return;
    }

    await call(`${API}/${existingId}`, "PATCH", buildUpdatePayload(systemPrompt));
    const after = readAgentConfiguration(await call(`${API}/${existingId}`, "GET"));
    assertPreservedAgentUpdate(before, after, existingId);
    printSafeVerification("Updated and verified existing agent", after);
    return;
  }

  if (verifyOnly) {
    throw new Error("HH_VOICE_AGENT_ID is required with --verify");
  }

  const created = await call(
    `${API}/create?enable_versioning=true`,
    "POST",
    buildCreatePayload(systemPrompt, process.env.HH_VOICE_ID ?? DEFAULT_VOICE_ID),
  );
  if (typeof created.agent_id !== "string" || created.agent_id.length === 0) {
    throw new Error("ElevenLabs create response did not include an agent_id");
  }
  const snapshot = readAgentConfiguration(await call(`${API}/${created.agent_id}`, "GET"));
  assertLiveAgentConfiguration(snapshot, created.agent_id);
  printSafeVerification(`Created agent. Set HH_VOICE_AGENT_ID=${created.agent_id}`, snapshot);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
