## Why

Hanz connects and receives agent text, but users are not hearing spoken output, and supplying `HH_VOICE_ID` does not update an existing provisioned agent. The live experience must guarantee a voice session with the requested voice while exposing enough audio diagnostics to distinguish TTS configuration from browser playback failures.

## What Changes

- Force Hanz sessions onto the ElevenLabs voice path instead of relying on implicit text-only defaults.
- Provision the required `audio` client event so ElevenLabs actually generates and streams voice output alongside transcript events.
- Allow an explicitly supplied `HH_VOICE_ID` to update an existing agent while preserving every other live TTS setting.
- Keep the requested voice server-managed through provisioning and verify that browser sessions receive non-zero audio from that persisted voice.
- Surface a clear in-panel error when a connected session produces agent text without playable audio.
- Add a compact, deterministic local harmony-context strategy for future deeper teaching and continuation questions without adding an MCP round trip or sending a large knowledge base on every turn.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voice-companion`: Require authenticated spoken sessions, explicit voice-ID application, observable output-audio health, and a low-token local context boundary for deeper theory assistance.

## Impact

- Affects only Hanz voice runtime/provider/panel code, provisioning configuration, voice-focused tests, source-owned prompt/spec documentation, and non-secret voice environment examples.
- Does not change progression generation, Tune Toolbox, Fret Finder, chord rendering, playback, Worker authentication, or the nine existing progression mutation tools.
- No new runtime dependency, MCP server, vector database, or hosted retrieval service is introduced in this repair.
