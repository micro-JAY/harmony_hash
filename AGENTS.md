# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

The workspace-level `../AGENTS.md` defines the Tonari Labs stack and design-system rules and applies here in full. This file only covers what is specific to Harmony Hash.

## Current focus

Harmony Hash is mid–long-horizon run on the **Piano Voicing Roadmap (v1 → v5)** followed by an **inspiration-led Phase 2 feature wave** (piano view feature parity with guitar, Note Neural Network, Improv Insight, Scale Synthesia, Circle of Fifths, mood/genre filtering, guitar fretboard as first-class view).

The contract for this run is in `docs/long_horizon_prompt.md`. Re-read it whenever you resume. **The canonical v1–v5 spec lives in `docs/inspiration/README.md`** under the "Piano Voicing — Roadmap" heading at the bottom. The README is tracked in the repo; the screenshots alongside it are gitignored (local-only reference). v1 (Drop 2 voicing) is already shipped in `src/lib/harmonyBrain.ts` and `src/components/PianoKeyboard.tsx`.

A user-directed **voice companion** (a real-time ElevenLabs voice agent under `src/voice/`) also shipped as a side-track *outside* this roadmap — see the 2026-05-25 `docs/long_horizon_log.md` entry, the `voice-companion` capability spec, and the "Voice companion" architecture section below.

Live state of the run lives in:

- `docs/long_horizon_plan.md` — milestones, branches, PR links, status (Done / In Progress / Blocked / Cancelled).
- `docs/long_horizon_log.md` — dated entries: decisions made, rationale, blockers, open questions.
- `openspec/changes/<change-id>/` — active change proposals for in-flight work.
- `openspec/specs/<capability>/spec.md` — canonical capability specs (updated when a change merges).
- `openspec/changes/archive/<date>-<change-id>/` — archived change proposals after merge.

Reconcile `_plan` and `_log` on every milestone boundary. Don't let them drift out of sync.

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
- **Inspiration assets are not design targets.** `docs/inspiration/` (gitignored) contains reference imagery for *concepts and IA*, not styling. Re-skin every borrowed concept into Tonari language. Detail in `docs/inspiration/README.md`.
- **Token discipline.** Before adding a new color/font/spacing value, check `public/tokens.css`. If the token doesn't exist, *extend the file deliberately* with a one-line rationale comment — don't sprinkle one-off values.

## Key docs (paths)

- `docs/long_horizon_prompt.md` — the contract for this run (read first when resuming).
- `docs/long_horizon_plan.md` — milestone tracker.
- `docs/long_horizon_log.md` — dated decisions + blockers.
- `docs/long_horizon_summary.md` — end-of-run ledger (write last).
- `docs/inspiration/README.md` — feature → screenshot map AND the canonical Piano Voicing Roadmap (v1–v5 at the bottom of that file). Folder is gitignored, local-only.
- `docs/hh-library.md` — the project's progression library (Roman numeral catalogue).
- `docs/hh-minor-blend.md` — natural/harmonic minor blending notes.
- `openspec/changes/` — active change proposals.
- `openspec/specs/` — canonical capability specs.
- `openspec/changes/archive/` — completed proposals (reference for proposal structure).

## Hand-off etiquette

If a session ends mid-run, leave `docs/long_horizon_log.md` updated to the current minute. The next session should be able to read just `long_horizon_prompt.md` + `long_horizon_plan.md` + the last `long_horizon_log.md` entry and resume cleanly. If you finish a milestone, append a "Done" line. If you're mid-implementation, append a "Current state" line that names the branch, the file you were editing, and the next concrete step.

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
npm run deploy       # build, then deploy Worker `harmony` with assets binding

# Voice companion: create/update the ElevenLabs agent from agent/system-prompt.md
# + the trimmed tool set. Needs ELEVENLABS_API_KEY; prints the agent id. Re-run
# after editing the prompt or src/voice/toolSchemas.ts.
ELEVENLABS_API_KEY=sk_... HH_ALLOWED_HOSTS=harmony.tonari.ai,localhost \
  npx tsx scripts/provision-voice-agent.ts
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

`wrangler.jsonc` uses `run_worker_first: ["/api/*"]` with `not_found_handling: "single-page-application"`. The Worker handles `/api/progression`, `/api/health`, and `/api/voice/signed-url` itself and falls through to `env.ASSETS.fetch(request)` for everything else. SPA client-side routes resolve via the assets binding's SPA fallback.

### Progression agent flow

`POST /api/progression` runs an Anthropic Messages API tool loop (`runAgent` in `worker/index.ts`):

1. Client calls `generateProgression()` in `src/lib/progressionClient.ts` (dev: `http://localhost:8787/api/progression`, prod: relative `/api/progression`).
2. Worker validates the prompt (non-empty, ≤ 500 chars), then loops up to `MAX_ITERATIONS = 8` against `Codex-opus-4-7` with the `lookup_chord` tool.
3. The system prompt **requires** Codex to call `lookup_chord` for every chord before finalizing. Tool calls are answered by `lookupChordForAgent()`, which returns `{ valid, chord_name, suggestion? }` from the same dictionary the SPA uses.
4. On `end_turn`, the Worker parses the assistant's final text as JSON and runs `parseAndValidateProgression()`. This is **defense-in-depth**: even if Codex skips the tool, every final chord is re-checked against the dictionary, and an unverified chord causes a 500. The client (`progressionClient.ts`) then validates the response shape *again* before handing it to the UI.
5. The client (`ProgressionAgent.tsx`) feeds the returned chord names through `lookupChord()` to produce the same `IndexedChord` objects the manual input path produces, so downstream rendering is identical for both entry paths.

