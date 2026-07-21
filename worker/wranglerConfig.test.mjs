import { readFileSync } from "node:fs";
import { parseConfigFileTextToJson } from "typescript";
import { describe, expect, it } from "vitest";

describe("Worker deployment configuration", () => {
  it("requires both production provider secrets before release", () => {
    const source = readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
    const parsed = parseConfigFileTextToJson("wrangler.jsonc", source);

    expect(parsed.error).toBeUndefined();
    expect(parsed.config?.secrets?.required).toEqual([
      "OPENAI_API_KEY",
      "ELEVENLABS_API_KEY",
    ]);
  });
});
