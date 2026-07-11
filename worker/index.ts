import OpenAI from "openai";
import { fetchSignedUrl } from "../src/lib/elevenLabsAuth";
import {
  AgentNonConvergenceError,
  AgentProviderResponseError,
  AgentValidationError,
  MAX_PROMPT_LENGTH,
  runProgressionAgent,
  type OpenAIResponsesClient,
} from "./progressionAgent";

export interface Env {
  OPENAI_API_KEY?: string;
  ALLOWED_ORIGIN?: string;
  // Voice companion. The API key is a Worker secret (.dev.vars / wrangler secret);
  // the agent id is non-secret (wrangler.jsonc vars). Both optional so a
  // misconfigured env fails closed with a 500 rather than a type error.
  ELEVENLABS_API_KEY?: string;
  HH_VOICE_AGENT_ID?: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const PROVIDER_TIMEOUT_MS = 30_000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/progression") {
      if (request.method === "OPTIONS") {
        return corsPreflight(request, env);
      }
      if (request.method === "POST") {
        return handleProgression(request, env);
      }
      return jsonResponse({ error: "Method not allowed" }, 405, request, env);
    }

    if (url.pathname === "/api/health") {
      if (request.method === "OPTIONS") {
        return corsPreflight(request, env);
      }
      if (request.method === "GET") {
        return handleHealth(request, env);
      }
      return jsonResponse({ error: "Method not allowed" }, 405, request, env);
    }

    if (url.pathname === "/api/voice/signed-url") {
      if (request.method === "OPTIONS") {
        return corsPreflight(request, env);
      }
      if (request.method === "POST") {
        return handleVoiceSignedUrl(request, env);
      }
      return jsonResponse({ error: "Method not allowed" }, 405, request, env);
    }

    return env.ASSETS.fetch(request);
  },
};

function handleHealth(request: Request, env: Env): Response {
  const openaiApiKey = Boolean(env.OPENAI_API_KEY);
  return jsonResponse(
    { ok: openaiApiKey, provider: "openai", bindings: { openaiApiKey } },
    200,
    request,
    env,
  );
}

// Mint a short-lived ElevenLabs signed URL so the browser can open an
// authenticated voice session without ever seeing the API key. Mirrors the
// /api/progression handler's origin gate and error contract.
async function handleVoiceSignedUrl(request: Request, env: Env): Promise<Response> {
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && !isOriginPermitted(requestOrigin, request, env)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, request, env);
  }

  if (!env.ELEVENLABS_API_KEY || !env.HH_VOICE_AGENT_ID) {
    return jsonResponse(
      { error: "Server misconfigured: voice companion is unavailable" },
      500,
      request,
      env,
    );
  }

  const outcome = await fetchSignedUrl(env.ELEVENLABS_API_KEY, env.HH_VOICE_AGENT_ID);
  if (!outcome.ok) {
    // Log the upstream detail server-side; never leak ElevenLabs internals or
    // the key to the client. A failed mint is a 5xx, not a success shape.
    console.error("[harmony-voice] signed-url:", sanitizeError(outcome.error));
    return jsonResponse({ error: "Could not start a voice session" }, 502, request, env);
  }

  return jsonResponse({ signedUrl: outcome.signedUrl }, 200, request, env);
}

