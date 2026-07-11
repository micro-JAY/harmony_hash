import { describe, expect, it, vi } from "vitest";
import type {
  ResponseCreateParamsNonStreaming,
  ResponseOutputItem,
} from "openai/resources/responses/responses";
import {
  AgentNonConvergenceError,
  AgentProviderResponseError,
  AgentValidationError,
  MAX_ITERATIONS,
  OPENAI_MODEL,
  parseAndValidateProgression,
  runProgressionAgent,
  type OpenAIResponseTurn,
  type OpenAIResponsesClient,
} from "./progressionAgent";

function functionCall(
  callId: string,
  chordName: string,
  name = "lookup_chord",
): ResponseOutputItem {
  return {
    type: "function_call",
    call_id: callId,
    name,
    arguments: JSON.stringify({ chord_name: chordName }),
    status: "completed",
  };
}

function reasoningItem(): ResponseOutputItem {
  return {
    type: "reasoning",
    id: "reasoning_1",
    summary: [],
    encrypted_content: "encrypted-test-content",
    status: "completed",
  };
}

function finalTurn(
  chords = ["Cmaj7", "Am7", "Dm7", "G7"],
): OpenAIResponseTurn {
  return {
    output: [],
    output_text: JSON.stringify({
      chords,
      key: "C major",
      rationale: "A compact turnaround with smooth harmonic motion.",
    }),
    status: "completed",
  };
}

function fakeClient(...turns: OpenAIResponseTurn[]): {
  client: OpenAIResponsesClient;
  requests: ResponseCreateParamsNonStreaming[];
  signals: Array<AbortSignal | undefined>;
} {
  const requests: ResponseCreateParamsNonStreaming[] = [];
  const signals: Array<AbortSignal | undefined> = [];
  const queue = [...turns];
  const client: OpenAIResponsesClient = {
    create: vi.fn(async (body, options) => {
      requests.push(body);
      signals.push(options?.signal);
      const turn = queue.shift();
      if (!turn) throw new Error("Fake client ran out of responses");
      return turn;
    }),
  };
  return { client, requests, signals };
}

