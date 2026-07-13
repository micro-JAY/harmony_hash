import { describe, expect, it, vi } from "vitest";
import type { ProgressionBridge } from "./types";
import { clearVoiceFocus, endVoiceSession } from "./sessionLifecycle";

function bridgeFixture() {
  const highlightChord = vi.fn<ProgressionBridge["highlightChord"]>();
  const bridge = { highlightChord } satisfies Pick<ProgressionBridge, "highlightChord">;
  return { bridge, highlightChord };
}

describe("voice session lifecycle", () => {
  it("clears Hanz focus when a conversation ends", async () => {
    const { bridge, highlightChord } = bridgeFixture();
    const endSession = vi.fn().mockResolvedValue(undefined);

    await endVoiceSession(endSession, bridge);

    expect(endSession).toHaveBeenCalledOnce();
    expect(highlightChord).toHaveBeenCalledWith(null);
  });

  it("still clears focus when ending the provider session fails", async () => {
    const { bridge, highlightChord } = bridgeFixture();
    const failure = new Error("provider disconnect failed");
    const endSession = vi.fn().mockRejectedValue(failure);

    await expect(endVoiceSession(endSession, bridge)).rejects.toThrow(failure);
    expect(highlightChord).toHaveBeenCalledWith(null);
  });

  it("clears focus directly for provider disconnect and error callbacks", async () => {
    const { bridge, highlightChord } = bridgeFixture();

    await clearVoiceFocus(bridge);

    expect(highlightChord).toHaveBeenCalledWith(null);
  });
});
