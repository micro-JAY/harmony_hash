## Why

The voice companion's Hanz Hasher identity conflicts with the Harmony Hash product voice, and its prompt frequently turns concise requests into broad explanations, extra offers, or follow-up questions. Musicians need a focused companion that answers the request they made and expands only when asked.

## What Changes

- Rename the OpenAI Realtime and visible voice companion identity to **Harmony**.
- Tighten the source prompt: after one short initial greeting, answer only the asked question or requested action; do not volunteer capabilities, adjacent topics, suggestions, or follow-up questions unless necessary to resolve ambiguity.
- Update the UI, localization, Realtime session expectations, smoke checks, and tests to use Harmony consistently.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `voice-companion`: The companion's identity and response-boundary behavior change, including the Realtime session configuration and visible panel identity.

## Impact

- `src/voice/hanzSystemPrompt.ts`, the OpenAI Realtime session configuration, voice-panel copy, localization, tests, and smoke checks.
- No tool-surface, authentication, or timeline-mutation behavior changes.
