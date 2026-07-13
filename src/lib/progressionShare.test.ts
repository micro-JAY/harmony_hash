import { describe, expect, it } from "vitest";
import {
  createProgressionShareUrl,
  MAX_SHARED_CHORDS,
  MAX_SHARED_CHORD_LENGTH,
  parseProgressionShareUrl,
  ProgressionShareError,
} from "./progressionShare";

describe("progression share links", () => {
  it("serializes only validated chords, instrument, and version", () => {
    const serialized = createProgressionShareUrl(
      "https://harmony.tonari.ai/?prompt=private&token=secret#voice-session",
      {
        instrument: "piano",
        chordInputs: ["Cmaj7", "G7#9", "Bbmaj7"],
      },
    );
    const url = new URL(serialized);

    expect([...url.searchParams.keys()]).toEqual(["hh", "instrument", "chords"]);
    expect(url.searchParams.get("hh")).toBe("1");
    expect(url.searchParams.get("instrument")).toBe("piano");
    expect(JSON.parse(url.searchParams.get("chords") ?? "")).toEqual([
      "Cmaj7",
      "G7#9",
      "Bbmaj7",
    ]);
    expect(url.search).not.toContain("prompt");
    expect(url.search).not.toContain("token");
    expect(url.hash).toBe("");
    expect(serialized).toContain("G7%239");
  });

  it("rebuilds from a safe app root and rejects non-web schemes", () => {
    const serialized = createProgressionShareUrl(
      "https://user:password@harmony.tonari.ai/private/session?prompt=private#voice-session",
      { instrument: "guitar", chordInputs: ["C", "G7"] },
    );
    const url = new URL(serialized);

    expect(url.username).toBe("");
    expect(url.password).toBe("");
    expect(url.pathname).toBe("/");
    expect(url.searchParams.get("chords")).toBe('["C","G7"]');
    expect(() => createProgressionShareUrl("file:///private/session", {
      instrument: "guitar",
      chordInputs: ["C"],
    })).toThrow("app address cannot be shared");
  });

  it("re-resolves every imported chord through the shared dictionary", () => {
    const result = parseProgressionShareUrl(
      createProgressionShareUrl("https://harmony.tonari.ai/", {
        instrument: "guitar",
        chordInputs: ["Cmaj7", "G7#9", "Bbmaj7"],
      }),
    );

    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(result.share.instrument).toBe("guitar");
    expect(result.share.chords.map(({ input }) => input)).toEqual([
      "Cmaj7",
      "G7#9",
      "Bbmaj7",
    ]);
    expect(result.share.chords.map(({ chord }) => chord.root)).toEqual(["C", "G", "As"]);
    expect(result.share.chords[2]?.chord.displayName).toBe("A#maj7");
  });

  it("distinguishes ordinary URLs from incomplete share URLs", () => {
    expect(parseProgressionShareUrl("https://harmony.tonari.ai/?utm_source=test")).toEqual({
      status: "absent",
    });
    expect(
      parseProgressionShareUrl("https://harmony.tonari.ai/?instrument=piano&chords=%5B%22C%22%5D"),
    ).toMatchObject({
      status: "invalid",
      message: expect.stringContaining("missing or duplicate fields"),
    });
  });

  it.each([
    ["duplicate version", "?hh=1&hh=1&instrument=guitar&chords=%5B%22C%22%5D", "duplicate"],
    ["unknown version", "?hh=9&instrument=guitar&chords=%5B%22C%22%5D", "unsupported version"],
    ["unknown field", "?hh=1&instrument=guitar&chords=%5B%22C%22%5D&prompt=secret", "unsupported data"],
    ["unknown instrument", "?hh=1&instrument=bass&chords=%5B%22C%22%5D", "instrument"],
    ["malformed JSON", "?hh=1&instrument=guitar&chords=%7B", "malformed"],
    ["non-array JSON", "?hh=1&instrument=guitar&chords=%7B%7D", "chord list is missing"],
    ["empty list", "?hh=1&instrument=guitar&chords=%5B%5D", "chord list is missing"],
    ["unknown chord", "?hh=1&instrument=guitar&chords=%5B%22H13%22%5D", "not available"],
  ])("rejects %s", (_label, search, message) => {
    expect(parseProgressionShareUrl(`https://harmony.tonari.ai/${search}`)).toMatchObject({
      status: "invalid",
      message: expect.stringContaining(message),
    });
  });

  it("enforces chord count and symbol-length bounds on both directions", () => {
    const tooMany = Array.from({ length: MAX_SHARED_CHORDS + 1 }, () => "C");
    const tooLong = `C${"x".repeat(MAX_SHARED_CHORD_LENGTH)}`;

    expect(() => createProgressionShareUrl("https://harmony.tonari.ai/", {
      instrument: "guitar",
      chordInputs: tooMany,
    })).toThrow(ProgressionShareError);
    expect(() => createProgressionShareUrl("https://harmony.tonari.ai/", {
      instrument: "guitar",
      chordInputs: [tooLong],
    })).toThrow(ProgressionShareError);

    const tooManyUrl = new URL("https://harmony.tonari.ai/");
    tooManyUrl.searchParams.set("hh", "1");
    tooManyUrl.searchParams.set("instrument", "guitar");
    tooManyUrl.searchParams.set("chords", JSON.stringify(tooMany));
    expect(parseProgressionShareUrl(tooManyUrl)).toMatchObject({
      status: "invalid",
      message: expect.stringContaining(`at most ${MAX_SHARED_CHORDS}`),
    });
  });

  it("rejects empty and dictionary-invalid export state", () => {
    expect(() => createProgressionShareUrl("https://harmony.tonari.ai/", {
      instrument: "guitar",
      chordInputs: [],
    })).toThrow("The chord list is missing");
    expect(() => createProgressionShareUrl("https://harmony.tonari.ai/", {
      instrument: "piano",
      chordInputs: ["Cmaj7", "NotAChord"],
    })).toThrow("not available in Harmony Hash");
  });
});
