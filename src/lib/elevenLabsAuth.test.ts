import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSignedUrl } from "./elevenLabsAuth";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fetchSignedUrl", () => {
  it("returns a signed WebSocket URL without exposing the API key", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ signed_url: "wss://api.elevenlabs.io/session/test" }),
    );

    await expect(fetchSignedUrl("xi-test-key", "agent/a b")).resolves.toEqual({
      ok: true,
      signedUrl: "wss://api.elevenlabs.io/session/test",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=agent%2Fa%20b",
      { headers: { "xi-api-key": "xi-test-key" } },
    );
  });

  it("reports upstream rejection status and bounded detail", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("agent authentication is disabled", { status: 401 }),
    );

    await expect(fetchSignedUrl("xi-test-key", "agent_test")).resolves.toEqual({
      ok: false,
      error: "ElevenLabs get-signed-url returned 401: agent authentication is disabled",
    });
  });

  it("reports network errors without producing a success shape", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network unavailable"));

    await expect(fetchSignedUrl("xi-test-key", "agent_test")).resolves.toEqual({
      ok: false,
      error: "network unavailable",
    });
  });

  it("rejects invalid JSON and missing signed_url fields", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("not json", { status: 200 }))
      .mockResolvedValueOnce(Response.json({ signed_url: "" }));

    await expect(fetchSignedUrl("xi-test-key", "agent_test")).resolves.toEqual({
      ok: false,
      error: "ElevenLabs returned a non-JSON response",
    });
    await expect(fetchSignedUrl("xi-test-key", "agent_test")).resolves.toEqual({
      ok: false,
      error: "ElevenLabs response did not include a signed_url",
    });
  });
});
