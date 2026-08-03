## 1. Realtime Session Boundary

- [x] 1.1 Move the existing Hanz instructions and first message into importable source constants and map the exact nine tool schemas to strict OpenAI Realtime function definitions.
- [x] 1.2 Implement a bounded OpenAI Realtime client-secret helper with provider-enforced 300-second expiry that validates successful and malformed provider responses and sanitizes timeout/upstream failures.
- [x] 1.3 Replace `/api/voice/signed-url` with the empty-body `/api/voice/client-secret` route while preserving required Origin admission, hashed caller rate limiting, CORS, and fail-closed error semantics.
- [x] 1.4 Update Worker tests to prove the fixed model/prompt/voice/VAD/transcription/tool configuration, body rejection, missing binding, admission failures, malformed provider responses, timeouts, and secret redaction.
- [x] 1.5 Remove the ElevenLabs binding and public agent id from Wrangler/local configuration and update Worker configuration tests and deployment documentation to require only `OPENAI_API_KEY`.

## 2. Browser Realtime Runtime

- [x] 2.1 Implement the abortable WebRTC start path with client-secret minting before microphone permission, SDP exchange, data-channel lifecycle, remote-track playback, and rollback of every partially acquired resource.
- [x] 2.2 Implement one opening response per new session, item-id transcript assembly, inbound RTP audio-health sampling plus playback rejection detection, interruption event handling, explicit stop, unmount cleanup, and the 300-second monotonic deadline.
- [x] 2.3 Replace the provider SDK state with the source-owned React context while retaining the existing lazy-load boundary, permanent mount, panel markup, labels, CSS, accessibility, focus restoration, and close/reopen continuity.
- [x] 2.4 Add focused runtime/provider tests for successful connection, mint/media/SDP/data-channel failures, out-of-order transcripts, missing audio, interruption, stop, deadline, navigation cleanup, and Strict Mode safety.

## 3. Progression Tool Bridge

- [x] 3.1 Replace provider hook registration with one dispatcher for the exact nine names, strict JSON/object/chord validation, serialized success/failure outputs, and fingerprinted `call_id` deduplication that fails closed on conflicting reuse.
- [x] 3.2 Return each tool result through `function_call_output` and request the next model response without permitting unknown tools or arbitrary application actions.
- [x] 3.3 Add tests for every valid tool plus malformed JSON, unknown names, extra fields, invalid bounds, bridge failures, duplicate `call_id`, and both guitar and piano playback semantics.

## 4. Provider Cleanup And Browser Coverage

- [x] 4.1 Remove `@elevenlabs/react`, the signed-URL helper/tests, provider provisioning/configuration code/tests, public agent variables, and stale provider documentation without changing unrelated dependencies or UI assets.
- [x] 4.2 Update Playwright coverage for runtime lazy loading, client-secret failures, pre-mint close, post-mint partial cleanup, no pre-start microphone request, live close/reopen continuity, focus restoration, and short-viewport reachability.
- [ ] 4.3 Rewrite the live voice smoke for synthetic microphone media, a real OpenAI WebRTC session, received remote audio, a real `replace_progression` call, visible timeline mutation, close/reopen continuity, and clean disconnect.
- [ ] 4.4 Record the provider migration, credential boundary, verification evidence, rollback boundary, and remaining deployment-only actions in `docs/long_horizon_log.md`.

## 5. Release Gates

- [ ] 5.1 Run focused Worker, Realtime runtime, tool dispatcher, lifecycle, progression bridge, audio-health, and Hanz Playwright tests until green.
- [ ] 5.2 Run `npm run lint`, `npm run build`, full Vitest, full sequential Playwright, Wrangler dry-run, strict all-spec OpenSpec validation, `git diff --check`, and dependency audit.
- [ ] 5.3 Run the live OpenAI synthetic-media smoke without printing or persisting either standard or ephemeral credentials and save only non-secret pass/fail evidence.
- [ ] 5.4 Run an independent full-repository Codex Security scan, fix every validated in-scope vulnerability, re-run affected gates, and obtain a clean or explicitly dispositioned re-scan.
- [ ] 5.5 Publish the exact validated branch as a draft PR, wait for GitHub/Codex scanning and suggestions, address actionable feedback, and re-run the affected verification before handoff.
