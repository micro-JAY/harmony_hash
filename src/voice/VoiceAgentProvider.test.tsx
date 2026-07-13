import type { PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressionBridge } from "./types";

const providerCallbacks = vi.hoisted(() => ({
  onDisconnect: undefined as (() => void) | undefined,
  onError: undefined as ((error: unknown) => void) | undefined,
}));

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({
    children,
    onDisconnect,
    onError,
  }: PropsWithChildren<{
    onDisconnect?: () => void;
    onError?: (error: unknown) => void;
  }>) => {
    providerCallbacks.onDisconnect = onDisconnect;
    providerCallbacks.onError = onError;
    return children;
  },
}));

import { VoiceAgentProvider } from "./VoiceAgentProvider";

function bridgeFixture() {
  const highlightChord = vi.fn<ProgressionBridge["highlightChord"]>();
  const bridge: ProgressionBridge = {
    getSnapshot: () => ({ chords: [] }),
    analyze: () => ({ chords: [], chordCount: 0, chordTones: [], voicing: [] }),
    addChords: vi.fn(),
    removeChord: vi.fn(),
    replaceProgression: vi.fn(),
    clear: vi.fn(),
    play: () => ({ ok: false }),
    randomize: vi.fn(),
    highlightChord,
  };
  return { bridge, highlightChord };
}

describe("VoiceAgentProvider session teardown", () => {
  beforeEach(() => {
    providerCallbacks.onDisconnect = undefined;
    providerCallbacks.onError = undefined;
  });

  afterEach(() => vi.restoreAllMocks());

  it("clears Hanz focus after provider disconnects and errors", async () => {
    const { bridge, highlightChord } = bridgeFixture();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderToStaticMarkup(
      <VoiceAgentProvider bridge={bridge} agentId="agent-test">
        <span>voice child</span>
      </VoiceAgentProvider>,
    );

    providerCallbacks.onDisconnect?.();
    await vi.waitFor(() => expect(highlightChord).toHaveBeenCalledWith(null));
    highlightChord.mockClear();

    providerCallbacks.onError?.(new Error("remote session failed"));
    await vi.waitFor(() => expect(highlightChord).toHaveBeenCalledWith(null));
    expect(consoleError).toHaveBeenCalled();
  });
});
