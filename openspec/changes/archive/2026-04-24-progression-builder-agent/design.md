## Context

`harmony_hash` is a Vite + React + TypeScript SPA deployed as a Cloudflare Worker with static assets (`wrangler.jsonc` already configured for `assets.directory: ./dist`). The existing Progressions tab lives inside `src/components/ProgressionInput.tsx` and exposes a roman-numeral preset library transposed into 12 keys. Chord lookups all go through `lookupChord()` in `src/lib/chordData.ts`, which drives a precomputed index over `src/data/chords_clean.json`.

This change introduces a Cloudflare Worker backend for the first time in the project. The Worker calls the Anthropic Messages API with a `lookup_chord` tool; Claude iteratively verifies each chord against our dictionary before finalizing a 4-chord JSON response. The tool loop was prototyped in the Anthropic Workbench and produced consistent output on a battery of adversarial prompts.

Stakeholders: end users (musicians using harmony_hash on harmony.tonari.ai), operators (ANTHROPIC_API_KEY cost and latency), developers (must keep Free Input untouched).

## Goals / Non-Goals

**Goals:**
- Translate free-form natural-language prompts into a validated 4-chord progression with identical downstream rendering to the Free Input flow.
- Guarantee every returned chord exists in the harmony_hash dictionary via server-side verification before the UI sees the response.
- Keep the Worker and the app sharing a single chord-lookup source of truth (no drift).
- Preserve the existing preset browser as a secondary surface on the Progressions tab — do not delete it.
- Protect against runaway token spend with a hard iteration cap.
- Keep `ANTHROPIC_API_KEY` out of the repo via Cloudflare secrets and a gitignored `.dev.vars`.

**Non-Goals:**
- Streaming partial results to the UI (a final JSON object is sufficient for v1).
- Supporting variable chord counts; output is always exactly 4 chords.
- Multi-turn chat (user refines result via new prompt, not conversation).
- Caching of identical prompts (can be added later if volume justifies).
- Changing the Free Input parser or the chord-card UI.
- Authentication or rate-limiting in v1 (CORS-restricted origin is our only gate).

## Decisions

### D1 — Single Worker in the existing `harmony` Cloudflare binding
**Decision:** Add `main` and `compatibility_date` to the existing `wrangler.jsonc` and route `/api/progression` inside the Worker. Static assets continue to serve via `assets.directory: ./dist`.
**Alternatives considered:** (a) Deploy a standalone Worker under a different domain (more CORS complexity, two deploy pipelines); (b) keep the app on Pages and add a separate Worker (increases surface area).
**Rationale:** One deploy, no CORS in production (same origin), minimal diff to `wrangler.jsonc`.

### D2 — Shared lookup module via `src/lib/chordLookup.ts`
**Decision:** Extract a thin, pure lookup layer that imports `chords_clean.json` directly and exposes `lookupChordForAgent(name): { valid, chord_name, suggestion? }`. The existing `chordData.ts` continues to re-export `lookupChord` for the app. The Worker imports `lookupChordForAgent` only.
**Alternatives considered:** (a) Let the Worker import `chordData.ts` wholesale — pulls in DOM-adjacent helpers and SVG-path logic the Worker does not need; (b) maintain two copies — drift risk.
**Rationale:** One source of truth, minimal Worker bundle, clean bundler boundary.

### D3 — Suggestion strategy: strip quality suffixes one at a time
**Decision:** On lookup miss, try removing the last token of the quality suffix until a match is found (e.g. `Caug7` → `C7` → `Caug` → `C`). Return the first hit as `suggestion`.
**Alternatives considered:** (a) Levenshtein over the index keys — noisy, can return musically unrelated chords; (b) embedding-based similarity — overkill for four chords.
**Rationale:** The chord-data vocabulary is small and structured — simplification almost always lands on a valid substitute (e.g. `Caug7` → `C7`) that preserves the root.

### D4 — Tool loop skeleton with 8-iteration hard cap
**Decision:** Iterate on `messages.create` responses while `stop_reason === "tool_use"`. On `end_turn`, parse the first text block as JSON and validate. Any other `stop_reason` is an error. After 8 iterations without `end_turn`, return HTTP 504 `"Agent did not converge"`.
**Alternatives considered:** (a) Infinite loop with timeout — token-cost risk; (b) 16+ iterations — Workbench runs converge in ≤5; 8 is a generous cap.
**Rationale:** The loop terminates on every tested prompt in far fewer than 8 rounds. The cap is a backstop, not a budget.

