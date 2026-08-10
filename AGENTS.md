# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

The workspace-level `../AGENTS.md` defines the Tonari Labs stack and design-system rules and applies here in full. This file only covers what is specific to Harmony Hash.

## Current focus

Harmony Hash has shipped the piano-voicing and learning-suite roadmap: piano/guitar parity, Note Neural Network, Improv Insight, Scale Synthesia, Circle of Fifths, mood filtering, the first-class fretboard, and the OpenAI Realtime voice companion.

The public source of truth now lives in:

- `docs/long_horizon_log.md` — dated decisions, release evidence, blockers, and open questions.
- `openspec/changes/<change-id>/` — active change proposals for in-flight work.
- `openspec/specs/<capability>/spec.md` — canonical capability specs (updated when a change merges).
- `openspec/changes/archive/<date>-<change-id>/` — archived change proposals after merge.

Planning briefs, private milestone plans, and design references under `docs/` are intentionally local-only. They may be consulted when present, but must not be staged.

## Workflow

- **openspec for everything.** Before any code on a milestone (each piano voicing version, each Phase 2 item), create a change proposal at `openspec/changes/<change-id>/`. Minimum contents: `proposal.md` (Why / What Changes / Capabilities / Impact — see archived examples), `tasks.md` (implementation steps), and spec deltas under `specs/<capability>/`. When the PR merges, move the entire change directory to `openspec/changes/archive/<YYYY-MM-DD>-<change-id>/` and apply the spec deltas to the canonical `openspec/specs/<capability>/spec.md`. Subagents follow the same rule — no silent slice work.
- **Branch per feature, never commit to main.** Branch naming: `feat/piano-voicings-v{N}-{short}`, `feat/voice-explore-{slice}`, `feat/note-neural-network-{slice}`, `chore/`, `fix/`, `test/`. One PR per branch.
- **Conventional commits.** `feat(piano):`, `fix(voicing):`, `test(playwright):`, `chore(deps):`, `docs:`. Imperative subject ≤72 chars; body explains *why* when non-obvious.
- **Frequent commits, frequent PRs.** Don't batch a week of work into one PR. Each milestone is its own PR. If a milestone is multi-day, push WIP commits to the feature branch daily so progress is visible even mid-flight.
- **PR description template**: What / Why / Music-theory references (where relevant) / Screenshots (before+after when UI is touched) / Test summary / Risks / Follow-ups.
- **CI must be green before self-merge.** No skips, no `.only`, no `fixme` to escape failing tests. Fix the root cause; if you can't, write a BLOCKER note and move to the next independent milestone.
- **Subagents are fair game** for: parallel investigation, independent branches, large refactors split by directory, broad test sweeps. Spawn them through the agent SDK / Task tool as appropriate.

## Design rules

- **Source of truth**: Tonari Labs design system + this repo's CSS guide + `public/tokens.css`. The workspace-level `../AGENTS.md` binds in full.
- **No AI-slop visuals.** No Inter/Roboto/system-ui defaults. No purple-on-charcoal. No generic gradient + glass-morphism pages. Match the language of components already shipped (current guitar view, chord grid, timeline).
- **Inspiration assets are not design targets.** Local-only material under `docs/inspiration/` is for concepts and information architecture, not styling. Re-skin every borrowed concept into Tonari language.
- **Token discipline.** Before adding a new color/font/spacing value, check `public/tokens.css`. If the token doesn't exist, *extend the file deliberately* with a one-line rationale comment — don't sprinkle one-off values.

## Key public docs

- `docs/hh-library.md` — the progression library and preset catalogue.
- `docs/hh-minor-blend.md` — natural/harmonic minor blending reference used by the app.
- `docs/long_horizon_log.md` — dated decisions and release evidence.
- `docs/hanz-theory-context-architecture.md` — Hanz theory-context architecture.
- `openspec/changes/` — active change proposals.
- `openspec/specs/` — canonical capability specs.
- `openspec/changes/archive/` — completed proposals (reference for proposal structure).

## Hand-off etiquette

If a session ends mid-run, update `docs/long_horizon_log.md` with the current branch, the file being edited, and the next concrete step. A private local plan may supplement the log, but it remains ignored.

