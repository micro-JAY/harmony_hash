## Why

Hanz currently depends on an ElevenLabs agent, signed-URL service, public agent identifier, and provider-side provisioning state. Migrating the same shipped voice-companion experience to OpenAI Realtime removes that external configuration drift while reusing Harmony Hash's existing server-held OpenAI credential and preserving the user's progression, tool, transcript, audio, interruption, and panel behavior.

## What Changes

- Replace the ElevenLabs signed-URL exchange with a rate-limited Worker endpoint that mints a short-lived, server-configured OpenAI Realtime client secret.
- Replace the ElevenLabs React runtime with a browser WebRTC runtime for `gpt-realtime-2.1`, remote-track audio, semantic voice activity detection, live transcripts, interruption, and explicit cleanup.
- Preserve the existing Hanz prompt and exact nine browser-executed progression tools, adding strict argument validation, duplicate-call protection, and explicit tool failures.
- Preserve the existing compact/expanded panel, lazy loading, permanent mounting, microphone-on-explicit-start rule, focus lifecycle, audio diagnostics, and five-minute client session limit without visual or navigation changes.
- Remove the ElevenLabs dependency, API key, public agent id, provisioning/configuration scripts, and provider-specific authentication helper and tests.
- Replace the live provider smoke with an OpenAI WebRTC smoke that proves remote audio, a real progression tool mutation, close/reopen continuity, and clean disconnect.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voice-companion`: Replace the provider-specific session, authentication, provisioning, tool-call, transcript, audio, and failure contract with a server-configured OpenAI Realtime WebRTC contract while retaining the shipped Hanz experience.

## Impact

- Voice runtime and tests under `src/voice/`, plus the Hanz integration props in `src/App.tsx`.
- Worker voice authentication route, bindings, tests, local examples, and deployment documentation.
- Provider helper, package dependency/lockfile, provider provisioning scripts, and live voice smoke.
- No intended change to the panel's rendered UI, the progression builder, the text progression agent, or PR #88 surfaces.