### D5 — Strict output validation on the Worker
**Decision:** Before returning 200, the Worker parses and validates: JSON shape, `chords.length === 4`, every `chords[i]` is a string, `key` and `rationale` are non-empty strings. Failure → HTTP 500 with error details.
**Rationale:** The UI trusts the Worker. Pushing validation into the Worker removes a class of defensive code from the client and surfaces issues during deploy tests, not in prod.

### D6 — CORS via origin env config
**Decision:** Worker reads `env.ALLOWED_ORIGIN` (defaulting to `*` when missing in dev). In production, this is set to `https://harmony.tonari.ai`. Local dev uses `http://localhost:5173` (Vite default).
**Alternatives considered:** Hardcoded `*` — acceptable in v1 since no auth exists, but env-gated is trivial insurance against future misuse.
**Rationale:** Zero-cost future-proofing. The `/api/progression` path is the only non-static route; static assets ignore CORS.

### D7 — Endpoint selection on the client
**Decision:** `progressionClient.ts` uses `import.meta.env.DEV` to pick `http://localhost:8787/api/progression` (local `wrangler dev`) vs `/api/progression` (same-origin in prod/preview).
**Rationale:** Vite's `DEV` flag is tree-shaken out of prod bundles, so no production bundle ships a localhost URL.

### D8 — System prompt and tool definition pinned verbatim
**Decision:** The system prompt and `lookup_chord` tool schema from the prompt blueprint are embedded as string constants in `worker/index.ts` and not made configurable. Any future iteration requires an intentional code change.
**Rationale:** Prompt drift is a classic source of silent regression. Locking the exact Workbench-validated prompt is the cheapest way to keep production behavior stable.

### D9 — Model: `claude-opus-4-7`
**Decision:** Use `claude-opus-4-7` for max tool-calling fidelity. `max_tokens: 1024` for the final message (enough for the JSON + rationale, small enough to cap runaway generations).
**Alternatives considered:** `claude-sonnet-4-6` — faster and cheaper; may be revisited if Opus cost is problematic.
**Rationale:** Tool-loop reliability matters more than latency for a batch-style "one progression per click" flow, and Opus is proven in the Workbench. Easy to swap later.

### D10 — Rationale displayed as a subtitle, not in a card
**Decision:** Render the agent's `rationale` as a single paragraph above the chord cards, styled with `--text-secondary` and `--font-body`. Do not inject it into `DisplayChord`.
**Rationale:** Keeping `DisplayChord` unchanged means the cards code stays identical to the Free Input flow — the rationale is a side-channel piece of UI state owned by `ProgressionAgent`.

## Risks / Trade-offs

- **Risk:** Anthropic API latency spikes bleed into user-facing loading state.
  **Mitigation:** Render a spinner + animated shimmer with "Building progression…"; set a client-side 30s timeout; surface any HTTP 504 clearly.
- **Risk:** `ANTHROPIC_API_KEY` accidentally committed.
  **Mitigation:** `.dev.vars*` already in `.gitignore`; document `wrangler secret put ANTHROPIC_API_KEY` in `worker/README.md`; only commit `.dev.vars.example` with empty placeholder.
- **Risk:** Claude occasionally emits non-JSON prose despite the system prompt.
  **Mitigation:** Worker-side validation returns HTTP 500 with the raw text for observability; UI shows "Agent couldn't generate a valid progression, try rephrasing."
- **Risk:** Tool loop fails on an adversarial prompt and hits the iteration cap.
  **Mitigation:** 8-iteration cap returns HTTP 504 `"Agent did not converge"`; user sees a retry-friendly error; server logs the prompt for prompt-tuning iteration.
- **Risk:** Shared `chordLookup.ts` becomes a coupling hotspot.
  **Mitigation:** Keep its API surface minimal (one function). Any additional Worker-side logic lives in `worker/` helpers, not in the shared module.
- **Risk:** CORS misconfiguration in prod silently breaks the feature.
  **Mitigation:** `/api/progression` is same-origin in production (behind `harmony.tonari.ai`), so CORS only matters for dev. Dev `ALLOWED_ORIGIN` defaults to `*`.
- **Trade-off:** Cost per click is variable (depends on iteration count). Acceptable at launch volumes; add per-user/IP rate limiting if abuse emerges.
