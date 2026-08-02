import { createHanzRealtimeSession } from "../voice/realtimeSessionConfig";

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

export type RealtimeClientSecretResult =
  | { ok: true; clientSecret: string; expiresAt: number; sessionEndsAt: number }
  | { ok: false; reason: "timeout" | "upstream"; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function fetchRealtimeClientSecret(
  apiKey: string,
  signal: AbortSignal,
): Promise<RealtimeClientSecretResult> {
  const session = createHanzRealtimeSession();
  let response: Response;
  try {
    response = await fetch(CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ session }),
      signal,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Failed to reach OpenAI";
    const reason = signal.aborted || (error instanceof Error && error.name === "TimeoutError")
      ? "timeout"
      : "upstream";
    return { ok: false, reason, error: detail };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      reason: "upstream",
      error: `OpenAI client-secret endpoint returned ${response.status} with non-JSON content`,
    };
  }

  if (!response.ok) {
    const providerMessage = isRecord(payload) && isRecord(payload.error) &&
        typeof payload.error.message === "string"
      ? `: ${payload.error.message.slice(0, 200)}`
      : "";
    return {
      ok: false,
      reason: "upstream",
      error: `OpenAI client-secret endpoint returned ${response.status}${providerMessage}`,
    };
  }

  if (
    !isRecord(payload) ||
    typeof payload.value !== "string" ||
    payload.value.length === 0 ||
    typeof payload.expires_at !== "number" ||
    !Number.isInteger(payload.expires_at) ||
    payload.expires_at <= Math.floor(Date.now() / 1_000) ||
    !isRecord(payload.session) ||
    typeof payload.session.expires_at !== "number" ||
    !Number.isInteger(payload.session.expires_at) ||
    payload.session.expires_at <= Math.floor(Date.now() / 1_000) ||
    payload.session.expires_at > session.expires_at
  ) {
    return {
      ok: false,
      reason: "upstream",
      error: "OpenAI client-secret response was missing a valid value or expiry",
    };
  }

  return {
    ok: true,
    clientSecret: payload.value,
    expiresAt: payload.expires_at,
    sessionEndsAt: payload.session.expires_at,
  };
}
