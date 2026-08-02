## Context

Hanz is lazy-loaded into the progression builder and remains mounted after first use so a live conversation and its nine browser tools survive panel close/reopen. Today `@elevenlabs/react` owns the media session, transcript callbacks, and tool registration; the Worker mints an ElevenLabs signed WebSocket URL from a second provider key and a public provisioned agent id. The prompt and browser bridge are already source-owned, but the effective prompt, authentication, and tool authority also depend on mutable provider-side agent configuration.

The replacement must run in a browser, request microphone access only after the existing explicit start action, keep the current panel DOM and styling, keep every progression mutation local to the existing bridge, and use only the Worker's existing `OPENAI_API_KEY`. The standard key must never cross the Worker boundary.

## Goals / Non-Goals

**Goals:**

- Establish a voice-only `gpt-realtime-2.1` WebRTC session from a short-lived OpenAI client secret minted by the Worker.
- Make the Hanz prompt, model, voice, VAD, transcription, and exact nine tools server-owned source configuration.
- Preserve panel behavior, lazy-loading, close/reopen continuity, transcript display, remote-audio health detection, interruption, focus cleanup, and the progression bridge.
- Validate and deduplicate every provider tool call before invoking local application authority.
- Fail closed at origin, rate-limit, configuration, provider, media, SDP, event, and cleanup boundaries without exposing credentials or provider detail.
- Remove all runtime and deployment dependence on ElevenLabs.

**Non-Goals:**

- Redesigning or relabeling the Hanz panel.
- Changing the text progression agent, progression bridge semantics, chord dictionary, or PR #88 surfaces.
- Adding accounts, persisted transcripts, server-side conversation storage, analytics, or background voice sessions.
- Deploying or deleting production secrets as part of the source change.

## Decisions

### Mint a fixed Realtime client secret in the Worker

`POST /api/voice/client-secret` will keep the existing required browser-Origin check, hashed caller admission, and dedicated voice rate limiter. It will reject bodies, require only `OPENAI_API_KEY`, and call OpenAI's `/v1/realtime/client_secrets` endpoint with a fixed session object. The browser receives only the short-lived secret value and expiry.

The fixed configuration uses `gpt-realtime-2.1`, audio output, the source-owned Hanz instructions, `marin`, near-field input noise reduction, input transcription, low-eagerness semantic VAD with automatic response creation and interruption, automatic tool choice, bounded output tokens, and the exact source-owned nine function schemas. Browser input cannot override the model, prompt, voice, tools, or turn policy.

An explicit fetch helper is preferred over using a browser SDK or undocumented SDK surface because the client-secret REST boundary is small, directly testable, and Worker-compatible. Provider responses are shape-checked; timeouts and non-OK responses become sanitized, generic failures.

### Own WebRTC and Realtime events in a small application runtime

A source-owned runtime will create an `RTCPeerConnection`, attach the microphone track, create the `oai-events` data channel, exchange SDP with `/v1/realtime/calls`, and play the remote media stream through an autoplay audio element. No provider package is needed in the browser. The runtime exposes the same high-level status, start, stop, transcript, reply, and audio-health state through the existing React context so panel markup and styling remain unchanged.

Client-secret minting happens before microphone acquisition. Every partial start owns an abort signal and deterministic rollback: stop acquired tracks, clear timers/listeners, close the data channel and peer connection, detach remote media, and clear Hanz focus. Explicit stop additionally sends `response.cancel` and `output_audio_buffer.clear` when the channel is open. A 300-second monotonic client deadline invokes the same stop path.

Browser WebRTC is preferred over a browser WebSocket because OpenAI recommends WebRTC for client voice sessions and the remote track handles output buffering and interruption. The runtime will not reconstruct provider audio deltas or manually truncate conversation items.

### Assemble transcripts by conversation item identity

The runtime records item order from conversation events and stores transcript text by `item_id`. User transcription completion and assistant output-audio transcript completion update their matching items, so out-of-order completion cannot reorder speakers. Mutable deltas may update an in-memory preview, but only completed text enters the durable React transcript list; failures surface as session diagnostics rather than fabricated text. The existing twenty-entry cap and six-row panel view remain.

Remote audio health will use inbound audio RTP statistics (`packetsReceived`) rather than base64 SDK callbacks. The existing reply baseline check therefore continues to detect a transcript reply with no received audio without decoding or persisting audio.

### Execute tools through one validated dispatcher

The provider-specific registration hook will become a provider-neutral dispatcher derived from `TOOL_SCHEMAS`. It accepts only the exact nine names, parses JSON without evaluation, validates object shapes and existing chord bounds, and serializes explicit success or failure output. A `call_id` ledger prevents repeated application mutations. Every accepted or rejected call produces a `function_call_output`; the runtime then requests the model's next response. The bridge remains the sole UI mutation authority.

The JSON Schemas will set `additionalProperties: false` and accurate required fields. Current app behavior is authoritative for playback: both guitar and piano can start, and the returned `started`, `already_playing`, `empty`, `cancelled`, or `unavailable` status is relayed exactly.

### Preserve the source-owned prompt and remove provider provisioning

The current prompt text will move into an importable source constant used directly by the Worker session configuration. This eliminates duplicated live-agent state. ElevenLabs provisioning/configuration code and tests, the signed-URL helper, public agent variables, provider secret declarations, and `@elevenlabs/react` will be removed. Generic secret redaction patterns may remain because retaining defense-in-depth for historical provider-shaped errors is harmless.

## Risks / Trade-offs

- **Browser media implementations differ** -> Cover mocked lifecycle failures plus Chromium synthetic-media browser tests; keep clear retryable messages and deterministic cleanup.
- **Realtime events can complete out of order or repeat** -> Index transcripts by item id and deduplicate tools by call id, with focused event-sequence tests.
- **A transcript can arrive without audible output** -> Poll inbound audio RTP statistics and keep the current delayed health warning.
- **A client-only deadline cannot terminate a deliberately detached network session** -> Close all resources on deadline, stop, navigation, and unmount; Harmony stores no server transcript or privileged sideband state. Tutor's separate migration owns server-side finalization.
- **OpenAI session schemas can evolve** -> Keep one typed/validated server request and response helper, fail closed on malformed responses, and exercise the current contract in a live smoke before release.
- **Removing provider provisioning reduces instant rollback after deployment** -> Retain the old immutable deployment and provider secret during the normal rollback window; source rollback restores the former path.

## Migration Plan

1. Land and validate this OpenSpec change as an isolated milestone.
2. Add the Worker client-secret helper/route, server-owned session configuration, binding cleanup, and unit tests.
3. Replace the browser provider runtime and tool hook while retaining the panel markup and bridge.
4. Remove ElevenLabs dependencies, auth/provisioning/configuration files, public variables, and stale docs; update unit, browser, and live smoke coverage.
5. Run strict OpenSpec validation, lint, type/build, full unit tests, full sequential Playwright, Wrangler dry-run, live synthetic-media verification, and an independent repository security scan.
6. Publish only the validated feature branch as a draft PR. Keep the former Worker version and ElevenLabs secret available for rollback until production verification completes; secret deletion is a separate operator action.

## Open Questions

None. Model, voice, turn detection, tool scope, UI scope, and credential boundary are fixed by this change.
