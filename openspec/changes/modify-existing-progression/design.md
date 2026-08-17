## Context

`ProgressionAgent` currently sends only the prompt to `/api/progression`, and the Worker always asks the OpenAI loop to create a new 3–8 chord progression. The rendered timeline already provides resolved chord symbols and mutation/version guards, so it can safely supply the agent's edit context without introducing a second timeline store.

## Goals / Non-Goals

**Goals:**

- Make a targeted natural-language edit apply to the current resolved timeline.
- Make starting over an explicit Re-run action that does not include current-timeline context.
- Preserve the existing client timeout, request abortion, stale-response checks, dictionary validation, and output path.
- Keep both controls usable at narrow widths and distinguish Modify using existing academy status tokens.

**Non-Goals:**

- Multi-turn chat history, streaming, direct manipulation of individual card variants, or changes to the manual composer.
- Introducing a separate endpoint, new provider tools, new dependencies, or mutable state outside the application-owned timeline.

## Decisions

### D1 — One endpoint, optional validated edit context

The existing `/api/progression` endpoint accepts an optional `existingChords` array alongside `prompt`. Its absence remains the Re-run contract; its presence selects edit mode. The Worker validates every supplied chord against the shared dictionary before invoking OpenAI, so untrusted request data cannot become a false timeline context.

Alternative considered: a `/api/progression/modify` endpoint. This would duplicate CORS, admission, timeout, and error handling without adding a distinct security boundary.

### D2 — Modify returns a complete replacement, at the current timeline length

The Worker embeds the ordered existing chord names and the requested change into the model input, then requires the structured response to contain exactly the existing number of chords. The client uses the existing `onResult` replacement flow only after all returned names resolve. This makes a request such as “change the voicing of the second chord” deterministic at the timeline level and avoids partial or index-based mutations.

Alternative considered: return a patch of chord indexes. That needs a new patch schema and client merge/rollback logic, while the application already has a robust replace-timeline transaction.

### D3 — Timeline is passed as props, not mirrored in component state

`ProgressionInput` derives ordered names from its committed `timeline` and passes them to `ProgressionAgent`. Modify is disabled when no timeline exists; Re-run stays available. Existing timeline and cancellation versions capture the request snapshot and prevent a late result from overwriting a newer edit.

### D4 — Button semantics and tokens are explicit

The original accent action becomes Re-run and invokes the existing no-context generation path. The adjacent Modify action uses `--status-academy-bg`, `--status-academy-text`, and `--status-academy-border`, with the same disabled/loading semantics. The keyboard shortcut continues to invoke Re-run because it is the original build shortcut.

## Risks / Trade-offs

- [Model disregards edit context] → Require the complete timeline and exact count in the structured request and retain server-side chord validation.
- [Timeline changes while a request is running] → Reuse the existing version/cancellation snapshot and AbortController handling.
- [Long manual timeline consumes output tokens] → Bound accepted edit-context chord count to the same supported 3–8 range as the agent response and disable Modify outside that range with truthful accessible help text.
- [Existing timeline contains an unexpected chord] → Reject the API request with 400 before the provider is called.
