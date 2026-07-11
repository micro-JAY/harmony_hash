import type {
  FunctionTool,
  ResponseCreateParamsNonStreaming,
  ResponseInput,
  ResponseOutputItem,
} from "openai/resources/responses/responses";
import { lookupChordForAgent } from "../src/lib/chordLookup";

export interface ProgressionResult {
  chords: string[];
  key: string;
  rationale: string;
}

export interface OpenAIResponseTurn {
  output: ResponseOutputItem[];
  output_text: string;
  status?: string;
  error?: { code: string; message: string } | null;
  incomplete_details?: { reason?: string } | null;
}

export interface OpenAIResponsesClient {
  create(
    body: ResponseCreateParamsNonStreaming,
    options?: { signal?: AbortSignal },
  ): Promise<OpenAIResponseTurn>;
}

export const OPENAI_MODEL = "gpt-5.4-mini-2026-03-17";
export const MAX_ITERATIONS = 8;
export const MAX_PROMPT_LENGTH = 500;
export const MIN_CHORDS = 3;
export const MAX_CHORDS = 8;

const MAX_OUTPUT_TOKENS = 1024;

const SYSTEM_PROMPT = `Create a musically coherent chord progression that matches the user's request.

Rules:
- Return between ${MIN_CHORDS} and ${MAX_CHORDS} chord names. Aim for ${MIN_CHORDS}-6 by default; only go longer when the user explicitly requests it or the style clearly benefits.
- Verify candidate chord names with lookup_chord. Use the tool's suggested alternative when a candidate is unavailable.
- Chord names use A through G, optional # or b, and an optional quality suffix. Use # and b, never Unicode accidentals or parentheses.
- Slash chords are allowed when bass motion improves the progression; verify the full slash form.
- Use triads, suspensions, sevenths, extensions, alterations, and inversions when they serve the requested genre or mood.
- The final rationale is one concise sentence. Do not mention tools, APIs, or internal validation.`;

const LOOKUP_CHORD_TOOL = {
  type: "function",
  name: "lookup_chord",
  description:
    "Verify a chord name against the Harmony Hash dictionary. Returns validity and a closest supported alternative when necessary.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      chord_name: {
        type: "string",
        description: "Chord name such as Cmaj7, Am9, F#dim, or D/F#.",
      },
    },
    required: ["chord_name"],
    additionalProperties: false,
  },
} satisfies FunctionTool;

const PROGRESSION_FORMAT = {
  type: "json_schema",
  name: "harmony_hash_progression",
  description: "A validated Harmony Hash chord progression.",
  strict: true,
  schema: {
    type: "object",
    properties: {
      chords: {
        type: "array",
        items: { type: "string" },
        minItems: MIN_CHORDS,
        maxItems: MAX_CHORDS,
      },
      key: { type: "string" },
      rationale: { type: "string" },
    },
    required: ["chords", "key", "rationale"],
    additionalProperties: false,
  },
} as const;

export class AgentNonConvergenceError extends Error {
  constructor() {
    super("Agent did not converge within iteration limit");
    this.name = "AgentNonConvergenceError";
  }
}

export class AgentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentValidationError";
  }
}

export class AgentProviderResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AgentProviderResponseError";
  }
}

export async function runProgressionAgent(
  userPrompt: string,
  client: OpenAIResponsesClient,
  signal?: AbortSignal,
): Promise<ProgressionResult> {
  const input: ResponseInput = [{ role: "user", content: userPrompt }];

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await client.create(
      {
        model: OPENAI_MODEL,
        instructions: SYSTEM_PROMPT,
        input,
        tools: [LOOKUP_CHORD_TOOL],
        tool_choice: iteration === 0 ? "required" : "auto",
        parallel_tool_calls: true,
        reasoning: { effort: "low" },
        max_output_tokens: MAX_OUTPUT_TOKENS,
        text: { format: PROGRESSION_FORMAT, verbosity: "low" },
        include: ["reasoning.encrypted_content"],
        store: false,
      },
      { signal },
    );

    if (response.status && response.status !== "completed") {
      const detail = response.error
        ? `${response.error.code}: ${response.error.message}`
        : response.incomplete_details?.reason ?? response.status;
      throw new AgentProviderResponseError(
        `OpenAI response ${response.status}: ${detail}`,
      );
    }

    const functionCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    if (functionCalls.length > 0) {
      // OpenAI requires every output item, including reasoning items, to be
      // carried into the next stateless turn before call-id-matched results.
      appendResponseOutput(input, response.output);

      for (const call of functionCalls) {
        if (call.name !== LOOKUP_CHORD_TOOL.name) {
          throw new AgentValidationError(`Unknown function call: ${call.name}`);
        }

        const chordName = parseChordLookupArguments(call.arguments);
        input.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(lookupChordForAgent(chordName)),
        });
      }
      continue;
    }

    const finalText = response.output_text.trim();
    if (finalText.length === 0) {
      throw new AgentValidationError(
        `OpenAI response contained no final text (status: ${response.status ?? "unknown"})`,
      );
    }
    return parseAndValidateProgression(finalText);
  }

  throw new AgentNonConvergenceError();
}

function appendResponseOutput(
  input: ResponseInput,
  output: ResponseOutputItem[],
): void {
  for (const item of output) {
    // Only these output types can be produced with this agent's function-only
    // tool surface. Failing closed keeps an SDK/API expansion from silently
    // dropping a required item from the stateless continuation.
    if (
      item.type === "message" ||
      item.type === "function_call" ||
      item.type === "reasoning"
    ) {
      input.push(item);
      continue;
    }
    throw new AgentValidationError(
      `Unexpected OpenAI response item: ${item.type}`,
    );
  }
}

function parseChordLookupArguments(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AgentValidationError("lookup_chord arguments were not valid JSON");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AgentValidationError("lookup_chord arguments must be an object");
  }

  const chordName = (parsed as Record<string, unknown>).chord_name;
  if (typeof chordName !== "string" || chordName.trim().length === 0) {
    throw new AgentValidationError("lookup_chord requires a non-empty chord_name");
  }
  return chordName.trim();
}

export function parseAndValidateProgression(raw: string): ProgressionResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
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
  if (obj.chords.length < MIN_CHORDS || obj.chords.length > MAX_CHORDS) {
    throw new AgentValidationError(
      `'chords' must contain between ${MIN_CHORDS} and ${MAX_CHORDS} entries, received ${obj.chords.length}`,
    );
  }

  const chords = obj.chords.map((entry) => {
    if (typeof entry !== "string" || entry.trim().length === 0) {
      throw new AgentValidationError("Every chord must be a non-empty string");
    }
    return entry.trim();
  });

  if (typeof obj.key !== "string" || obj.key.trim().length === 0) {
    throw new AgentValidationError("'key' must be a non-empty string");
  }
  if (typeof obj.rationale !== "string" || obj.rationale.trim().length === 0) {
    throw new AgentValidationError("'rationale' must be a non-empty string");
  }

  const unverified = chords.filter((chord) => !lookupChordForAgent(chord).valid);
  if (unverified.length > 0) {
    throw new AgentValidationError(
      `Agent returned unverified chord(s): ${unverified.join(", ")}`,
    );
  }

  return {
    chords,
    key: obj.key.trim(),
    rationale: obj.rationale.trim(),
  };
}
