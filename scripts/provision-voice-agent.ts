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
import { TOOL_SCHEMAS } from "../src/voice/toolSchemas";

const API = "https://api.elevenlabs.io/v1/convai/agents";
const here = dirname(fileURLToPath(import.meta.url));

const apiKey = process.env.ELEVENLABS_API_KEY;
if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not set");

const systemPrompt = readFileSync(resolve(here, "../agent/system-prompt.md"), "utf8");

const body = {
  name: "Harmony Hash — Progression Companion",
  conversation_config: {
    agent: {
      first_message:
        "Hey, I'm your harmony companion. Want to build a progression together, or should I break down what's already on your timeline?",
      language: "en",
      prompt: {
        prompt: systemPrompt,
        // gemini-2.5-flash keeps voice latency low. For richer theory
        // explanations at a small latency cost, switch to claude-sonnet-4-6.
        llm: "gemini-2.5-flash",
        temperature: 0.4,
        tools: TOOL_SCHEMAS.map((tool) => ({
          type: "client",
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          expects_response: tool.expectsResponse,
        })),
        // No built_in_tools: the panel's explicit "End conversation" button and
        // max_duration_seconds cap the session; the agent-initiated end_call
        // system tool needs a name/params sub-schema we don't depend on here.
      },
    },
    tts: {
      // George by default — warm, conversational. Override with HH_VOICE_ID.
      voice_id: process.env.HH_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb",
      // English agents must use a turbo or flash *v2* model (the _v2_5 variants
      // are multilingual and rejected for language:"en"). flash_v2 keeps ~75ms latency.
      model_id: "eleven_flash_v2",
      stability: 0.4, // a little expressive for a friendly teacher
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
    // Signed-URL auth ONLY. Per ElevenLabs guidance, enable_auth (signed URLs) and
    // a hostname allowlist are ALTERNATIVE auth modes — do not configure both. We
    // use signed URLs (the recommended client-side default): the browser connects
    // via the Worker's POST /api/voice/signed-url route (src/lib/elevenLabsAuth.ts).
    // No allowlist key → a fresh create is pure signed-URL auth. (PATCH merges and
    // the API rejects allowlist:null, so an agent created earlier WITH an allowlist
    // keeps it until recreated — harmless when every served origin is allowlisted.)
    auth: { enable_auth: true },
  },
};

async function call(url: string, method: "POST" | "PATCH"): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method,
    headers: { "xi-api-key": apiKey as string, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}: ${text}`);
  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function main(): Promise<void> {
  const existingId = process.env.HH_VOICE_AGENT_ID;

  if (existingId) {
    await call(`${API}/${existingId}`, "PATCH");
    console.log(`Updated agent ${existingId}`);
    return;
  }

  const created = await call(`${API}/create?enable_versioning=true`, "POST");
  const id = created.agent_id ?? "(see response below)";
  console.log(`Created agent. Set HH_VOICE_AGENT_ID=${id}`);
  console.log(JSON.stringify(created, null, 2));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
