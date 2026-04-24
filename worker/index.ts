import Anthropic from "@anthropic-ai/sdk";
import { lookupChordForAgent } from "../src/lib/chordLookup";

interface Env {
  ANTHROPIC_API_KEY: string;
  ALLOWED_ORIGIN?: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

interface ProgressionResult {
  chords: string[];
  key: string;
  rationale: string;
}

const MODEL = "claude-opus-4-7";
const MAX_ITERATIONS = 8;
const MAX_PROMPT_LENGTH = 500;
const MAX_TOKENS = 1024;

const SYSTEM_PROMPT = `Always respond with ONLY a valid JSON object in this exact shape:
{
  "chords": ["Cmaj7", "Am7", "Dm7", "G7"],
  "key": "C major",
  "rationale": "One sentence explaining why these chords fit the request."
}

Rules:
- "chords" must contain exactly 4 chord names as strings.
- Each chord name must be a root note (A through G, optionally with # or b) followed by an optional quality suffix from this list: m, dim, aug, sus2, sus4, 6, m6, 7, maj7, m7, 9, 11, dim7, m7b5, aug7, add9, madd9, maj9, m9, 7sus4, 13.
- Use # for sharps and b for flats. Never use ♯ or ♭.
- Never use slash chords (no "/" in any chord name).
- Never use parentheses in chord names.
- Do not include any text before or after the JSON.
- Output must be valid parseable JSON.
- Before including any chord in your final progression, call the lookup_chord tool to verify it exists in the dictionary. If a chord is not found, substitute the closest valid alternative suggested by the tool.`;

const LOOKUP_CHORD_TOOL: Anthropic.Tool = {
  name: "lookup_chord",
  description:
    "Verifies that a chord name exists in the harmony_hash chord dictionary. Call this before including any chord in your final progression. Returns whether the chord is valid and, if not, suggests the closest valid alternative.",
  input_schema: {
    type: "object",
    properties: {
      chord_name: {
        type: "string",
        description: "The chord name to verify, e.g. 'Cmaj7', 'Am9', 'F#dim'.",
      },
    },
    required: ["chord_name"],
  },
};

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

    return env.ASSETS.fetch(request);
  },
};

async function handleProgression(request: Request, env: Env): Promise<Response> {
  const requestOrigin = request.headers.get("Origin");
  if (requestOrigin && !isOriginPermitted(requestOrigin, env)) {
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

  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(
      { error: "Server misconfigured: missing API key" },
      500,
      request,
      env,
    );
  }

  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  try {
    const result = await runAgent(prompt.value, anthropic);
    return jsonResponse(result, 200, request, env);
  } catch (err) {
    if (err instanceof AgentNonConvergenceError) {
      return jsonResponse({ error: "Agent did not converge" }, 504, request, env);
    }
    if (err instanceof AgentValidationError) {
      return jsonResponse({ error: err.message }, 500, request, env);
    }
    const message = err instanceof Error ? err.message : "Unknown agent error";
    return jsonResponse({ error: sanitizeError(message) }, 500, request, env);
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

class AgentNonConvergenceError extends Error {
  constructor() {
    super("Agent did not converge within iteration limit");
    this.name = "AgentNonConvergenceError";
  }
}

class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

async function runAgent(userPrompt: string, anthropic: Anthropic): Promise<ProgressionResult> {
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: [LOOKUP_CHORD_TOOL],
      messages,
    });

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find(
        (block): block is Anthropic.TextBlock => block.type === "text",
      );
      if (!textBlock) {
        throw new AgentValidationError("Final response contained no text block");
      }
      return parseAndValidateProgression(textBlock.text);
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = response.content
        .filter(
          (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
        )
        .map((block) => {
          const input = block.input as { chord_name?: unknown };
          const chordName = typeof input?.chord_name === "string" ? input.chord_name : "";
          const lookup = lookupChordForAgent(chordName);
          return {
            type: "tool_result",
            tool_use_id: block.id,
            content: JSON.stringify(lookup),
          };
        });

      if (toolResults.length === 0) {
        throw new AgentValidationError(
          "Stop reason was tool_use but no tool_use blocks found in response",
        );
      }

      messages.push({ role: "user", content: toolResults });
      continue;
    }

    throw new AgentValidationError(`Unexpected stop_reason: ${response.stop_reason}`);
  }

  throw new AgentNonConvergenceError();
}

function parseAndValidateProgression(raw: string): ProgressionResult {
  const text = raw.trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AgentValidationError("Final assistant text was not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AgentValidationError("Final JSON must be an object");
  }

  const obj = parsed as Record<string, unknown>;

  if (!Array.isArray(obj.chords)) {
    throw new AgentValidationError("'chords' field must be an array");
  }
  if (obj.chords.length !== 4) {
    throw new AgentValidationError(
      `'chords' must contain exactly 4 entries, received ${obj.chords.length}`,
    );
  }
  const chords: string[] = [];
  for (const entry of obj.chords) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new AgentValidationError("Every chord must be a non-empty string");
    }
    chords.push(entry.trim());
  }

  if (typeof obj.key !== "string" || obj.key.trim().length === 0) {
    throw new AgentValidationError("'key' must be a non-empty string");
  }
  if (typeof obj.rationale !== "string" || obj.rationale.trim().length === 0) {
    throw new AgentValidationError("'rationale' must be a non-empty string");
  }

  return {
    chords,
    key: obj.key.trim(),
    rationale: obj.rationale.trim(),
  };
}

function sanitizeError(message: string): string {
  return message.replace(/sk-[a-zA-Z0-9_\-]+/g, "[redacted]");
}

const DEV_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function parseAllowlist(env: Env): string[] | null {
  const configured = env.ALLOWED_ORIGIN?.trim();
  if (!configured) return null;
  return configured
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isOriginPermitted(origin: string, env: Env): boolean {
  const allowlist = parseAllowlist(env);
  if (allowlist) {
    return allowlist.includes("*") || allowlist.includes(origin);
  }
  // Dev fallback when ALLOWED_ORIGIN is unset: only permit localhost origins.
  return DEV_ORIGIN_PATTERN.test(origin);
}

function resolveCorsOrigin(request: Request, env: Env): string | null {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  if (!isOriginPermitted(origin, env)) return null;
  const allowlist = parseAllowlist(env);
  if (allowlist?.includes("*") && !allowlist.includes(origin)) return "*";
  return origin;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  if (origin && !isOriginPermitted(origin, env)) {
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
