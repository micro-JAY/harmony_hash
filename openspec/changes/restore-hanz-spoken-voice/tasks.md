## 1. Spoken Session Contract

- [x] 1.1 Force the ElevenLabs provider and each started Hanz session onto the voice path with text-only mode explicitly disabled.
- [x] 1.2 Keep microphone capture SDK-owned, initialize output volume, and preserve the mounted session when the panel collapses.
- [x] 1.3 Keep voice selection server-managed through the persisted `HH_VOICE_ID` and expose no browser TTS override.

## 2. Audio Evidence and Recovery

- [x] 2.1 Record the created conversation kind and incoming audio-packet count in the voice runtime context.
- [x] 2.2 Show a specific retryable error when a completed agent reply produces no audio packet in a voice session.
- [x] 2.3 Add focused component and browser coverage for voice options, output volume, microphone timing, audio evidence, and the no-audio diagnostic.

## 3. Provisioned Voice Configuration

- [x] 3.1 Allow `HH_VOICE_ID` to update only the persisted voice ID on an existing ElevenLabs agent.
- [x] 3.2 Prove by readback that identity, TTS model, and every non-voice TTS field remain unchanged.
- [x] 3.3 Restore and verify signed authentication, the empty allowlist, required audio/transcript events, the requested voice, and all source-owned client tool contracts on the live agent.

## 4. Low-Usage Theory Boundary

- [x] 4.1 Document the recommended deterministic `get_harmony_context` tool and compact teaching-card retrieval boundary without adding MCP or vector-database runtime dependencies.

## 5. Release Validation

- [x] 5.1 Run strict OpenSpec validation, focused voice tests, build, lint, and the full unit suite.
- [x] 5.2 Run a real browser voice session with fake media and prove the session is voice-mode with incoming agent audio packets.
- [x] 5.3 Audit the final diff for voice-only scope, record milestone evidence, and commit the validated repair on its isolated feature branch.
