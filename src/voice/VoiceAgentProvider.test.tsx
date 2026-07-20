import type { PropsWithChildren } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgressionBridge } from "./types";

const providerCallbacks = vi.hoisted(() => ({
  onDisconnect: undefined as (() => void) | undefined,
  onError: undefined as ((error: unknown) => void) | undefined,
  onMessage: undefined as ((message: { message: string; role: "user" | "agent" }) => void) | undefined,
  onAudio: undefined as ((audio: string) => void) | undefined,
  onConversationCreated: undefined as ((conversation: { type: "voice" | "text" }) => void) | undefined,
  textOnly: undefined as boolean | undefined,
  overrides: undefined as Record<string, unknown> | undefined,
}));

vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({
    children,
    onDisconnect,
    onError,
    onMessage,
    onAudio,
    onConversationCreated,
    textOnly,
    overrides,
  }: PropsWithChildren<{
    onDisconnect?: () => void;
    onError?: (error: unknown) => void;
    onMessage?: (message: { message: string; role: "user" | "agent" }) => void;
    onAudio?: (audio: string) => void;
    onConversationCreated?: (conversation: { type: "voice" | "text" }) => void;
    textOnly?: boolean;
    overrides?: Record<string, unknown>;
  }>) => {
    providerCallbacks.onDisconnect = onDisconnect;
    providerCallbacks.onError = onError;
    providerCallbacks.onMessage = onMessage;
    providerCallbacks.onAudio = onAudio;
    providerCallbacks.onConversationCreated = onConversationCreated;
    providerCallbacks.textOnly = textOnly;
    providerCallbacks.overrides = overrides;
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
    play: () => ({
      ok: false,
      status: "empty",
      message: "There are no chords on the timeline to play yet.",
    }),
    randomize: vi.fn(),
    highlightChord,
  };
  return { bridge, highlightChord };
}

describe("VoiceAgentProvider session teardown", () => {
  beforeEach(() => {
    providerCallbacks.onDisconnect = undefined;
    providerCallbacks.onError = undefined;
    providerCallbacks.onMessage = undefined;
    providerCallbacks.onAudio = undefined;
    providerCallbacks.onConversationCreated = undefined;
    providerCallbacks.textOnly = undefined;
    providerCallbacks.overrides = undefined;
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

  it("pins a voice conversation without exposing a browser TTS override", () => {
    const { bridge } = bridgeFixture();
    renderToStaticMarkup(
      <VoiceAgentProvider
        bridge={bridge}
        agentId="agent-test"
      >
        <span>voice child</span>
      </VoiceAgentProvider>,
    );

    expect(providerCallbacks.textOnly).toBe(false);
    expect(providerCallbacks.overrides).toEqual({
      conversation: { textOnly: false },
    });
    expect(providerCallbacks.onConversationCreated).toEqual(expect.any(Function));
    expect(providerCallbacks.onAudio).toEqual(expect.any(Function));
  });
});