async function handleProgression(request: Request, env: Env): Promise<Response> {
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && !isOriginPermitted(requestOrigin, request, env)) {
    return jsonResponse({ error: "Origin not allowed" }, 403, request, env);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON" }, 400, request, env);
  }

  const prompt = extractPrompt(body);
  if (!prompt.ok) {
    return jsonResponse({ error: prompt.error }, 400, request, env);
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      { error: "Server misconfigured: missing API key" },
      500,
      request,
      env,
    );
  }

  const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    maxRetries: 1,
    timeout: PROVIDER_TIMEOUT_MS,
  });
  const responses: OpenAIResponsesClient = {
    create: (body, options) => openai.responses.create(body, options),
  };

  try {
    const result = await runProgressionAgent(
      prompt.value,
      responses,
      AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    );
    return jsonResponse(result, 200, request, env);
  } catch (err) {
    if (err instanceof AgentNonConvergenceError) {
      return jsonResponse({ error: "Agent did not converge" }, 504, request, env);
    }
    if (err instanceof AgentValidationError) {
      const message = sanitizeError(err.message);
      console.error("[harmony-progression] validation:", message);
      return jsonResponse({ error: message }, 500, request, env);
    }
    if (err instanceof AgentProviderResponseError) {
      console.error(
        "[harmony-progression] OpenAI response:",
        sanitizeError(err.message),
      );
      return jsonResponse(
        { error: "Progression service is temporarily unavailable" },
        502,
        request,
        env,
      );
    }
    if (isTimeoutError(err)) {
      return jsonResponse({ error: "Progression request timed out" }, 504, request, env);
    }
    const message = err instanceof Error ? err.message : "Unknown agent error";
    console.error("[harmony-progression] OpenAI:", sanitizeError(message));
    return jsonResponse(
      { error: "Progression service is temporarily unavailable" },
      502,
      request,
      env,
    );
  }
}

type PromptResult = { ok: true; value: string } | { ok: false; error: string };

function extractPrompt(body: unknown): PromptResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object with a 'prompt' string" };
  }
  const prompt = (body as { prompt?: unknown }).prompt;
  if (typeof prompt !== "string") {
    return { ok: false, error: "Request body must contain a 'prompt' string" };
  }
  const trimmed = prompt.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Prompt must not be empty" };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: `Prompt must be ${MAX_PROMPT_LENGTH} characters or fewer` };
  }
  return { ok: true, value: trimmed };
}

function sanitizeError(message: string): string {
  return message.replace(/sk-[a-zA-Z0-9_-]+/g, "[redacted]");
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof OpenAI.APIConnectionTimeoutError ||
    error instanceof OpenAI.APIUserAbortError ||
    (error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError"))
  );
}

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

// The canonical production origin lives in source so a missing/stale/shadowed
// ALLOWED_ORIGIN secret can't 403 production. ALLOWED_ORIGIN remains supported
// as an additive list (comma-separated, or "*") for staging or one-off origins.
const BUILTIN_ALLOWED_ORIGINS: readonly string[] = ["https://harmony.tonari.ai"];

function parseEnvAllowlist(env: Env): string[] {
  const configured = env.ALLOWED_ORIGIN?.trim();
  if (!configured) return [];
  return configured
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function workerIsLocal(request: Request): boolean {
  try {
    return LOCAL_HOST_PATTERN.test(new URL(request.url).host);
  } catch {
    return false;
  }
}

function isOriginPermitted(origin: string, request: Request, env: Env): boolean {
  if (BUILTIN_ALLOWED_ORIGINS.includes(origin)) return true;
  const envList = parseEnvAllowlist(env);
  if (envList.includes("*") || envList.includes(origin)) return true;
  // Only honor the localhost CORS fallback when the Worker itself is running
  // locally (under `wrangler dev`). Otherwise a deployed Worker would accept
  // browser requests from any localhost page, and CORS is the only gate on
  // this provider-backed endpoint.
  return workerIsLocal(request) && DEV_ORIGIN_PATTERN.test(origin);
}

function resolveCorsOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (!isOriginPermitted(origin, request, env)) return null;
  const envList = parseEnvAllowlist(env);
  if (envList.includes("*") && !envList.includes(origin)) return "*";
  return origin;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const origin = resolveCorsOrigin(request, env);
  if (origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function corsPreflight(request: Request, env: Env): Response {
  const origin = request.headers.get("Origin");
  if (origin && !isOriginPermitted(origin, request, env)) {
    return new Response(null, { status: 403 });
  }
  return new Response(null, { status: 204, headers: corsHeaders(request, env) });
}

function jsonResponse(
  body: unknown,
  status: number,
  request: Request,
  env: Env,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(request, env),
    },
  });
}
