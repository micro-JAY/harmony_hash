## 1. Baseline And Contracts

- [x] 1.1 Verify Git history, current Worker deployment, provider secret bindings, canonical specs, and the unavailable prior migration task
- [x] 1.2 Diagnose the live ElevenLabs agent and record the signed-URL auth mismatch without exposing credentials
- [x] 1.3 Capture reproducible desktop and 375px browser baselines for Free Input, Progressions, companion spacing, overflow, and console state

## 2. OpenAI Progression Builder

- [x] 2.1 Replace `@anthropic-ai/sdk` with the official OpenAI SDK and lockfile changes
- [x] 2.2 Implement the pinned Responses API loop with strict chord lookup calls, preserved response items, structured output, 3–8 validation, and bounded failures
- [x] 2.3 Update Worker health/environment types and browser health/request parsing to use OpenAI readiness and a 30-second deadline
- [x] 2.4 Preserve prior chord cards on failure and expose clear loading, error, retry, key, and rationale states
- [x] 2.5 Update `.dev.vars.example`, Worker/operator docs, architecture docs, and dated long-horizon log without rewriting historical decisions

## 3. Progression Verification And Milestone

- [x] 3.1 Add deterministic Worker/provider tests for validation, strict tool calls, parallel calls, malformed calls/output, convergence, timeouts, upstream failures, CORS, and secret redaction
- [x] 3.2 Add progression-client tests for health schema, 3–8 responses, malformed/error bodies, aborts, and deadlines
- [x] 3.3 Add Playwright interception coverage for ready health, successful generation, validation, failure preservation, and retry
- [x] 3.4 Run focused build, lint, Vitest, Playwright, and local Worker health/generation smoke with representative extended/slash-chord prompts
- [x] 3.5 Commit the progression recovery milestone, upload a preview Worker version, smoke that exact version, then deploy and verify production

## 4. Harmony Companion Repair

- [x] 4.1 Refactor ElevenLabs provisioning into full create and narrow update payloads that preserve live name/voice/TTS customizations
- [x] 4.2 Add signed-URL route and panel tests covering 500, 502, 200, connection error, and connect/disconnect state
- [x] 4.3 Update the existing live agent in place, re-fetch safe auth/tool metadata, and verify signed-URL minting
- [x] 4.4 Complete a real signed browser session with privacy-safe synthetic media input, connect/disconnect, and one client-tool progression mutation; record the physical microphone permission result
- [x] 4.5 Commit the voice-companion repair milestone

## 5. Builder UI Cleanup

- [x] 5.1 Consolidate Randomize, piano Play/Stop, and a permanently mounted compact Harmony Companion into one responsive action toolbar
- [x] 5.2 Make full companion content explicitly expandable while preserving an active session and registered client tools when collapsed or switching tabs
- [x] 5.3 Stack Free Input and Progression Agent control rows on mobile, wrap header controls, and remove horizontal overflow
- [x] 5.4 Remove the invalid guitar SVG `height="auto"` attribute and verify clean browser console output
- [x] 5.5 Add desktop/mobile Playwright assertions and screenshots for both tabs, compact/expanded companion states, card adjacency, and width invariants
- [x] 5.6 Commit the UI cleanup milestone

## 6. Final Review And Delivery

- [x] 6.1 Run the full install, build, lint, Vitest, Playwright, Worker smoke, production build, and bundle-size gates
- [x] 6.2 Run independent code, security, and spec-coherence reviews; fix all actionable findings and rerun affected gates
- [x] 6.3 Reconcile `docs/long_horizon_plan.md` and `docs/long_horizon_log.md` with the final branch/deployment state
- [x] 6.4 Push the feature branch, open a PR with screenshots and test evidence, wait for green CI/reviews, and merge into `main`
- [x] 6.5 Archive the OpenSpec change, apply its deltas to canonical specs, and verify the final production end state
