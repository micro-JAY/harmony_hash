import { describe, expect, it } from "vitest";
import { buildWranglerArgs } from "./wrangler-dev";

describe("buildWranglerArgs", () => {
  it("forwards configured non-secret local bindings as Wrangler vars", () => {
    expect(
      buildWranglerArgs(["--local"], {
        ALLOWED_ORIGIN: "https://staging.harmony.tonari.ai",
        HH_VOICE_AGENT_ID: "agent_local",
        OPENAI_API_KEY: "should-not-be-forwarded",
      }),
    ).toEqual([
      "wrangler",
      "dev",
      "--var",
      "ALLOWED_ORIGIN:https://staging.harmony.tonari.ai",
      "--var",
      "HH_VOICE_AGENT_ID:agent_local",
      "--local",
    ]);
  });

  it("does not emit empty or unrelated environment variables", () => {
    expect(
      buildWranglerArgs([], {
        ALLOWED_ORIGIN: " ",
        HH_VOICE_AGENT_ID: undefined,
        OTHER_SETTING: "ignored",
      }),
    ).toEqual(["wrangler", "dev"]);
  });
});
