## 1. Production Recovery

- [x] 1.1 Confirm `/api/health`, `/api/progression`, and `/api/voice/signed-url` failures and compare live binding metadata with the last known-good Worker version.
- [x] 1.2 Restore only `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` to the current Worker code, verify both secret names, and deploy that exact version to production.
- [x] 1.3 Prove health, real progression generation, and signed voice-session minting return HTTP 200 without exposing either provider secret.

## 2. Release Guard

- [x] 2.1 Declare exactly the OpenAI and ElevenLabs provider secrets as required in `wrangler.jsonc`.
- [x] 2.2 Add focused automated coverage for the checked-in required-secret contract.
- [x] 2.3 Update Worker operations guidance with the fail-closed release behavior and recovery boundary.

## 3. Verification and Delivery

- [x] 3.1 Run focused Worker/config tests, build, lint, complete unit and browser regressions, strict OpenSpec validation, and Wrangler dry-run packaging.
- [x] 3.2 Re-verify both production provider flows in the browser and through safe live probes after the recovery.
- [x] 3.3 Prove the source diff contains no product UI, HASHER, TUNE TOOLBOX, FRET FINDER, music-theory, provider-prompt, or route behavior changes.
- [ ] 3.4 Commit and publish a focused draft PR, require exact-head CI, and leave merge, further deployment, and OpenSpec archive deferred.