## Commands

All commands run from the repo root.

```sh
npm run dev          # Vite dev server (SPA only, no Worker)
npm run build        # tsc -b && vite build → dist/
npm run lint         # eslint .
npm run test         # vitest run
npm run test:watch   # vitest in watch mode
npx vitest run src/lib/harmonyBrain.test.ts   # single test file
npx wrangler dev     # Worker + static assets at http://localhost:8787 (run `npm run build` first)
npx tsx scripts/smoke-voice-agent.ts # live OpenAI WebRTC smoke with synthetic media
npm run deploy       # build, then deploy Worker `harmony` with assets binding
```

CI (`.github/workflows/ci.yml`) runs `npm run build` then `npm run test` on every push.

## Architecture

Harmony Hash is a single deployable unit: a Vite/React SPA served as static assets by a Cloudflare Worker that also exposes a few API routes. The Worker config lives at the repo root (`wrangler.jsonc`); there is no separate Worker package.

### The two halves share code

The Worker (`worker/index.ts`) imports directly from `src/lib/`:

```ts
import { lookupChordForAgent } from "../src/lib/chordLookup";
```

This means the chord dictionary, root normalization, and lookup logic are the **single source of truth for both the browser and the Worker**. When changing anything in `src/lib/chordData.ts`, `src/lib/chordLookup.ts`, or `src/data/chords_clean.json`, you are changing both the SPA's parser and the agent's tool implementation at once. `worker/tsconfig.json` is configured to allow this cross-directory import.

### Request routing

`wrangler.jsonc` uses `run_worker_first: ["/api/*"]` with `not_found_handling: "single-page-application"`. The Worker handles `/api/progression`, `/api/health`, and `/api/voice/client-secret` itself and falls through to `env.ASSETS.fetch(request)` for everything else. SPA client-side routes resolve via the assets binding's SPA fallback.

### Progression agent flow

`POST /api/progression` runs an OpenAI Responses API tool loop (`runProgressionAgent` in `worker/progressionAgent.ts`):

1. Client calls `generateProgression()` in `src/lib/progressionClient.ts` (dev: `http://localhost:8787/api/progression`, prod: relative `/api/progression`).
2. Worker validates the prompt (non-empty, ≤ 500 chars), then loops up to `MAX_ITERATIONS = 8` against the pinned `gpt-5.4-mini-2026-03-17` snapshot with a strict `lookup_chord` function.
3. Every Responses continuation preserves returned message, reasoning, and function-call items before appending call-id-matched outputs from `lookupChordForAgent()`. That shared lookup returns `{ valid, chord_name, suggestion? }`.
4. The model returns a strict 3–8 chord JSON schema. The Worker rejects failed/incomplete provider turns, parses the final text, and runs `parseAndValidateProgression()`. Every final chord is re-checked against the dictionary, and an unverified chord causes a 500. The client validates the response shape again before handing it to the UI.
5. The client (`ProgressionAgent.tsx`) feeds the returned chord names through `lookupChord()` to produce the same `IndexedChord` objects the manual input path produces, so downstream rendering is identical for both entry paths.

Error contract: 400 (bad input), 403 (CORS origin), 500 (config / validation), 502 (provider failure), 504 (deadline / non-convergence).

### Chord rendering pipeline

`src/lib/harmonyBrain.ts` is the music-theory engine. Manual input flows: `parseChordInput()` (in `harmonyBrain.ts`) → `lookupChord()` (in `chordData.ts`) → `IndexedChord` objects → `ChordCard` → `GuitarChordDiagram` (SVG variants from `public/music_src/`) or `PianoKeyboard` (Drop 2 voicing computed in `harmonyBrain.ts`). Internal note encoding uses `s`/`f` for sharp/flat (e.g. `Cs`, `Ef`) — display formatting happens at the edge via `formatNoteForDisplay()` and `prefersFlatNotation()`.

### Voice companion (`src/voice/`)

A source-owned OpenAI Realtime voice companion — a voice-native sibling of the text progression agent. A musician talks through what they want (the companion builds/edits the timeline) and asks for the theory behind it. The browser uses WebRTC for audio and drives the builder through the exact nine local tools. Canonical spec: `openspec/specs/voice-companion/spec.md`.

