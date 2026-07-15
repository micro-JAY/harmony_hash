import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import worker, { type Env } from "./index";

const openaiMock = vi.hoisted(() => ({
  create: vi.fn(),
  configurations: [] as Array<Record<string, unknown>>,
}));

vi.mock("openai", () => ({
  default: class MockOpenAI {
    static APIConnectionTimeoutError = class APIConnectionTimeoutError extends Error {};
    static APIUserAbortError = class APIUserAbortError extends Error {};

    responses = { create: openaiMock.create };

    constructor(configuration: Record<string, unknown>) {
      openaiMock.configurations.push(configuration);
    }
  },
}));

function env(overrides: Partial<Env> = {}): Env {
  return {
    OPENAI_API_KEY: "sk-worker-test-key",
    PROGRESSION_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: true }),
    },
    VOICE_RATE_LIMITER: {
      limit: vi.fn().mockResolvedValue({ success: true }),
    },
    ASSETS: {
      fetch: async () => new Response("asset fallback", { status: 200 }),
    },
    ...overrides,
  };
}

function progressionRequest(
  prompt = "warm soul progression",
  origin?: string,
): Request {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.set("CF-Connecting-IP", "203.0.113.10");
  if (origin) headers.set("Origin", origin);
  return new Request("https://harmony.tonari.ai/api/progression", {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt }),
  });
}

function toolTurn() {
  return {
    output: [
      {
        type: "function_call",
        call_id: "call_1",
        name: "lookup_chord",
        arguments: JSON.stringify({ chord_name: "Cmaj7" }),
        status: "completed",
      },
    ],
    output_text: "",
    status: "completed",
  };
}

function finalTurn() {
  return {
    output: [],
    output_text: JSON.stringify({
      chords: ["Cmaj7", "Am7", "Dm7", "G7"],
      key: "C major",
      rationale: "A warm diatonic turnaround.",
    }),
    status: "completed",
  };
}

beforeEach(() => {
  openaiMock.create.mockReset();
  openaiMock.configurations.length = 0;
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Worker health and routing", () => {
  it("reports OpenAI binding readiness without exposing the key", async () => {
    const response = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/health"),
      env(),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      provider: "openai",
      bindings: { openaiApiKey: true },
    });
    expect(await worker.fetch(
      new Request("https://harmony.tonari.ai/api/health"),
      env({ OPENAI_API_KEY: undefined }),
    ).then((result) => result.json())).toEqual({
      ok: false,
      provider: "openai",
      bindings: { openaiApiKey: false },
    });
  });

  it("falls through non-API routes to static assets", async () => {
    const response = await worker.fetch(
      new Request("https://harmony.tonari.ai/library"),
      env(),
    );
    expect(await response.text()).toBe("asset fallback");
  });

  it("advertises GET on health preflight", async () => {
    const response = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/health", {
        method: "OPTIONS",
        headers: { Origin: "https://harmony.tonari.ai" },
      }),
      env(),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, OPTIONS",
    );
  });
});

