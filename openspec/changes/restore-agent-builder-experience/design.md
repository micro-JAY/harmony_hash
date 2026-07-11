## Context

The checked-in Worker still imports `@anthropic-ai/sdk`, requires `ANTHROPIC_API_KEY`, reports Anthropic-specific health, and calls `claude-opus-4-7`. No OpenAI migration exists in any local or remote Git ref; the referenced earlier task is not available in Codex history. Production now has an `OPENAI_API_KEY` binding, but the active code cannot consume it.

The voice path is independent. The Worker has the required ElevenLabs key and agent id, and the browser correctly requests `/api/voice/signed-url`. The live agent, however, currently has `enable_auth: false` with an origin allowlist while the app exclusively uses signed-URL authentication. That contract mismatch prevents the intended connection path. The live agent also has a customized name and voice that should not be overwritten as collateral damage.

The current app inserts a 281px idle voice card between its action controls and chord cards. On a 375px viewport the Progression Agent textarea and fixed-width submit button are squeezed side by side, and the header forces the document to 508px wide. The change must preserve Tonari styling, the existing progression bridge/ref-mirror architecture, and the nine-tool voice surface.

## Goals / Non-Goals

**Goals:**

- Restore progression generation with the OpenAI Responses API and the already-configured Worker secret.
- Preserve `/api/progression`, `/api/health`, the 500-character input cap, the 3–8 chord output range, CORS behavior, and shared dictionary validation.
- Make provider/tool failures bounded, observable server-side, sanitized client-side, and covered by deterministic tests.
- Restore ElevenLabs signed-URL connectivity without replacing the live agent's customized identity or voice.
- Keep voice client tools registered while making the idle companion compact and explicitly expandable.
- Remove mobile overflow and restore the visual reading order from active input to actions to chord output.

**Non-Goals:**

- Changing the public API routes, chord dictionary, progression bridge, or nine voice tools.
- Adding streaming, multi-turn text chat, user accounts, or a new persistence layer.
- Replacing ElevenLabs with OpenAI Realtime or changing the companion's live voice/model as part of the auth repair.
- Removing the old Anthropic production secret before the OpenAI deployment is proven stable.

## Decisions

### D1 — OpenAI Responses API with a pinned mini snapshot

Use the official `openai` JavaScript SDK and `gpt-5.4-mini-2026-03-17` with low reasoning effort. The model supports Responses, function calling, and structured output while keeping an interactive builder request faster and less expensive than a flagship model. Pinning the snapshot avoids silent behavior drift; changing models remains an intentional code change.

Alternatives considered:

- `gpt-5.6` / `gpt-5.6-terra`: stronger, but unnecessary cost and latency for a short, dictionary-constrained task.
- Raw `fetch`: smaller Worker bundle, but duplicates request/response/error typing already provided by the official SDK.
- Chat Completions: supported, but Responses is the current recommended surface for reasoning and tool loops.

### D2 — Strict lookup tool plus authoritative final validation

Define `lookup_chord` as a strict Responses function (`additionalProperties: false`, all properties required). Preserve every `response.output` item before appending call-id-matched `function_call_output` items, including reasoning items required by GPT tool loops. Allow parallel lookups so all candidate chords can be checked in one turn.

The final structured output uses a JSON schema for `{ chords, key, rationale }`, but `parseAndValidateProgression` remains authoritative: it enforces 3–8 non-empty chord names and re-checks every final chord against the shared dictionary. Tool calls improve model correction; server validation is the security/correctness boundary.

### D3 — Bounded failures and provider-neutral client behavior

Keep the eight-turn convergence cap and add a 30-second deadline to both Worker/provider work and the browser request. Map bad input to 400, disallowed origins to 403, missing configuration to 500, upstream OpenAI failures to 502, and timeouts/non-convergence to 504. Log provider detail server-side after secret redaction; return concise retryable messages to the client.

`/api/health` remains a 200 response but reports OpenAI readiness consistently with the client schema. The progression UI preserves prior chord cards when a new generation fails and exposes retry without leaving an indefinite loading state.

### D4 — Signed URL remains the sole production voice auth mode

Keep the server-minted signed URL architecture. Update the live agent to `enable_auth: true` with an explicit empty allowlist, matching the source contract. Refactor provisioning into a full create payload and a narrow update payload: updates refresh the source-owned prompt, tools, and auth while preserving the existing live name, voice, TTS model, and other user customizations.

Alternatives considered:

- Switch the browser to a public agent id plus origin allowlist: simpler, but exposes a reusable id-only connection path and contradicts the existing server-auth design.
- Recreate the agent: unnecessary and would lose live identity/history/configuration.

### D5 — Always-mounted compact companion in one action toolbar

Keep `VoiceAgentProvider`, `VoiceAgentPanel`, and `useProgressionAgentTools` mounted across input-mode changes. Make the panel collapsed by default, showing only label/status and an explicit expand control; expanded orb, transcript, error, and connect/end controls render only after user action. A live session continues if the panel is collapsed.

Place the compact panel in one responsive toolbar with Randomize and piano Play/Stop. Chord cards follow this toolbar immediately. This removes the large idle block without unregistering tools or moving state into a new store.

### D6 — Responsive fixes use existing tokens and component structure

Stack Free Input and Progression Agent input/button rows below the existing mobile breakpoint, let header controls wrap, and remove the invalid SVG `height="auto"` attribute in favor of CSS sizing. No new color, type, spacing, or motion token is required.

## Risks / Trade-offs

- **OpenAI model access differs by project tier** → exercise one live request before deployment; a model-access error remains a 502 and the model constant can be deliberately changed if needed.
- **Structured output and tool calls can still fail to converge** → retain the eight-turn cap, strict schemas, final dictionary validation, deterministic mocked tests, and retry UI.
- **Partial ElevenLabs PATCH semantics could retain stale nested fields** → explicitly send `auth.allowlist: []`, re-fetch the agent after provisioning, and assert auth/tool names before live mic testing.
- **Collapsing the panel can hide a live transcript** → keep status visible in the compact row and keep the session/runtime mounted.
- **A production deploy updates code and assets together** → build/test locally, upload a version, smoke its preview, then deploy that exact version; retain the prior deployment for rollback.

## Migration Plan

1. Commit OpenSpec artifacts on `fix/agent-builder-companion-ui`.
2. Replace the Anthropic Worker/client path with OpenAI, update dependencies/docs, and add deterministic provider/client tests.
3. Run build, lint, Vitest, Playwright agent-flow interception, and a local Worker smoke using the gitignored OpenAI key.
4. Commit the progression milestone, upload a preview Worker version, verify health plus representative progression prompts, and deploy that exact version.
5. Refactor the ElevenLabs provisioning update payload and compact companion UI; add voice route/panel tests and responsive assertions.
6. Commit the voice/UI milestones, run the full verification gate, partially update the existing live agent, re-fetch its safe config, and test a real connect/disconnect plus one client-tool mutation.
7. Upload and smoke the final Worker/assets version, deploy it, and verify production through the browser. Roll back to the previous version if the public smoke fails.

## Open Questions

None blocking. The missing earlier migration task supplied no recoverable model or API decision, so this design records the current decision explicitly.
