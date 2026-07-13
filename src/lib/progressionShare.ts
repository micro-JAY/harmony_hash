import { lookupChord } from "./chordData";
import type { IndexedChord, Instrument } from "./types";

export const PROGRESSION_SHARE_VERSION = "1";
export const MAX_SHARED_CHORDS = 24;
export const MAX_SHARED_CHORD_LENGTH = 48;
export const MAX_SHARED_QUERY_LENGTH = 4_096;
export const MAX_SHARED_URL_LENGTH = 8_192;

const SHARE_KEYS = Object.freeze(["hh", "instrument", "chords"] as const);
const SHARE_KEY_SET = new Set<string>(SHARE_KEYS);

export interface ProgressionShareState {
  instrument: Instrument;
  chordInputs: ReadonlyArray<string>;
}

export interface ImportedProgressionChord {
  input: string;
  chord: IndexedChord;
}

export interface ImportedProgressionShare {
  instrument: Instrument;
  chords: ReadonlyArray<ImportedProgressionChord>;
}

export type ProgressionShareParseResult =
  | { status: "absent" }
  | { status: "valid"; share: ImportedProgressionShare }
  | { status: "invalid"; message: string };

export class ProgressionShareError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgressionShareError";
  }
}

function invalid(message: string): ProgressionShareParseResult {
  return {
    status: "invalid",
    message: `This shared progression couldn’t be opened. ${message}`,
  };
}

function isInstrument(value: string): value is Instrument {
  return value === "guitar" || value === "piano";
}

function validateChordInputs(chordInputs: unknown): ReadonlyArray<ImportedProgressionChord> {
  if (!Array.isArray(chordInputs) || chordInputs.length === 0) {
    throw new ProgressionShareError("The chord list is missing.");
  }
  if (chordInputs.length > MAX_SHARED_CHORDS) {
    throw new ProgressionShareError(
      `A shared progression can contain at most ${MAX_SHARED_CHORDS} chords.`,
    );
  }

  return Object.freeze(chordInputs.map((rawInput) => {
    if (typeof rawInput !== "string") {
      throw new ProgressionShareError("Every chord must be a chord name.");
    }
    const input = rawInput.trim();
    if (input.length === 0 || input.length > MAX_SHARED_CHORD_LENGTH) {
      throw new ProgressionShareError(
        `Each chord name must be between 1 and ${MAX_SHARED_CHORD_LENGTH} characters.`,
      );
    }
    const chord = lookupChord(input);
    if (!chord) {
      throw new ProgressionShareError(
        "One or more chord names are not available in Harmony Hash.",
      );
    }
    return Object.freeze({ input, chord });
  }));
}

function parseUrl(urlLike: string | URL): URL {
  try {
    return urlLike instanceof URL ? new URL(urlLike.toString()) : new URL(urlLike);
  } catch {
    throw new ProgressionShareError("The link format is invalid.");
  }
}

/**
 * Build a shareable snapshot without preserving the source URL's query or hash.
 * Only the version, selected instrument, and validated chord spellings cross
 * the boundary.
 */
export function createProgressionShareUrl(
  baseUrl: string | URL,
  state: ProgressionShareState,
): string {
  if (!isInstrument(state.instrument)) {
    throw new ProgressionShareError("The selected instrument cannot be shared.");
  }
  const chords = validateChordInputs(state.chordInputs);
  const sourceUrl = parseUrl(baseUrl);
  if (sourceUrl.protocol !== "https:" && sourceUrl.protocol !== "http:") {
    throw new ProgressionShareError("The app address cannot be shared.");
  }
  // Rebuild from the origin so credentials, private routes, queries, and
  // fragments from the current page can never cross the sharing boundary.
  const url = new URL("/", sourceUrl.origin);
  url.searchParams.set("hh", PROGRESSION_SHARE_VERSION);
  url.searchParams.set("instrument", state.instrument);
  url.searchParams.set("chords", JSON.stringify(chords.map(({ input }) => input)));

  if (url.search.length > MAX_SHARED_QUERY_LENGTH) {
    throw new ProgressionShareError("This progression is too large to fit in a share link.");
  }
  const serialized = url.toString();
  if (serialized.length > MAX_SHARED_URL_LENGTH) {
    throw new ProgressionShareError("This progression is too large to fit in a share link.");
  }
  return serialized;
}

/**
 * Parse and fully validate a share URL. A valid result already contains the
 * shared `IndexedChord` objects used by both guitar and piano rendering.
 */
export function parseProgressionShareUrl(urlLike: string | URL): ProgressionShareParseResult {
  let url: URL;
  try {
    url = parseUrl(urlLike);
  } catch (error) {
    return invalid(error instanceof Error ? error.message : "The link format is invalid.");
  }

  const hasShareKey = SHARE_KEYS.some((key) => url.searchParams.has(key));
  if (!hasShareKey) return { status: "absent" };
  if (url.search.length > MAX_SHARED_QUERY_LENGTH || url.toString().length > MAX_SHARED_URL_LENGTH) {
    return invalid("The link is too large.");
  }

  for (const key of url.searchParams.keys()) {
    if (!SHARE_KEY_SET.has(key)) {
      return invalid("The link contains unsupported data.");
    }
  }
  for (const key of SHARE_KEYS) {
    if (url.searchParams.getAll(key).length !== 1) {
      return invalid("The link has missing or duplicate fields.");
    }
  }
  if (url.searchParams.get("hh") !== PROGRESSION_SHARE_VERSION) {
    return invalid("This link uses an unsupported version.");
  }

  const instrument = url.searchParams.get("instrument") ?? "";
  if (!isInstrument(instrument)) {
    return invalid("The instrument is not supported.");
  }

  let rawChords: unknown;
  try {
    rawChords = JSON.parse(url.searchParams.get("chords") ?? "");
  } catch {
    return invalid("The chord list is malformed.");
  }

  try {
    return {
      status: "valid",
      share: Object.freeze({
        instrument,
        chords: validateChordInputs(rawChords),
      }),
    };
  } catch (error) {
    return invalid(
      error instanceof ProgressionShareError
        ? error.message
        : "The chord list could not be validated.",
    );
  }
}