describe("runProgressionAgent", () => {
  it("uses the pinned Responses model, strict schema, and required first tool turn", async () => {
    const toolTurn: OpenAIResponseTurn = {
      output: [functionCall("call_1", "Cmaj7")],
      output_text: "",
      status: "completed",
    };
    const { client, requests } = fakeClient(toolTurn, finalTurn());

    await runProgressionAgent("warm jazz turnaround", client);

    expect(requests[0]).toMatchObject({
      model: OPENAI_MODEL,
      tool_choice: "required",
      parallel_tool_calls: true,
      store: false,
      max_output_tokens: 1024,
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          strict: true,
          schema: {
            properties: {
              chords: { minItems: 3, maxItems: 8 },
            },
          },
        },
      },
    });
    expect(requests[0].tools?.[0]).toMatchObject({
      type: "function",
      name: "lookup_chord",
      strict: true,
      parameters: {
        required: ["chord_name"],
        additionalProperties: false,
      },
    });
    expect(requests[1].tool_choice).toBe("auto");
  });

  it("preserves reasoning and parallel function calls before matched outputs", async () => {
    const toolTurn: OpenAIResponseTurn = {
      output: [
        reasoningItem(),
        functionCall("call_1", "D/F#"),
        functionCall("call_2", "E7#9"),
      ],
      output_text: "",
      status: "completed",
    };
    const { client, requests } = fakeClient(toolTurn, finalTurn());

    await runProgressionAgent("chromatic soul progression", client);

    const continuation = requests[1].input;
    expect(Array.isArray(continuation)).toBe(true);
    expect(continuation).toEqual([
      { role: "user", content: "chromatic soul progression" },
      toolTurn.output[0],
      toolTurn.output[1],
      toolTurn.output[2],
      expect.objectContaining({
        type: "function_call_output",
        call_id: "call_1",
      }),
      expect.objectContaining({
        type: "function_call_output",
        call_id: "call_2",
      }),
    ]);
  });

  it("passes the supplied abort signal to every Responses request", async () => {
    const signal = new AbortController().signal;
    const { client, signals } = fakeClient(
      {
        output: [functionCall("call_1", "Cmaj7")],
        output_text: "",
      },
      finalTurn(),
    );

    await runProgressionAgent("gentle major progression", client, signal);

    expect(signals).toEqual([signal, signal]);
  });

  it("rejects malformed and unknown function calls", async () => {
    const malformed = fakeClient({
      output: [
        {
          type: "function_call",
          call_id: "call_1",
          name: "lookup_chord",
          arguments: "{not-json",
          status: "completed",
        },
      ],
      output_text: "",
    });
    await expect(
      runProgressionAgent("test", malformed.client),
    ).rejects.toThrow("arguments were not valid JSON");

    const unknown = fakeClient({
      output: [functionCall("call_2", "Cmaj7", "unknown_tool")],
      output_text: "",
    });
    await expect(runProgressionAgent("test", unknown.client)).rejects.toThrow(
      "Unknown function call",
    );
  });

  it("fails closed on an output item outside the declared tool surface", async () => {
    const client = fakeClient({
      output: [
        {
          type: "computer_call",
          id: "computer_1",
          call_id: "unexpected",
          pending_safety_checks: [],
          status: "completed",
        },
        functionCall("call_1", "Cmaj7"),
      ],
      output_text: "",
    });

    await expect(runProgressionAgent("test", client.client)).rejects.toThrow(
      "Unexpected OpenAI response item: computer_call",
    );
  });

  it("rejects empty, malformed, or dictionary-invalid final output", async () => {
    await expect(
      runProgressionAgent(
        "test",
        fakeClient({ output: [], output_text: "", status: "completed" }).client,
      ),
    ).rejects.toThrow("contained no final text");

    await expect(
      runProgressionAgent(
        "test",
        fakeClient({ output: [], output_text: "not json" }).client,
      ),
    ).rejects.toBeInstanceOf(AgentValidationError);

    await expect(
      runProgressionAgent(
        "test",
        fakeClient(finalTurn(["Cmaj7", "Am7", "NotAChord"])).client,
      ),
    ).rejects.toThrow("unverified chord");
  });

  it("rejects resolved failed and incomplete provider responses before using output", async () => {
    await expect(
      runProgressionAgent(
        "test",
        fakeClient({
          output: [functionCall("call_1", "Cmaj7")],
          output_text: "",
          status: "failed",
          error: {
            code: "server_error",
            message: "provider could not complete the response",
          },
        }).client,
      ),
    ).rejects.toThrow(
      "OpenAI response failed: server_error: provider could not complete the response",
    );

    await expect(
      runProgressionAgent(
        "test",
        fakeClient({
          output: [],
          output_text: "{\"partial\":true}",
          status: "incomplete",
          incomplete_details: { reason: "max_output_tokens" },
        }).client,
      ),
    ).rejects.toBeInstanceOf(AgentProviderResponseError);

    await expect(
      runProgressionAgent(
        "test",
        fakeClient({
          output: [],
          output_text: "",
          status: "incomplete",
          incomplete_details: { reason: "content_filter" },
        }).client,
      ),
    ).rejects.toThrow("content_filter");
  });

  it("stops after the bounded iteration limit", async () => {
    const turns = Array.from({ length: MAX_ITERATIONS }, (_, index) => ({
      output: [functionCall(`call_${index}`, "Cmaj7")],
      output_text: "",
    }));
    const { client, requests } = fakeClient(...turns);

    await expect(runProgressionAgent("test", client)).rejects.toBeInstanceOf(
      AgentNonConvergenceError,
    );
    expect(requests).toHaveLength(MAX_ITERATIONS);
  });
});

describe("parseAndValidateProgression", () => {
  it("accepts trimmed 3- and 8-chord responses including extended/slash chords", () => {
    expect(
      parseAndValidateProgression(
        JSON.stringify({
          chords: [" D/F# ", "E7#9", "Cmaj7"],
          key: " E minor ",
          rationale: " Chromatic bass motion. ",
        }),
      ),
    ).toEqual({
      chords: ["D/F#", "E7#9", "Cmaj7"],
      key: "E minor",
      rationale: "Chromatic bass motion.",
    });

    expect(
      parseAndValidateProgression(
        JSON.stringify({
          chords: ["Cmaj7", "Am7", "Dm7", "G7", "Fmaj9", "Bb13", "D/F#", "E7#9"],
          key: "C major",
          rationale: "An intentionally long progression.",
        }),
      ).chords,
    ).toHaveLength(8);
  });

  it("rejects chord-count and response-shape violations", () => {
    expect(() =>
      parseAndValidateProgression(
        JSON.stringify({ chords: ["C", "G"], key: "C", rationale: "Too short" }),
      ),
    ).toThrow("between 3 and 8");
    expect(() =>
      parseAndValidateProgression(
        JSON.stringify({ chords: ["C", "G", "Am"], key: "", rationale: "Invalid" }),
      ),
    ).toThrow("'key' must be a non-empty string");
  });
});