describe("POST /api/progression", () => {
  it("returns a validated progression through the Responses tool loop", async () => {
    openaiMock.create
      .mockResolvedValueOnce(toolTurn())
      .mockResolvedValueOnce(finalTurn());

    const response = await worker.fetch(progressionRequest(), env());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      chords: ["Cmaj7", "Am7", "Dm7", "G7"],
      key: "C major",
      rationale: "A warm diatonic turnaround.",
    });
    expect(openaiMock.configurations[0]).toMatchObject({
      apiKey: "sk-worker-test-key",
      maxRetries: 1,
      timeout: 30_000,
    });
    expect(openaiMock.create).toHaveBeenCalledTimes(2);
  });

  it("validates JSON, prompt bounds, methods, and OpenAI configuration", async () => {
    const malformed = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/progression", {
        method: "POST",
        headers: { "CF-Connecting-IP": "203.0.113.10" },
        body: "not json",
      }),
      env(),
    );
    expect(malformed.status).toBe(400);

    const tooLong = await worker.fetch(progressionRequest("x".repeat(501)), env());
    expect(tooLong.status).toBe(400);

    const missingKey = await worker.fetch(
      progressionRequest(),
      env({ OPENAI_API_KEY: undefined }),
    );
    expect(missingKey.status).toBe(500);
    expect(await missingKey.text()).not.toContain("ANTHROPIC");

    const method = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/progression"),
      env(),
    );
    expect(method.status).toBe(405);
  });

  it("rejects disallowed origins while allowing the production origin", async () => {
    const denied = await worker.fetch(
      progressionRequest("test", "https://attacker.example"),
      env(),
    );
    expect(denied.status).toBe(403);
    expect(openaiMock.create).not.toHaveBeenCalled();

    openaiMock.create
      .mockResolvedValueOnce(toolTurn())
      .mockResolvedValueOnce(finalTurn());
    const allowed = await worker.fetch(
      progressionRequest("test", "https://harmony.tonari.ai"),
      env(),
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://harmony.tonari.ai",
    );
  });

  it("rate limits on a hashed edge caller key before calling OpenAI", async () => {
    const limit = vi.fn().mockResolvedValue({ success: false });
    const response = await worker.fetch(
      progressionRequest(),
      env({ PROGRESSION_RATE_LIMITER: { limit } }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(openaiMock.create).not.toHaveBeenCalled();
    expect(limit).toHaveBeenCalledTimes(1);
    const key = limit.mock.calls[0]?.[0].key;
    expect(key).toMatch(/^progression:[a-f0-9]{64}$/);
    expect(key).not.toContain("203.0.113.10");
  });

  it("fails closed when rate-limit infrastructure or edge identity is missing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const missingBinding = await worker.fetch(
      progressionRequest(),
      env({ PROGRESSION_RATE_LIMITER: undefined }),
    );
    expect(missingBinding.status).toBe(503);

    const missingIdentity = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/progression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "test" }),
      }),
      env(),
    );
    expect(missingIdentity.status).toBe(503);
    expect(openaiMock.create).not.toHaveBeenCalled();
  });

  it("rejects declared and streamed oversized JSON bodies before parsing or OpenAI", async () => {
    const declared = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/progression", {
        method: "POST",
        headers: {
          "CF-Connecting-IP": "203.0.113.10",
          "Content-Length": "4097",
          "Content-Type": "application/json",
        },
        body: "{}",
      }),
      env(),
    );
    expect(declared.status).toBe(413);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(3_000));
        controller.enqueue(new Uint8Array(3_000));
        controller.close();
      },
    });
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      headers: {
        "CF-Connecting-IP": "203.0.113.10",
        "Content-Type": "application/json",
      },
      body: stream,
      duplex: "half",
    };
    const streamed = await worker.fetch(
      new Request("https://harmony.tonari.ai/api/progression", init),
      env(),
    );
    expect(streamed.status).toBe(413);
    expect(openaiMock.create).not.toHaveBeenCalled();
  });

  it("maps SDK timeouts and deadline aborts to 504", async () => {
    openaiMock.create.mockRejectedValueOnce(
      new OpenAI.APIConnectionTimeoutError(),
    );
    const sdkTimeout = await worker.fetch(progressionRequest(), env());
    expect(sdkTimeout.status).toBe(504);

    openaiMock.create.mockRejectedValueOnce(new OpenAI.APIUserAbortError());
    const deadlineAbort = await worker.fetch(progressionRequest(), env());
    expect(deadlineAbort.status).toBe(504);
  });

  it("returns generic upstream failures and redacts secrets from logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    openaiMock.create.mockRejectedValueOnce(
      new Error("upstream rejected sk-never-leak-this-key"),
    );

    const response = await worker.fetch(progressionRequest(), env());
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(body).toContain("temporarily unavailable");
    expect(body).not.toContain("sk-never-leak-this-key");
    expect(log).toHaveBeenCalledWith(
      "[harmony-progression] OpenAI:",
      "upstream rejected [redacted]",
    );
  });

  it("maps resolved provider failures to sanitized 502 responses", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    openaiMock.create.mockResolvedValueOnce({
      output: [],
      output_text: "",
      status: "failed",
      error: {
        code: "server_error",
        message: "failed with sk-provider-secret",
      },
    });

    const response = await worker.fetch(progressionRequest(), env());

    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("sk-provider-secret");
    expect(log).toHaveBeenCalledWith(
      "[harmony-progression] OpenAI response:",
      "OpenAI response failed: server_error: failed with [redacted]",
    );
  });

  it("logs sanitized validation detail while retaining the validation contract", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    openaiMock.create.mockResolvedValueOnce({
      output: [],
      output_text: "not-json-sk-validation-secret",
      status: "completed",
    });

    const response = await worker.fetch(progressionRequest(), env());
    const body = await response.text();

    expect(response.status).toBe(500);
    expect(body).toContain("Final assistant text was not valid JSON");
    expect(body).not.toContain("sk-validation-secret");
    expect(log).toHaveBeenCalledWith(
      "[harmony-progression] validation:",
      "Final assistant text was not valid JSON",
    );
  });
});

