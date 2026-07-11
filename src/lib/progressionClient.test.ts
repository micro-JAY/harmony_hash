import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PROGRESSION_REQUEST_TIMEOUT_MS,
  ProgressionResponseError,
  checkHealth,
  generateProgression,
} from "./progressionClient";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("checkHealth", () => {
  it("accepts the OpenAI health contract", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ok: true,
        provider: "openai",
        bindings: { openaiApiKey: true },
      }),
    );

    await expect(checkHealth()).resolves.toEqual({
      ok: true,
      provider: "openai",
      bindings: { openaiApiKey: true },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8787/api/health",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("rejects stale provider and malformed binding shapes", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({
        ok: true,
        provider: "anthropic",
        bindings: { anthropicApiKey: true },
      }),
    );
    await expect(checkHealth()).rejects.toThrow("Health response malformed");

    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    await expect(checkHealth()).rejects.toThrow("Health check failed: 503");
  });
});

describe("generateProgression", () => {
  it("accepts and trims 3- and 8-chord response boundaries", async () => {
    fetchMock
      .mockResolvedValueOnce(
        Response.json({
          chords: [" Cmaj7 ", "Am7", "G7"],
          key: " C major ",
          rationale: " Compact cadence. ",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          chords: ["C", "G", "Am", "F", "Dm", "Em", "G7", "Cmaj7"],
          key: "C major",
          rationale: "Long form.",
        }),
      );

    await expect(generateProgression("warm cadence")).resolves.toEqual({
      chords: ["Cmaj7", "Am7", "G7"],
      key: "C major",
      rationale: "Compact cadence.",
    });
    await expect(generateProgression("long form")).resolves.toMatchObject({
      chords: expect.arrayContaining(["C", "Cmaj7"]),
    });
  });

  it("rejects malformed JSON, shapes, counts, and server error bodies", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{", { status: 200 }));
    await expect(generateProgression("test")).rejects.toThrow(
      "Server returned invalid JSON",
    );

    fetchMock.mockResolvedValueOnce(
      Response.json({ chords: ["C", "G"], key: "C", rationale: "short" }),
    );
    await expect(generateProgression("test")).rejects.toThrow(
      "between 3 and 8",
    );

    fetchMock.mockResolvedValueOnce(
      Response.json({ error: "Progression service is temporarily unavailable" }, { status: 502 }),
    );
    await expect(generateProgression("test")).rejects.toThrow(
      "502: Progression service is temporarily unavailable",
    );
  });

  it("attaches the 30-second deadline and maps timeout failures clearly", async () => {
    const timeout = new Error("deadline");
    timeout.name = "TimeoutError";
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    fetchMock.mockRejectedValueOnce(timeout);

    await expect(generateProgression("test")).rejects.toEqual(
      new ProgressionResponseError(
        "Progression request timed out. Please try again.",
      ),
    );
    expect(timeoutSpy).toHaveBeenCalledWith(PROGRESSION_REQUEST_TIMEOUT_MS);
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("preserves an explicit caller abort instead of labelling it a timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = new Error("caller aborted");
    aborted.name = "AbortError";
    fetchMock.mockRejectedValueOnce(aborted);

    await expect(
      generateProgression("test", controller.signal),
    ).rejects.toBe(aborted);
  });
});