Error contract: 400 (bad input), 403 (CORS origin), 500 (config / validation), 504 (agent didn't converge).

### Chord rendering pipeline

`src/lib/harmonyBrain.ts` is the music-theory engine. Manual input flows: `parseChordInput()` (in `harmonyBrain.ts`) → `lookupChord()` (in `chordData.ts`) → `IndexedChord` objects → `ChordCard` → `GuitarChordDiagram` (SVG variants from `public/music_src/`) or `PianoKeyboard` (Drop 2 voicing computed in `harmonyBrain.ts`). Internal note encoding uses `s`/`f` for sharp/flat (e.g. `Cs`, `Ef`) — display formatting happens at the edge via `formatNoteForDisplay()` and `prefersFlatNotation()`.

### Voice companion (`src/voice/`)

A real-time ElevenLabs voice agent — a voice-native sibling of the text progression agent. A musician talks through what they want (the companion builds/edits the timeline) and asks for the theory behind it. The agent runs on the ElevenLabs Agents platform and drives the builder through **client tools**. Canonical spec: `openspec/specs/voice-companion/spec.md`.

- **Bridge over a ref-mirror, not a store.** `src/voice/progressionBridge.ts` (`createProgressionBridge(deps)`) implements the `ProgressionBridge` contract (`src/voice/types.ts`). `App.tsx` builds it **once** (`useMemo`) over refs that mirror `chords` / `instrument` / `activeChordIndex` plus the `randomizeAll` / playback closures (updated in a no-deps effect), so ElevenLabs tool callbacks — which fire *outside* React's render cycle — always read fresh state. Don't lift the progression into Zustand for this; the ref-mirror is the deliberate, low-blast-radius choice. (It carries the repo's only `eslint-disable` — a reasoned `react-hooks/refs` suppression, since the rule can't see that the ref reads are deferred to callback time.)
- **Tool surface = 9 client tools**, defined once in `src/voice/toolSchemas.ts` (shared by the browser hook `src/voice/useProgressionAgentTools.ts` *and* the provisioning script). `toolSchemas.ts`, the hook, and `agent/system-prompt.md` must always agree on the same names. The agent only gets what the app genuinely backs — there are **no** key-setting, suggestion-mode, or next-chord tools, because `harmonyBrain.ts` does not detect keys, derive numerals, rank scales, or suggest next chords. `analyze_progression` returns chord symbols + tones (`parseNotes`) + the voice-led voicing (`computeVoiceLedProgression`) only; the system prompt forbids the agent claiming the app computed a key/numerals/scales. `randomize_progression` reshuffles existing voicings/variants — it does not generate chords.
- **Signed-URL auth.** The provisioned agent has auth enabled, so the browser never connects with a bare agent id. `POST /api/voice/signed-url` (in `worker/index.ts`, backed by `src/lib/elevenLabsAuth.ts`) mints a short-lived signed URL with the server-held key, mirroring `/api/progression`'s CORS/allowlist/error contract (403 bad origin, 500 missing config, 502 + server-log on an upstream failure, 200 `{ signedUrl }`). The agent highlight (`highlightedChordIndex` in `App.tsx`) is kept **separate** from the `activeChordIndex` playback cursor — don't merge them.
- **Provider/panel.** `src/voice/VoiceAgentProvider.tsx` wraps the ElevenLabs `ConversationProvider`; `src/voice/voiceAgentContext.ts` holds the context + `useVoiceAgent` hook (split out so the provider file is component-only, per react-refresh, mirroring `I18nContext.ts`/`I18nProvider.tsx`). The panel (`VoiceAgentPanel.tsx`) is styled with inline CSS-variable tokens — no per-component stylesheet. The package's `voice-agent.css` / `exampleAdapter.ts` / `signedUrlRoute.ts` and the `@elevenlabs/elevenlabs-js` SDK were intentionally **not** adopted (raw `fetch` instead).

## Worker configuration

Both `.dev.vars` and `wrangler.jsonc` live at the **repo root** (not in `worker/`).

- `ANTHROPIC_API_KEY` — required. Local: `.dev.vars` (gitignored). Prod: `npx wrangler secret put ANTHROPIC_API_KEY`.
- `ALLOWED_ORIGIN` — comma-separated origin allowlist; supports `*`. **The Worker fails closed**: when unset, only `localhost`/`127.0.0.1` origins receive CORS headers. Production deployments must set this (`https://harmony.tonari.ai`) or browsers will be blocked.
- `ELEVENLABS_API_KEY` — required for the voice companion's signed-URL route. Local: `.dev.vars` (gitignored). Prod: `npx wrangler secret put ELEVENLABS_API_KEY`. **Worker/CLI only — never a `VITE_`-prefixed var, never a committed file.**
- `HH_VOICE_AGENT_ID` — the provisioned voice agent id (non-secret). `.dev.vars` locally; a plain `vars` entry in `wrangler.jsonc` for prod. The browser reads the *same* id via `import.meta.env.VITE_HH_VOICE_AGENT_ID` (`.env` / committed `.env.example`).

See `worker/README.md` for full deploy/secrets details and curl examples.

## Project conventions specific to this repo

- **Tailwind is present and used for layout** (flex/grid/spacing), but **all colors, typography, motion, and surfaces come from semantic CSS variables** via inline `style={{}}` (see `App.tsx`). Don't introduce new Tailwind color utilities — extend the design-system tokens or use existing ones.
- The codebase uses TypeScript strict mode plus `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly`. Type-only imports must use `import type`.
- `openspec/` contains spec-driven artifacts for features; check `openspec/specs/<capability>/spec.md` for the canonical requirements before changing a capability (e.g. `progression-agent`, `harmony-brain`, `chord-data`).
- `initial_data/` holds source material (raw chord JSON, reference SVGs, design notes) and is not shipped — the runtime data lives in `src/data/` and `public/music_src/`.