function voiceRequest(origin: string | null = "https://harmony.tonari.ai"): Request {
  const headers = new Headers({ "CF-Connecting-IP": "203.0.113.10" });
  if (origin) headers.set("Origin", origin);
  return new Request("https://harmony.tonari.ai/api/voice/signed-url", {
    method: "POST",
    headers,
  });
}

describe("POST /api/voice/signed-url", () => {
  it("fails closed when either server binding is missing", async () => {
    const missingKey = await worker.fetch(
      voiceRequest(),
      env({ HH_VOICE_AGENT_ID: "agent_test" }),
    );
    expect(missingKey.status).toBe(500);
    expect(await missingKey.text()).toContain("voice companion is unavailable");

    const missingAgent = await worker.fetch(
      voiceRequest(),
      env({ ELEVENLABS_API_KEY: "xi-test-key" }),
    );
    expect(missingAgent.status).toBe(500);
  });

  it("rejects a disallowed browser origin before calling ElevenLabs", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      voiceRequest("https://attacker.example"),
      env({
        ELEVENLABS_API_KEY: "xi-test-key",
        HH_VOICE_AGENT_ID: "agent_test",
      }),
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires an allowed Origin and admits the voice route independently", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);
    const voiceLimit = vi.fn().mockResolvedValue({ success: false });
    const progressionLimit = vi.fn().mockResolvedValue({ success: true });

    const missingOrigin = await worker.fetch(
      voiceRequest(null),
      env({
        ELEVENLABS_API_KEY: "xi-test-key",
        HH_VOICE_AGENT_ID: "agent_test",
        VOICE_RATE_LIMITER: { limit: voiceLimit },
      }),
    );
    expect(missingOrigin.status).toBe(403);
    expect(voiceLimit).not.toHaveBeenCalled();

    const rateLimited = await worker.fetch(
      voiceRequest(),
      env({
        ELEVENLABS_API_KEY: "xi-test-key",
        HH_VOICE_AGENT_ID: "agent_test",
        PROGRESSION_RATE_LIMITER: { limit: progressionLimit },
        VOICE_RATE_LIMITER: { limit: voiceLimit },
      }),
    );
    expect(rateLimited.status).toBe(429);
    expect(rateLimited.headers.get("Retry-After")).toBe("60");
    expect(voiceLimit).toHaveBeenCalledTimes(1);
    expect(progressionLimit).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("mints a signed URL and returns only the browser-safe field", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      Response.json({ signed_url: "wss://api.elevenlabs.io/session/signed" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await worker.fetch(
      voiceRequest(),
      env({
        ELEVENLABS_API_KEY: "xi-test-key",
        HH_VOICE_AGENT_ID: "agent_test",
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      signedUrl: "wss://api.elevenlabs.io/session/signed",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a generic 502 and sanitizes upstream detail in logs", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(
        "rejected sk_eleven_secret_123456 Bearer opaque.voice.token " +
          "wss://voice.example/session?conversation_signature=signed-secret " +
          "xi-api-key: opaque-header",
        { status: 401 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await worker.fetch(
      voiceRequest(),
      env({
        ELEVENLABS_API_KEY: "xi-test-key",
        HH_VOICE_AGENT_ID: "agent_test",
      }),
    );
    const body = await response.text();

    expect(response.status).toBe(502);
    expect(body).toContain("Could not start a voice session");
    expect(body).not.toContain("sk_eleven_secret_123456");
    expect(log).toHaveBeenCalledWith(
      "[harmony-voice] signed-url:",
      "ElevenLabs get-signed-url returned 401: rejected [redacted] " +
        "Bearer [redacted] " +
        "[signed-url redacted] xi-api-key: [redacted]",
    );
  });
});
