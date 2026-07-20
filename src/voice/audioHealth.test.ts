import { describe, expect, it } from "vitest";
import { voiceAudioHealthIssue } from "./audioHealth";

describe("voiceAudioHealthIssue", () => {
  it("does not infer spoken output from an agent transcript", () => {
    expect(voiceAudioHealthIssue({
      live: true,
      agentReplyCount: 1,
      sessionKind: "voice",
      audioPacketCount: 4,
      agentReplyAudioBaseline: 4,
    })).toBe("missing-audio");
  });

  it("accepts actual audio packets produced during the current user turn", () => {
    expect(voiceAudioHealthIssue({
      live: true,
      agentReplyCount: 2,
      sessionKind: "voice",
      audioPacketCount: 9,
      agentReplyAudioBaseline: 4,
    })).toBeNull();
  });

  it("distinguishes a text-only conversation from missing voice packets", () => {
    expect(voiceAudioHealthIssue({
      live: true,
      agentReplyCount: 1,
      sessionKind: "text",
      audioPacketCount: 0,
      agentReplyAudioBaseline: 0,
    })).toBe("text-only");
  });
});
