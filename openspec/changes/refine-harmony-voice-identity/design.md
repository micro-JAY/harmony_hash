## Context

The OpenAI Realtime companion is source-configured through `src/voice/hanzSystemPrompt.ts` and its session configuration, while its visible name is localized in the mounted panel and fallback. Its current prompt encourages broad co-writing, capability offers, and depth-check questions after a response.

## Goals / Non-Goals

**Goals:**

- Make the Realtime and visible identity Harmony.
- Keep the first greeting brief, then constrain every later turn to the direct answer or requested action.
- Preserve tool grounding, safety, and the existing nine-tool contract.

**Non-Goals:**

- Change the provider, tools, voice, signed-URL authentication, or timeline semantics.
- Remove internal Hanz-named implementation identifiers that do not reach users.

## Decisions

### D1 — Explicit one-time greeting and turn boundary

The prompt identifies the companion as Harmony and permits one concise opening greeting. Every subsequent turn must answer only the request, with no unsolicited explanation, capability inventory, alternatives, or closing question. A question remains allowed only when it is necessary to perform an ambiguous requested action.

### D2 — Identity updates source and product surfaces

The Realtime greeting and instructions identify the companion as Harmony, and every user-visible panel, accessible label, transcript speaker label, error, tour, and smoke expectation changes from Hanz Hasher/Hanz to Harmony. Internal state identifiers remain stable to avoid unrelated bridge churn.

## Risks / Trade-offs

- [Model still expands an answer] → Use short, repeated prompt rules with concrete prohibited patterns and source-prompt tests.
- [Realtime session retains its prior identity] → The worker-minted session includes source-owned Harmony instructions and first greeting on every connection.
