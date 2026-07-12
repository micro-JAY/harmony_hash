import { describe, expect, it } from "vitest";
import { sanitizeProviderDetail } from "./sanitizeProviderDetail";

describe("sanitizeProviderDetail", () => {
  it("redacts OpenAI and ElevenLabs API key forms", () => {
    expect(
      sanitizeProviderDetail(
        "OpenAI sk-never-leak-123456 and ElevenLabs sk_never_leak_654321",
      ),
    ).toBe("OpenAI [redacted] and ElevenLabs [redacted]");
  });

  it("redacts bearer values and sensitive URL query parameters", () => {
    expect(
      sanitizeProviderDetail(
        "Bearer abc.def-123 https://voice.example/session?token=secret-value&mode=live",
      ),
    ).toBe(
      "Bearer [redacted] https://voice.example/session?token=[redacted]&mode=live",
    );
  });

  it("redacts signed WebSocket capabilities and ElevenLabs credential labels", () => {
    expect(
      sanitizeProviderDetail(
        "wss://voice.example/session?conversation_signature=secret&mode=live " +
          "xi-api-key: opaque-key, conversationToken=opaque-token",
      ),
    ).toBe(
      "[signed-url redacted] xi-api-key: [redacted], " +
        "conversationToken=[redacted]",
    );
  });

  it("redacts provider environment labels and multiword authorization values", () => {
    expect(
      sanitizeProviderDetail(
        "OPENAI_API_KEY=opaque-openai; ELEVENLABS_API_KEY: opaque-eleven, " +
          "Authorization: Basic opaque-credentials",
      ),
    ).toBe(
      "OPENAI_API_KEY=[redacted]; ELEVENLABS_API_KEY: [redacted], " +
        "Authorization: [redacted]",
    );
  });

  it("redacts signed URL and authorization fields in structured detail", () => {
    expect(
      sanitizeProviderDetail(
        '{"signed_url":"wss://voice.example/private","authorization":"opaque-value"}',
      ),
    ).toBe(
      '{"signed_url":"[redacted]","authorization":"[redacted]"}',
    );
  });

  it("preserves benign context and applies the configured bound", () => {
    expect(sanitizeProviderDetail("provider unavailable")).toBe(
      "provider unavailable",
    );
    expect(sanitizeProviderDetail("abcdefgh", 4)).toBe("abcd");
  });
});
