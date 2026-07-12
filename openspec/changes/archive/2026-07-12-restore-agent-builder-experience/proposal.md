## Why

The deployed progression builder still runs the retired Anthropic integration and cannot consume the newly configured `OPENAI_API_KEY`, leaving its primary generation flow unavailable. The adjacent Harmony Companion also fails to establish a useful voice session and currently occupies the critical path between input controls and chord output, creating a large empty gap across both builder modes.

## What Changes

- Migrate `/api/progression` from Anthropic Messages to the OpenAI Responses API while preserving the public route, shared chord dictionary, server-side validation, CORS behavior, and retry-friendly error contract.
- Reconcile the progression contract around the already-shipped 3–8 chord range, provider-aware health reporting, bounded requests, and deterministic tests for tool calls and structured output.
- Repair the ElevenLabs signed-URL/session path and surface actionable connection failures without exposing server credentials.
- Separate the Harmony Companion from the input-to-output document flow so an idle or unavailable companion does not reserve a large vertical gap between controls, chord cards, and reference/preset content.
- Polish the Free Input and Progressions panels using the existing Tonari tokens, responsive layout rules, and preserved input/preset behavior.
- Update operator documentation, examples, and run logs to reflect OpenAI and the repaired voice workflow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `progression-agent`: Replace the Anthropic-specific agent loop and secret contract with OpenAI Responses API tool calling, provider-aware health, a 3–8 chord output contract, bounded requests, and deterministic validation.
- `voice-companion`: Require reliable signed-URL session startup, actionable error states, and a compact placement that does not disrupt the builder’s primary reading order.
- `progression-input`: Preserve both input modes while keeping generated chord output immediately adjacent to the active controls and moving companion UI out of the preset/output separation.
- `app-shell`: Refine the top-to-bottom page structure so optional companion controls do not interrupt the input-to-output flow across desktop and mobile layouts.

## Impact

- Worker/API: `worker/index.ts`, provider dependencies, environment typing, health payload, and deployment documentation.
- Client: `src/lib/progressionClient.ts`, progression UI state/error handling, `src/components/ProgressionAgent.tsx`, `src/components/ProgressionInput.tsx`, and `src/App.tsx`.
- Voice: `src/voice/`, ElevenLabs provisioning/auth verification, and voice-panel placement/state.
- Verification: new provider/client unit tests, expanded Playwright coverage for both tabs and the companion, live Worker health/generation checks, and responsive screenshots.
- Operations: `OPENAI_API_KEY` remains Worker-only; `ELEVENLABS_API_KEY` remains Worker-only; no public API route is renamed.
