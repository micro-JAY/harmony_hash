import {
  createHanzRealtimeSession,
  HANZ_CLIENT_SECRET_TTL_SECONDS,
  HANZ_MAX_SESSION_MS,
} from "../voice/realtimeSessionConfig";

const CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets";

export type RealtimeClientSecretResult =
  | {
      ok: true;
      clientSecret: string;
      expiresAt: number;
      serverNow: number;
      sessionEndsAt: number;
    }
  | { ok: false; reason: "timeout" | "upstream"; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsExpectedValue(actual: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((value, index) => containsExpectedValue(actual[index], value));
  }
  if (isRecord(expected)) {
    return isRecord(actual) && Object.entries(expected).every(
      ([key, value]) => Object.hasOwn(actual, key) && containsExpectedValue(actual[key], value),
    );
  }
  return Object.is(actual, expected);
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
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: HANZ_CLIENT_SECRET_TTL_SECONDS,
        },
        session,
      }),
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

  const serverNow = Math.floor(Date.now() / 1_000);
  if (
    !isRecord(payload) ||
    typeof payload.value !== "string" ||
    payload.value.length === 0 ||
    payload.value.length > 4_096 ||
    /\s/.test(payload.value) ||
    typeof payload.expires_at !== "number" ||
    !Number.isInteger(payload.expires_at) ||
    payload.expires_at <= serverNow ||
    payload.expires_at > serverNow + HANZ_CLIENT_SECRET_TTL_SECONDS ||
    !isRecord(payload.session) ||
    payload.session.object !== "realtime.session" ||
    !containsExpectedValue(payload.session, session)
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
    serverNow,
    sessionEndsAt: serverNow + HANZ_MAX_SESSION_MS / 1_000,
  };
}
