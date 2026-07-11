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