- **Bridge over a ref-mirror, not a store.** `src/voice/progressionBridge.ts` (`createProgressionBridge(deps)`) implements the `ProgressionBridge` contract (`src/voice/types.ts`). `App.tsx` builds it **once** (`useMemo`) over refs that mirror `chords` / `instrument` / `activeChordIndex` plus the `randomizeAll` / playback closures (updated in a no-deps effect), so Realtime tool calls — which fire *outside* React's render cycle — always read fresh state. Don't lift the progression into Zustand for this; the ref-mirror is the deliberate, low-blast-radius choice. (It carries the repo's only `eslint-disable` — a reasoned `react-hooks/refs` suppression, since the rule can't see that the ref reads are deferred to callback time.)
- **Tool surface = 9 client tools**, defined once in `src/voice/toolSchemas.ts`, converted to strict Realtime function definitions by `src/voice/realtimeSessionConfig.ts`, and executed by `src/voice/progressionAgentTools.ts`. Those files and `src/voice/hanzSystemPrompt.ts` must always agree on the same names. The agent only gets what the app genuinely backs — there are **no** key-setting, suggestion-mode, or next-chord tools, because `harmonyBrain.ts` does not detect keys, derive numerals, rank scales, or suggest next chords. `analyze_progression` returns chord symbols + tones (`parseNotes`) + the voice-led voicing (`computeVoiceLedProgression`) only; the system prompt forbids the agent claiming the app computed a key/numerals/scales. `randomize_progression` reshuffles existing voicings/variants — it does not generate chords.
- **Client-secret auth.** `POST /api/voice/client-secret` (in `worker/index.ts`, backed by `src/lib/openAIRealtimeAuth.ts`) mints a short-lived credential for one fixed 300-second session. The endpoint accepts an empty body only, keeps the standard API key server-side, and preserves required Origin admission, a dedicated rate limiter, sanitized provider failures, and `no-store` responses. The agent highlight (`highlightedChordIndex` in `App.tsx`) is kept **separate** from the `activeChordIndex` playback cursor — don't merge them.
- **Provider/panel.** `src/voice/openAIRealtimeSession.ts` owns the WebRTC peer, remote audio, data channel, monotonic deadline, and cleanup. `src/voice/VoiceAgentProvider.tsx` and `src/voice/voiceAgentContext.ts` adapt that transport into React state and the validated tool/transcript coordinator. `VoiceAgentPanel.tsx` is permanently mounted in the action toolbar but collapsed by default; hiding its orb/transcript/controls must never end or unmount a connected session. It is styled with inline CSS-variable tokens — no per-component stylesheet.

## Worker configuration

Both `.dev.vars` and `wrangler.jsonc` live at the **repo root** (not in `worker/`).

- `OPENAI_API_KEY` — required for both the progression builder and Hanz client-secret route. Local: repo-root `.dev.vars` (gitignored). Prod: `npx wrangler versions secret put OPENAI_API_KEY`. **Worker/CLI only — never a `VITE_`-prefixed variable or committed file.**
- `ALLOWED_ORIGIN` — optional comma-separated additive origin allowlist; supports `*`. The canonical production origin is built in, and localhost origins are accepted only when the Worker itself is local.

See `worker/README.md` for full deploy/secrets details and curl examples.

## Project conventions specific to this repo

- **Tailwind is present and used for layout** (flex/grid/spacing), but **all colors, typography, motion, and surfaces come from semantic CSS variables** via inline `style={{}}` (see `App.tsx`). Don't introduce new Tailwind color utilities — extend the design-system tokens or use existing ones.
- The codebase uses TypeScript strict mode plus `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. Type-only imports must use `import type`.
- `openspec/` contains spec-driven artifacts for features; check `openspec/specs/<capability>/spec.md` for the canonical requirements before changing a capability (e.g. `progression-agent`, `harmony-brain`, `chord-data`).
- `initial_data/` holds source material (raw chord JSON, reference SVGs, design notes) and is not shipped — the runtime data lives in `src/data/` and `public/music_src/`.
