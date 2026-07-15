import {
  MAX_VOICE_CHORD_SYMBOL_LENGTH,
  MAX_VOICE_PROGRESSION_CHORDS,
} from "./toolSchemas";

/** Validate untrusted client-tool arguments before they reach the state bridge. */
export function requireChordSymbols(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`'${field}' must be an array of chord symbols`);
  }
  if (value.length > MAX_VOICE_PROGRESSION_CHORDS) {
    throw new Error(
      `'${field}' cannot contain more than ${MAX_VOICE_PROGRESSION_CHORDS} chord symbols`,
    );
  }
  const oversizedIndex = value.findIndex(
    (item) => item.length > MAX_VOICE_CHORD_SYMBOL_LENGTH,
  );
  if (oversizedIndex >= 0) {
    throw new Error(
      `'${field}[${oversizedIndex}]' must be at most ${MAX_VOICE_CHORD_SYMBOL_LENGTH} characters`,
    );
  }
  return [...value];
}
