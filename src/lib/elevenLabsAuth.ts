/**
 * Mint a short-lived ElevenLabs signed URL so the browser can open an
 * authenticated conversation without ever seeing the API key.
 *
 * Endpoint verified against the ElevenLabs API docs (via context7):
 *   GET https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=<id>
 *   header: xi-api-key: <key>
 *   200 -> { "signed_url": "wss://..." }
 *
 * Raw fetch, no SDK. The caller (the Worker) reads `apiKey`/`agentId` from its
 * env and passes them in — this helper never touches env itself, matching the
 * repo's "Worker imports pure logic from src/lib/" pattern. It returns a
 * discriminated result so the route can surface upstream failures as a 5xx
 * rather than swallowing them into a success shape.
 */

const SIGNED_URL_ENDPOINT =
  "https://api.elevenlabs.io/v1/convai/conversation/get-signed-url";

export type SignedUrlOutcome =
  | { ok: true; signedUrl: string }
  | { ok: false; error: string };

export async function fetchSignedUrl(
  apiKey: string,
  agentId: string,
): Promise<SignedUrlOutcome> {
  const endpoint = `${SIGNED_URL_ENDPOINT}?agent_id=${encodeURIComponent(agentId)}`;

  let res: Response;
  try {
    res = await fetch(endpoint, { headers: { "xi-api-key": apiKey } });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reach ElevenLabs" };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return {
      ok: false,
      error: `ElevenLabs get-signed-url returned ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    };
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: "ElevenLabs returned a non-JSON response" };
  }

  const signedUrl = (data as { signed_url?: unknown }).signed_url;
  if (typeof signedUrl !== "string" || signedUrl.length === 0) {
    return { ok: false, error: "ElevenLabs response did not include a signed_url" };
  }
  return { ok: true, signedUrl };
}
