# Tasks — Add Voice Companion

## 1. Recon, branch, scaffolding
- [x] 1.1 Branch `feat/voice-companion` off `main`.
- [x] 1.2 Write this openspec change (proposal, tasks, design, spec delta) before any code.
- [x] 1.3 Install `@elevenlabs/react` (runtime) and `tsx` (dev). Do NOT install `@elevenlabs/elevenlabs-js`. Verify React 19 peer compatibility.
- [x] 1.4 Verify the installed `@elevenlabs/react` API surface (provider + hooks the package uses) against the package's assumptions; note any divergence.
- [x] 1.5 Copy package modules into `src/voice/`, `agent/`, `scripts/` (skip `exampleAdapter.ts`, `signedUrlRoute.ts`, `voice-agent.css`, `README.md`); fix import paths.
- [x] 1.6 Write the capability map (real repo symbols backing each kept tool) into `design.md`.
- [x] 1.7 `npm run build` + `npm run test` green; commit.

## 2. Trim + reconcile the tool surface (shared contract — commit before stages 3/5/6)
- [x] 2.1 `toolSchemas.ts`: remove `get_chord_suggestions`, `set_key`, `set_suggestion_mode`; rewrite `randomize_progression` and `analyze_progression`/`get_progression` descriptions to match reality.
- [x] 2.2 `types.ts`: remove `SuggestionMode`; drop `key`/`mode` from `ProgressionSnapshot`; reshape `ProgressionAnalysis` to `{ chords, chordCount, chordTones, voicing }`; remove `CompatibleScale`; drop `setKey`/`setMode`/`getSuggestions` from `ProgressionBridge`; make `play()` return a `PlaybackResult`.
- [x] 2.3 `useProgressionAgentTools.ts`: remove dropped handlers + unused guards/import; keep `reply()` + input guards; surface `bridge.play()` result.
- [x] 2.4 `index.ts`: export `createProgressionBridge` from `./progressionBridge`; drop removed types.
- [x] 2.5 `agent/system-prompt.md`: remove dropped tools; fix randomize wording; correct "always work from the app's analysis" to permit general theory while forbidding fabricated app claims.
- [x] 2.6 `npm run build` + `npm run test` green; commit.

## 3. Real ProgressionBridge adapter + ref-mirror
- [x] 3.1 `src/voice/progressionBridge.ts`: `createProgressionBridge(deps)` returning a `ProgressionBridge`.
- [x] 3.2 `App.tsx`: add `chordsRef`/`instrumentRef`/`activeIndexRef` mirrors + latest-fn refs for randomize/playback; build the bridge once with `useMemo` over stable callbacks.
- [x] 3.3 Map every bridge method to real app behavior (resolve via `lookupChord`; throw on bad chord; piano-only `play`; `randomize` → `randomizeAll`; honest `analyze`).
- [x] 3.4 `npm run build` + `npm run test` green; commit.

## 4. Signed-URL Worker route + secrets
- [x] 4.1 `src/lib/elevenLabsAuth.ts`: `fetchSignedUrl(apiKey, agentId)` via raw `fetch` (verify endpoint via context7).
- [x] 4.2 `worker/index.ts`: `POST /api/voice/signed-url` + `OPTIONS`, mirroring `/api/progression` (CORS, allowlist, 5xx `{ error }` on failure). Extend `Env`.
- [x] 4.3 `.dev.vars` (local) + `.dev.vars.example` (committed): add `ELEVENLABS_API_KEY`, `HH_VOICE_AGENT_ID`.
- [x] 4.4 Test via `wrangler dev` + curl; `npm run build` + `npm run test` green; commit.

## 5. Provision the ElevenLabs agent
- [x] 5.1 Confirm `ELEVENLABS_API_KEY`; run `scripts/provision-voice-agent.ts` (registers the trimmed 9 tools).
- [x] 5.2 Record `HH_VOICE_AGENT_ID` (Worker: `.dev.vars` + `wrangler.jsonc` vars) and `VITE_HH_VOICE_AGENT_ID` (client: `.env` + `.env.example`).
- [x] 5.3 Leave the agent LLM on its configured default.

## 6. Mount provider + panel, restyle
- [x] 6.1 `App.tsx`: wrap builder in `<VoiceAgentProvider>` (bridge, agentId, signedUrlEndpoint); render `<VoiceAgentPanel/>` by the controls.
- [x] 6.2 Verify `@elevenlabs/react` usage against the installed version (handler result types; `onMessage` payload).
- [x] 6.3 Restyle `VoiceAgentPanel.tsx` to Tonari semantic tokens (Tailwind layout + inline `style={{}}`); delete the `voice-agent.css` import; keep `prefers-reduced-motion`.
- [x] 6.4 `npm run build` + `npm run test` green; commit.

## 7. Playwright verification
- [x] 7.1 Drive `wrangler dev` build: panel renders beside controls (desktop), idle state uses gold/warm tokens, 375px reflow, connecting-state transition + signed-URL fetch attempt.
- [x] 7.2 Regression: `Cmaj7 Am9 Dm7 G7` still renders cards; `npm run test:e2e` green; commit.

## 8. Close-out
- [x] 8.1 Full code review of touched + indirectly-affected files; fix criticals.
- [x] 8.2 Apply spec delta to `openspec/specs/voice-companion/spec.md`; archive the change.
- [x] 8.3 Dated entry in `docs/long_horizon_log.md`; reconcile `docs/long_horizon_plan.md`.
