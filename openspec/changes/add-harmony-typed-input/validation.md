# Validation

Validated on the isolated `feat/voice-explore-typed-input` branch based on `936be49`.

- `npm run lint`: passed.
- `npm run build`: passed in the standard production configuration.
- `npm run test`: 65 files, 1,370 tests passed.
- `npx playwright test e2e/voice-agent.spec.ts --project=chromium --workers=1 --reporter=line --output=/tmp/harmony-typed-review-playwright`: 16 tests passed, including the production test build.
- `openspec validate add-harmony-typed-input --strict`: passed.
- `git diff --check`: passed.

Transport coverage verifies no microphone calls or local audio tracks in Type mode, receive-only audio negotiation, remote-audio readiness, spoken greeting configuration, deadline cleanup, blocked playback recovery, and cancellation immediately after microphone acquisition. Coordinator coverage verifies bounded input, ordered acknowledged text, duplicate-response safety, tool continuation, and failures. Browser coverage exercises the actual panel/provider/tool bridge with deterministic provider events, including unavailable microphones, live progression edits, drafts, mode locking, switching back to Voice, popup persistence, and audio retry.

Desktop and mobile screenshots were visually inspected. Local review captures are `/tmp/harmony-typed-desktop.png` and `/tmp/harmony-typed-mobile.png`; they are not repository assets. The 390 × 844 Type panel fits within its viewport and the existing short-landscape test passes.

The auth endpoint, credential security contract, nine tool names and parameter schemas, App routing, and tour were not changed. Agent instructions explicitly retain spoken answers for typed input; the playback guidance and randomization description now mention v4 ukulele support. Existing build warnings about bundle size and Browserslist data remain.

Live OpenAI audio was not exercised: browser tests use a mocked WebRTC provider, and transport tests use injected media dependencies. No credentials were copied or changed, and no deployment or merge occurred. A live Type/Voice smoke and audible-device check remain part of user acceptance before release.

## Review regression coverage

The coordinator tracks response generation, pending tools, and output-audio buffers separately. Tests verify that `response.done` alone does not unlock Type input while the matching buffer is playing; stopped/cleared events are tied to response IDs, delayed events cannot unlock another response, and tool-only continuations remain functional.

The provider retains the draft until matching typed-item acknowledgement. The composer is read-only during that brief wait. Browser tests verify both successful acknowledgement and successful local sends followed by a provider error or channel closure before acknowledgement; reopening and reconnecting preserve the original request. Focused transport/coordinator tests passed 46 cases.
