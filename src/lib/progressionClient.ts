export interface ProgressionResponse {
  chords: string[];
  key: string;
  rationale: string;
}

export class ProgressionResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressionResponseError";
  }
}

const DEV_ENDPOINT = "http://localhost:8787/api/progression";
const PROD_ENDPOINT = "/api/progression";
const DEV_HEALTH_ENDPOINT = "http://localhost:8787/api/health";
const PROD_HEALTH_ENDPOINT = "/api/health";

export interface HealthResponse {
  ok: boolean;
  provider: "openai";
  bindings: { openaiApiKey: boolean };
}

export const PROGRESSION_REQUEST_TIMEOUT_MS = 30_000;

export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  const endpoint = import.meta.env.DEV ? DEV_HEALTH_ENDPOINT : PROD_HEALTH_ENDPOINT;
  const res = await fetch(endpoint, { method: "GET", signal });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  const payload = (await res.json()) as Partial<HealthResponse>;
  if (
    typeof payload?.ok !== "boolean" ||
    payload.provider !== "openai" ||
    typeof payload.bindings?.openaiApiKey !== "boolean"
  ) {
    throw new Error("Health response malformed");
  }
  return {
    ok: payload.ok,
    provider: payload.provider,
    bindings: { openaiApiKey: payload.bindings.openaiApiKey },
  };
}

export async function generateProgression(
  prompt: string,
  signal?: AbortSignal,
): Promise<ProgressionResponse> {
  const endpoint = import.meta.env.DEV ? DEV_ENDPOINT : PROD_ENDPOINT;
  const timeoutSignal = AbortSignal.timeout(PROGRESSION_REQUEST_TIMEOUT_MS);
  const requestSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: requestSignal,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" ||
        (error.name === "AbortError" && !signal?.aborted))
    ) {
      throw new ProgressionResponseError(
        "Progression request timed out. Please try again.",
      );
    }
    throw error;
  }

  if (!res.ok) {
    throw new Error(await formatError(res));
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    throw new ProgressionResponseError("Server returned invalid JSON");
  }

  return assertProgressionResponse(payload);
}

function assertProgressionResponse(payload: unknown): ProgressionResponse {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ProgressionResponseError("Server response was not an object");
  }
  const obj = payload as Record<string, unknown>;

  if (!Array.isArray(obj.chords)) {
    throw new ProgressionResponseError("Response 'chords' must be an array");
  }
  if (obj.chords.length < 3 || obj.chords.length > 8) {
    throw new ProgressionResponseError(
      `Response 'chords' must contain between 3 and 8 entries, received ${obj.chords.length}`,
    );
  }
  const chords: string[] = [];
  for (const entry of obj.chords) {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new ProgressionResponseError("Every chord must be a non-empty string");
    }
    chords.push(entry.trim());
  }

  if (typeof obj.key !== "string" || obj.key.trim().length === 0) {
    throw new ProgressionResponseError("Response 'key' must be a non-empty string");
  }
  if (typeof obj.rationale !== "string" || obj.rationale.trim().length === 0) {
    throw new ProgressionResponseError("Response 'rationale' must be a non-empty string");
  }

  return {
    chords,
    key: obj.key.trim(),
    rationale: obj.rationale.trim(),
  };
}

async function formatError(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (parsed && typeof parsed.error === "string") {
      return `${res.status}: ${parsed.error}`;
    }
  } catch {
    // fall through
  }
  return `${res.status}: ${raw || res.statusText}`;
}
