export interface ProgressionResponse {
  chords: string[];
  key: string;
  rationale: string;
}

const DEV_ENDPOINT = "http://localhost:8787/api/progression";
const PROD_ENDPOINT = "/api/progression";

export async function generateProgression(prompt: string): Promise<ProgressionResponse> {
  const endpoint = import.meta.env.DEV ? DEV_ENDPOINT : PROD_ENDPOINT;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    throw new Error(await formatError(res));
  }

  return (await res.json()) as ProgressionResponse;
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
