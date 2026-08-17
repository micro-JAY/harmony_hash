## Why

The Progression Builder currently treats every prompt as a fresh generation, so a musician cannot ask it to make a targeted change to the timeline they are already shaping. Distinct modify and re-run actions make iteration explicit: preserve the current progression when refining it and replace it only when starting over.

## What Changes

- Add a **Modify** action beside the builder prompt. It sends the current timeline and the user's requested change to the progression agent, then replaces the timeline only with the validated edited result.
- Rename the existing generation action to **Re-run**. It deliberately generates a new progression from the prompt without using the current timeline as editing context.
- Extend the progression API request contract to accept an optional, validated existing progression for modification mode and instruct the agent to return the complete edited timeline.
- Keep request cancellation, stale-response protection, chord-dictionary verification, rationale display, and mobile control reflow intact for both actions.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `progression-agent`: The natural-language agent can edit a supplied existing timeline as well as generate a new one, with validated API input and explicit client actions.
- `progression-input`: The Progressions prompt surface exposes responsive Modify and Re-run controls with clearly distinct timeline behavior.

## Impact

- **Client:** `src/components/ProgressionAgent.tsx`, `src/components/ProgressionInput.tsx`, and `src/lib/progressionClient.ts`.
- **Worker:** `worker/index.ts` and `worker/progressionAgent.ts` accept and contextualize an existing chord sequence.
- **Tests:** client, worker, and component coverage verifies request shape, target-edit context, and replacement behavior.
- **No new dependencies or secrets.** The existing OpenAI tool loop and shared chord dictionary remain the authority for returned chord names.
