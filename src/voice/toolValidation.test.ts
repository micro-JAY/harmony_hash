import { describe, expect, it } from "vitest";
import {
  MAX_VOICE_CHORD_SYMBOL_LENGTH,
  MAX_VOICE_PROGRESSION_CHORDS,
  TOOL_SCHEMAS,
} from "./toolSchemas";
import { requireChordSymbols } from "./toolValidation";

describe("voice chord tool validation", () => {
  it("documents the runtime bounds on both provider-compatible mutating schemas", () => {
    for (const name of ["add_chords", "replace_progression"]) {
      const tool = TOOL_SCHEMAS.find((candidate) => candidate.name === name);
      const chords = tool?.parameters.properties.chords;
      if (
        !chords
        || typeof chords !== "object"
        || !("description" in chords)
        || typeof chords.description !== "string"
      ) {
        throw new Error(`${name} is missing its chord-array description`);
      }
      expect(chords.description).toContain(
        `at most ${MAX_VOICE_PROGRESSION_CHORDS} symbols`,
      );
      expect(chords.description).toContain(
        `at most ${MAX_VOICE_CHORD_SYMBOL_LENGTH} characters`,
      );
    }
    expect(TOOL_SCHEMAS).toHaveLength(9);
  });

  it("accepts and copies values exactly at both bounds", () => {
    const input = Array.from(
      { length: MAX_VOICE_PROGRESSION_CHORDS },
      () => "C".repeat(MAX_VOICE_CHORD_SYMBOL_LENGTH),
    );

    const parsed = requireChordSymbols(input, "chords");

    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
  });

  it("rejects oversized batches and chord symbols", () => {
    expect(() =>
      requireChordSymbols(
        Array.from({ length: MAX_VOICE_PROGRESSION_CHORDS + 1 }, () => "C"),
        "chords",
      ),
    ).toThrow(`more than ${MAX_VOICE_PROGRESSION_CHORDS}`);
    expect(() =>
      requireChordSymbols(
        ["C".repeat(MAX_VOICE_CHORD_SYMBOL_LENGTH + 1)],
        "chords",
      ),
    ).toThrow(`at most ${MAX_VOICE_CHORD_SYMBOL_LENGTH} characters`);
  });

  it("rejects malformed tool arguments", () => {
    expect(() => requireChordSymbols("Cmaj7", "chords")).toThrow(
      "must be an array of chord symbols",
    );
    expect(() => requireChordSymbols(["Cmaj7", 7], "chords")).toThrow(
      "must be an array of chord symbols",
    );
  });
});
