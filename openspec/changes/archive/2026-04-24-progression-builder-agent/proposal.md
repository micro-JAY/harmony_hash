## Why

The current Progressions tab requires users to choose from a fixed preset library, forcing them to think in music-theory terms ("I V vi IV in C major") before they can get a progression. Musicians often know the *feeling* they want ("melancholic jazz in minor") long before they know the exact harmonic structure. An AI-powered Progression Builder closes that gap by translating natural language into a validated 4-chord progression that flows into the exact same chord-card UI as manual input.

## What Changes

- Add a Cloudflare Worker at `/api/progression` that runs an Anthropic-powered tool loop to translate a user's natural-language prompt into a validated 4-chord progression.
- Introduce a `lookup_chord` agent tool that verifies every chord against the harmony_hash chord dictionary before Claude finalizes the output, with automatic fallback to the closest valid substitute.
- Extract the chord lookup logic into a shared module (`src/lib/chordLookup.ts`) importable from both the React app and the Worker runtime.
- Replace the Progressions tab's preset-only view with a new `ProgressionAgent` component: natural-language textarea + "Build progression" button, with the existing preset browser preserved as a collapsible "Or pick a preset" fallback.
- Display the agent's rationale ("Claude chose these because…") as a subtitle above the rendered chord cards.
- Add fetch client (`src/lib/progressionClient.ts`) that switches endpoint between localhost Worker (dev) and production route.
- Update `wrangler.jsonc` to bind the Worker entry point and wire the `ANTHROPIC_API_KEY` secret. Document secret management in `worker/README.md`.

## Capabilities

### New Capabilities
- `progression-agent`: Natural-language → validated 4-chord progression flow, including the client UI, fetch wrapper, Cloudflare Worker endpoint, Anthropic tool loop, chord-dictionary verification tool, input/output validation, iteration cap, and CORS policy.

### Modified Capabilities
- `progression-input`: Progressions tab now hosts the agent UI as the primary surface; the preset browser becomes a secondary "Or pick a preset" section. The `onResult` callback contract is unchanged — both flows produce the same `DisplayChord[]` shape.

## Impact

- **New files:** `worker/index.ts`, `worker/tsconfig.json`, `worker/README.md`, `worker/.dev.vars.example`, `src/lib/chordLookup.ts`, `src/lib/progressionClient.ts`, `src/components/ProgressionAgent.tsx`.
- **Modified files:** `wrangler.jsonc` (add Worker entry + compatibility), `src/components/ProgressionInput.tsx` (progressions tab layout), `package.json` (add `@anthropic-ai/sdk` dependency for the Worker), `.gitignore` already covers `.dev.vars*`.
- **New dependency:** `@anthropic-ai/sdk` for the Worker runtime.
- **New secret:** `ANTHROPIC_API_KEY` stored as a Cloudflare Worker secret (production) and `.dev.vars` (local, gitignored).
- **Existing behavior unaffected:** Free Input tab, chord card rendering, variant/lock/randomize controls, Chord Reference Grid, instrument toggle, and the preset browser logic all remain byte-for-byte identical. The chord-data lookup API stays backward compatible.
- **Cost/latency:** Each agent request costs Anthropic tokens (cap: 8 tool-loop iterations × ~1024 output tokens). Expect 3–10s latency for the user-facing loading state.
