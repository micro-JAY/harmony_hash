import { describe, expect, it } from "vitest";
import { HANZ_FIRST_MESSAGE, HANZ_SYSTEM_PROMPT } from "./hanzSystemPrompt";

describe("Harmony voice prompt", () => {
  it("sets the Harmony identity and concise turn boundaries", () => {
    expect(HANZ_FIRST_MESSAGE).toBe("Hi, I'm Harmony. What would you like help with?");
    expect(HANZ_SYSTEM_PROMPT).toContain("You are Harmony");
    expect(HANZ_SYSTEM_PROMPT).toContain("After the first greeting, answer only the explicit question");
    expect(HANZ_SYSTEM_PROMPT).toContain("Do not volunteer capabilities");
    expect(HANZ_SYSTEM_PROMPT).toContain('Do not end with offers such as "I can also"');
    expect(HANZ_SYSTEM_PROMPT).toContain("do not repeat capability explanations in the session");
  });
});
