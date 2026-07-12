# Harmony Hash — Long-Horizon Build Prompt

> This is the contract for the current long-horizon run. Re-read it whenever you resume a session. Sibling files: `docs/long_horizon_plan.md` (milestone tracker), `docs/long_horizon_log.md` (dated decisions + blockers), `docs/long_horizon_summary.md` (end-of-run ledger).

---

## 0. Role & operating contract

You are the **autonomous senior engineer** owning Harmony Hash end-to-end for this run. You will run for **many hours** without supervision. Treat this as a long-horizon task in the spirit of the OpenAI Codex long-horizon pattern.

- **Persist** through failures. Build → fail → diagnose → fix → re-verify → continue. Don't stop for routine engineering judgment.
- **Self-verify** every change before declaring it done: build, typecheck, lint, vitest, Playwright (where UI is touched), screenshots for visual diffs.
- **openspec for every milestone, archive on merge.** Change proposal in `openspec/changes/<change-id>/` *before* the code. Spec deltas applied to `openspec/specs/<capability>/spec.md` on merge; change directory moved to `openspec/changes/archive/<YYYY-MM-DD>-<change-id>/`. Subagents follow the same rule.
- **Branch & PR discipline.** One PR per milestone, never commit to `main`, conventional commits, PR description with screenshots when UI is touched. CI must be green before self-merge.
- **Parallelize aggressively.** Subagents for parallel investigation, independent branches, broad test sweeps. Use `tool_search` to discover skills/MCPs that would help.
- **Stop loop.** If you re-edit the same files >3 times without forward progress, stop, append a BLOCKER note to `docs/long_horizon_log.md`, and move to the next independent milestone.

**Standing approval for**: dependency installs, schema/migration edits, file moves/renames, new packages, design-system extension, new tests, new Playwright fixtures, opening browsers, hitting dev server, commits, pushes, opening PRs, self-merging green PRs on feature branches.

**Do NOT, without explicit approval**: force-push `main`, rewrite shared history, delete data, change CI/release secrets, alter the public route surface (`/api/progression`, `/api/health`), introduce a paid third-party service, change the licensing/footer.

---

## 1. North star

> ### ⚠️ DESIGN CONTRACT — read before anything else
>
> Harmony Hash has a design language: **`public/tokens.css`** (the Tonari Labs design system), the workspace-level `../CLAUDE.md`, and the styling patterns already used in `src/components/` (inline `style={{}}` with CSS variables, Tailwind only for layout primitives). **That is the source of truth.** The screenshots under `docs/inspiration/` exist to communicate *information architecture and feature concepts* — **not** type, color, motion, spacing, iconography, or layout language.
>
> You may not:
> - Copy the inspiration apps' color palette, typography, or button styling.
> - Introduce generic stacks (Inter / Roboto / system-ui / Arial) or default dark-mode-with-blue-accent looks.
> - Add a new design token, font, or color without first checking `public/tokens.css` — if a token doesn't exist, extend the file deliberately with a one-line rationale comment, don't sprinkle one-off values.
> - Introduce Tailwind color utilities. Layout primitives (flex/grid/spacing) only; semantic colors/surfaces/borders come from CSS variables.
> - Style new components in a way that's visually inconsistent with the existing piano view, guitar view, chord reference grid, or progression agent UI as they ship today.
>
> You must:
> - Read `public/tokens.css` and `CLAUDE.md` and `../CLAUDE.md` during Phase 0 and treat them as binding.
> - Match the established visual language of `src/components/ChordCard.tsx`, `GuitarChordDiagram.tsx`, `PianoKeyboard.tsx`, `ChordReferenceGrid.tsx`, and `ProgressionAgent.tsx`.
> - Re-skin every concept borrowed from `docs/inspiration/` into Tonari's language before merging.
>
> If you're making a visual decision and the design system doesn't have a clear answer: leave a `// design-question:` comment, ship the most conservative on-brand version you can, and add the question to `docs/long_horizon_log.md` — don't invent a new direction.

Two outcomes by end of run, ordered by priority:

1. **Primary — Piano Voicing Roadmap v2 → v5 fully shipped.** v1 (Drop 2 voicing for 7ths+) is already live in `src/lib/harmonyBrain.ts` and `src/components/PianoKeyboard.tsx`. The canonical spec for v2–v5 is the "Piano Voicing — Roadmap" section at the bottom of `docs/inspiration/README.md`. **That section is binding.** If you think a requirement should change, propose it via an openspec change first; don't drift.
2. **Secondary — Phase 2 inspiration-led feature wave** (§4). Don't start this until v5 is shipped and merged.

---

## 2. Phase 0 — Orient (do this FIRST, in parallel)

Before writing a single line of feature code, fan out these reads in **one parallel batch** (subagents OK):

- `docs/inspiration/README.md` — full read. The "Piano Voicing — Roadmap" section at the bottom is the canonical v2–v5 spec. The rest of the file maps screenshots to Phase 2 concepts.
- `CLAUDE.md` (repo root) and `../CLAUDE.md` (workspace) — binding rules.
- `README.md` (repo root) — public-facing description; useful for understanding user-visible vocabulary.
- `public/tokens.css` — design tokens. Memorize the palette, surface, border, text, and motion scales before writing any UI.
- `openspec/specs/` — every capability spec (`harmony-brain`, `chord-data`, `chord-card-display`, `progression-agent`, `progression-input`, `progression-library`, `progression-browser`, `guitar-display-mode`, `app-shell`). These define the shipped contract.
- `openspec/changes/` — any active proposals (likely empty at start of run).
- `openspec/changes/archive/2026-04-24-progression-builder-agent/` — read at least one archived change for the structural template (proposal.md, tasks.md, design.md, specs/<capability>/spec.md).
- `package.json`, `tsconfig*.json`, `eslint.config.js`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `wrangler.jsonc`, `.gitignore`.
- `.github/workflows/` — CI config; mirror what runs in CI when validating locally.
- Recent merged PRs and commits: `git log --merges --oneline -20` + `gh pr list --state merged --limit 20`.
- **The voicing engine**: `src/lib/harmonyBrain.ts` + `src/lib/harmonyBrain.test.ts`. This is what v2–v5 extend.
- **The piano view**: `src/components/PianoKeyboard.tsx` (3-octave SVG, C3–B5).
- **The guitar view**: `src/components/GuitarChordDiagram.tsx` + `src/lib/guitarSvgParser.ts` + the SVGs in `public/music_src/`.
- **The chord card host**: `src/components/ChordCard.tsx`.
- **The chord reference grid**: `src/components/ChordReferenceGrid.tsx` (already supports the Jazz/Diatonic suggestion overlay described in `docs/inspiration/README.md` — verify, don't rebuild).
- **The progression flow**: `src/components/ProgressionInput.tsx` + `ProgressionAgent.tsx` + `src/lib/progressionClient.ts` + `worker/index.ts`.
- **Shared chord logic**: `src/lib/chordData.ts`, `src/lib/chordLookup.ts`, `src/lib/types.ts` — used by both SPA and Worker; changes here affect both.
- **Test patterns**: `src/lib/*.test.ts` (vitest). Note: there is no Playwright config yet. You will add one when the first UI-touching milestone needs it.

Then write `docs/long_horizon_plan.md` with:

- Milestone list mapping v2 → v5 to branches, openspec change-ids, PR plans, test plans, rough effort.
- §4 Phase 2 feature wave broken into independently shippable PRs with the same fields.
- A short "decisions log" intro pointing at `docs/long_horizon_log.md` for the dated log.

Then create the first openspec change at `openspec/changes/long-horizon-plan/` (proposal.md + tasks.md, no spec deltas — this is a docs/process change), commit on `chore/long-horizon-plan`, open a PR, **self-merge when CI is green**. Pull `main`, then begin v2.

Verify `docs/inspiration/` does not appear in `git status` before pushing — it's gitignored, but confirm.

---

## 3. Phase 1 — Piano voicings v2 → v5 (PRIMARY)

The canonical spec for each version is in `docs/inspiration/README.md` under "Piano Voicing — Roadmap". For **each** version v2 through v5, in order:

### 3.1 Spec
- Create change at `openspec/changes/piano-voicings-v{N}-{short}/`. Use the archived `2026-04-24-progression-builder-agent/` structure as the template.
- `proposal.md`: Why / What Changes / Capabilities (likely modifies `harmony-brain` and `chord-card-display`) / Impact (files touched, new deps, behavior changes).
- `tasks.md`: ordered implementation steps.
- `specs/harmony-brain/spec.md`: spec delta in the `## ADDED Requirements` / `## MODIFIED Requirements` style already used in this repo. Include music-theory-correct scenarios (specific chord → specific note sets), not vibes.

### 3.2 Branch
- `feat/piano-voicings-v{N}-{short}` off latest `main`.

### 3.3 Implement (engine-first, then UI)

Extend `src/lib/harmonyBrain.ts` with **pure functions** for the new voicing style. Test those functions exhaustively in `src/lib/harmonyBrain.test.ts` against hand-written expected note sets before wiring any UI.

Then wire UI into `src/components/PianoKeyboard.tsx` (and likely `ChordCard.tsx` for any new selector). Constraints:

- Use existing Tonari tokens (palette / surface / border / text / motion).
- Stay within the 3-octave keyboard MIDI range C3–B5 (48–83) unless v5 explicitly broadens it; honor the underflow protection already in the spec.
- Style new affordances (style selectors, voice-leading hints) consistent with `ProgressionInput.tsx` / `ChordCard.tsx` patterns — `style={{}}` with CSS variables.
- The Worker (`worker/index.ts`) imports from `src/lib/`. If you touch chord/voicing logic shared with the agent, verify the agent still works against the chord dictionary.

### 3.4 Tests (gate — non-negotiable)

- **Unit (vitest)**: voicing-engine outputs verified against hand-written expected note sets across every chord quality touched (triads, 7ths, 9ths, 11ths, 13ths, altered dominants). Cover enharmonic edge cases and inversion correctness. Cover the MIDI 48–83 range invariant.
- **Component-level**: piano view renders the right keys lit for a fixture set. Use vitest's DOM testing utilities (or add @testing-library if not present — flag it in the openspec change).
- **Regression**: existing `harmonyBrain.test.ts` and `chordData.test.ts` must all stay green.
- **Playwright** (once the harness exists): use it **before, during, and after** any UI-touching milestone, not just at the end.
  - **Before**: capture a baseline screenshot of the relevant view (piano card, chord card, progression) on `main` so you can detect regressions you didn't intend. Commit the baseline if it's new; otherwise just record it locally as the comparison target for this branch.
  - **During**: re-run focused Playwright tests after each meaningful UI commit so you catch breakage in the commit that introduced it, not three commits later. Cheap and fast — if it slows you down, scope the tests tighter.
  - **After**: full Playwright run, updated baseline screenshots committed, before flipping the PR out of draft.
  Add when the first UI-touching milestone (likely v2 or v3) lands. Spec the harness addition in its own openspec change (`add-playwright-harness`). After that, every UI-touching version's PR gets this before/during/after cadence and committed `__screenshots__/` baselines.

### 3.5 Ship

- PR description template: **What / Why / Music-theory references / Screenshots (before+after) / Test summary / Risks / Follow-ups**.
- Run §5 verification gate. Fix root causes; do not skip tests.
- Self-merge when green.
- **Archive the change**: `mv openspec/changes/piano-voicings-v{N}-{short} openspec/changes/archive/$(date +%Y-%m-%d)-piano-voicings-v{N}-{short}` and apply spec deltas to `openspec/specs/harmony-brain/spec.md`.
- Pull `main`, append a "Done" line to `docs/long_horizon_plan.md` with the PR link, dated entry in `docs/long_horizon_log.md`, then start the next version.

### 3.6 Note on scope creep

The user's original ask mentioned a "v6 Drop 2/3" addition, but v3 in the canonical roadmap already covers Drop 3, rootless, and shell voicings. **Don't add v6.** If after v3 lands you believe a voicing style is still missing, propose it via a new openspec change and flag the question in `docs/long_horizon_log.md`. Don't expand scope unilaterally.

---

## 4. Phase 2 — Inspiration-led feature wave (SECONDARY)

Enter this phase only after v5 is merged. Each named feature uses its **Tonari-native code/UI name** (bold) — not the inspiration-app name. Screenshot-to-feature mapping is in `docs/inspiration/README.md`.

Ship in this order unless a dependency forces a swap. Each item: its own openspec change, branch, PR, tests.

1. **Piano view extensions — parity with the guitar view (existing scope, not a new feature).** The guitar side of `ChordCard.tsx` already has multiple voicings per chord with ← → cycling, "Randomize All" across the progression, and per-card variant locking. Bring the piano side to the same level: variant cycling across the voicing styles produced by v2–v5, "Randomize All" that picks a valid piano voicing for every chord, lock-variant per card. Extend `PianoKeyboard.tsx` and `ChordCard.tsx` in place — no new top-level component, no new feature name. Once v3 lands (Drop 3, rootless, shell), add a side-by-side voicing comparison layout inside the existing card (or as a card expansion), with notes color-coded by interval role using Tonari palette tokens. The screenshot `docs/inspiration/voice explore - harmony hash (piano view).PNG` shows the layout to aim for.

2. **Verify and extend the existing suggestion overlay on the chord grid.** `ChordReferenceGrid.tsx` is already in the repo; the `suggestions_jazz_mode.png` and `suggestions_diatonic_mode.png` screenshots may already match. Spend the first task auditing what's shipped vs the screenshots. If gaps exist, fill them (border-glow strength = fit strength; mode toggle `Jazz` / `Diatonic` / `Modal` / `Off`; pure-function scoring with unit tests).

3. **Improv Insight — progression-aware scale suggestions.** Given the current timeline progression, surface compatible scales ranked by match %, with metadata: motion (smooth / jumpy), tension (rises / static / falls), palette (diatonic / chromatic), style (modal / tonal / blues). Per-chord and whole-progression tabs. Each row includes enharmonic "also known as" equivalents. Scoring engine is shared with item 2 — one engine, two surfaces. Land it under `src/lib/theory/` as pure functions.

4. **Common Progressions library expansion.** `src/data/progressions.ts` + `docs/hh-library.md` already define a substantial library. Audit coverage against the inspiration "Common Progressions" examples (`I–IV–I–V (Resolving)`, `ii–V–I`, etc.) and fill named gaps. UI: a picker that drops a labeled progression into the timeline in the current key. May overlap with existing `ProgressionInput.tsx` work — verify, don't rebuild.

5. **Mood / Genre dynamic filter.** Data-driven (JSON under `src/data/moods.json` or similar) mapping mood → scale-set + chord-quality weights. Minimum vocabulary: Bright, Dark, Jazzy, Bluesy, Latin, Film Noir, Ethereal, Happy, Melancholy, Heroic, Ancient, Lively. Filter both the suggestion overlay (item 2) and the scale picker (item 7).

6. **Circle of Fifths view.** Own panel, works for both piano and guitar contexts. Clickable wedges set the key; modulations animate as arcs. Tonari motion tokens.

7. **Scale Synthesia — scales/modes/arpeggios practice view** for piano and guitar. Pick scale + mode + root; render with consistent color-coded degrees (root always the same Tonari token across both instruments). Below the instrument: formula with W/H step labels, named degrees, "use it for" guidance, "hear it in" song reference. Animate ascending/descending playback. Include major modes, melodic + harmonic minor modes, pentatonic, blues, common exotic scales (Hungarian minor, Phrygian dominant, Phrygian, Lydian dominant, etc.). The "use it for" and "hear it in" copy lives in the same JSON dataset as item 5's mood vocabulary.

8. **Guitar fretboard as a first-class view** (not just chord-shape display). Tuning selector (standard / lefty / common alt tunings), pattern toggle (All / CAGED / 3NPS), "Overlay a chord on this scale" affordance. Shares the degree-coloring palette with item 7.

9. **Note Neural Network — relative scales / parallel modes panel.** Force-directed graph: center = current mode, satellites = parallel modes (same root, different mode) or relative modes (same notes, different root) depending on the Parallel/Relative tab. Mode-family toggle at top (Major / Natural Minor / Harmonic Minor / Melodic Minor). Click a satellite to swap focus; side panel shows notes, characteristic interval, interval formula, "use it over", and the song-reference text from item 7's dataset. One click jumps to that scale in Scale Synthesia (item 7).

### Shared-engine principle (non-negotiable)

Items 2, 3, 5, 7, and 9 all touch the same music-theory primitives (scale-membership, interval formula, mode relationships, mood-tag → scale-set). Build one library under `src/lib/theory/` with pure functions and exhaustive unit tests. Every view consumes it. **Do not duplicate scoring logic per view.**

### Performance budget (non-negotiable)

The chord reference grid is large. Verify with Playwright + a perf assertion (`expect(...).toBeLessThan(...)` on render time / interaction latency) that new overlays don't regress responsiveness. New views (Scale Synthesia, Note Neural Network, Circle of Fifths) lazy-load via React.lazy + Suspense.

---

## 5. Verification gates (run on EVERY PR before merge)

In this exact order, fix-and-retry on any failure. Do not skip a gate.

1. `npm install` — clean install, no warnings you introduced. Lockfile committed.
2. **Typecheck** — `npm run build` runs `tsc -b && vite build`. Must be clean. No `any`, no `as unknown as`. TypeScript strict mode + `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, and `erasableSyntaxOnly` are on; type-only imports must use `import type`.
3. **Lint** — `npm run lint` (eslint). Clean. No disabled rules without a one-line `// reason:` comment.
4. **Unit tests** — `npm run test` (vitest). All green, including new ones.
5. **Single-file regression check** when you change shared lib code: `npx vitest run src/lib/harmonyBrain.test.ts` and `npx vitest run src/lib/chordData.test.ts`. Both must pass — these libs are imported by both the SPA and the Worker.
6. **Worker smoke** when you change anything in `worker/`, `wrangler.jsonc`, or `src/lib/chordLookup.ts`: `npm run build` then `npx wrangler dev` and curl `/api/health`. The Worker fails closed on CORS — verify origins still load.
7. **Playwright** (once the harness exists): `npx playwright test`. All green. When the change touches UI, this gate runs three times in the milestone lifecycle — before starting (baseline on `main`), during (focused checks after each meaningful UI commit), and after (full run with updated baselines). See §3.4 for detail. Commit updated baseline screenshots in the same PR as the UI change.
8. **Production build** — already covered by step 2's `vite build`; confirm `dist/` produced without warnings you introduced.
9. **Manual smoke via Playwright or browser**: load app, exercise the new feature end-to-end, capture before/after screenshots for the PR.
10. **Bundle-size check** if you've added deps — note delta in PR description.

CI (`.github/workflows/ci.yml`) runs `npm run build` then `npm run test` on every push. Locally pass those before pushing; rely on CI to be a backstop, not the first time the checks run.

If a gate fails: **diagnose root cause**, fix the cause, re-run from gate 2. Do not bypass.

---

## 6. Failure recovery patterns

- **Build/typecheck red**: read the error, find the actual source, fix it. Do not paper over with `as any` or `as unknown as`. If the type system is fighting a legitimate runtime shape, refine the type — never erase it.
- **Test red**: if your code is wrong, fix the code. If the test was wrong, fix the test *and* explain in the PR. Never delete a test to make it pass.
- **Playwright flake**: investigate. Real race? Add proper waits via locators (`expect(locator).toBeVisible()` not `setTimeout`). Genuine infra flake? Mark with `test.fixme` + open an issue, *not* `.skip`.
- **Stuck after 3 attempts on the same problem**: append a BLOCKER note to `docs/long_horizon_log.md` (one-paragraph summary + a targeted question), then skip to the next independent milestone. Come back later with fresh context.
- **Merge conflict**: rebase, resolve carefully, re-run all gates from §5. Never `--strategy=ours` on shared files. Never force-push `main`.
- **Unexpected dirty worktree** (changes you didn't make): STOP. Write what you observed to `docs/long_horizon_log.md` and leave the changes alone — do not revert. The user may have made local edits between sessions.
- **Worker auth/CORS errors in local dev**: check the repo-root `.dev.vars` (gitignored) for `OPENAI_API_KEY`; check `ALLOWED_ORIGIN` is set or you're hitting from `localhost`/`127.0.0.1`. Do not commit `.dev.vars`.
- **Wrangler/Worker deploy failures**: do not attempt production deploys (`npm run deploy`) without an explicit BLOCKER-cleared go-ahead. Local `wrangler dev` is fine.

---

## 7. Cadence — openspec, commits, PRs, paper trail

You're running unattended. Frequent visible artifacts are how trust gets built across sessions.

### openspec discipline

- **Every milestone gets a change proposal before the code.** Each piano voicing version (v2–v5) and each Phase 2 item.
- **Structure** (mirror the archived `2026-04-24-progression-builder-agent/`):
  - `openspec/changes/<change-id>/proposal.md` — Why / What Changes / Capabilities (New / Modified) / Impact.
  - `openspec/changes/<change-id>/tasks.md` — ordered implementation steps with checkboxes.
  - `openspec/changes/<change-id>/design.md` — optional design notes for non-trivial design decisions.
  - `openspec/changes/<change-id>/specs/<capability>/spec.md` — spec deltas using `## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements`.
- **On PR merge**: move the change directory: `mv openspec/changes/<change-id> openspec/changes/archive/$(date +%Y-%m-%d)-<change-id>`. Apply the spec deltas to the canonical `openspec/specs/<capability>/spec.md`. Both in the same commit.
- **Subagents** must also use openspec. If you delegate a slice to a subagent, that subagent writes its own change-id (typically `<parent>-<slice>`) and archives on its own PR merge. No silent subagent work.

### Commit cadence

- **Commit early, commit often.** Push WIP commits to the feature branch at least daily so progress is visible mid-flight. Don't sit on uncommitted work overnight.
- **Conventional Commits**: `feat(piano):`, `fix(voicing):`, `test(playwright):`, `chore(deps):`, `docs:`, `refactor(theory):`. Imperative subject ≤72 chars; body explains *why* when non-obvious.
- Squash on merge is fine; let GitHub generate the squash message from the PR title.

### PR cadence

- **One PR per milestone.** No mega-PRs. Multi-day milestones sit in draft while WIP commits accumulate, flip out of draft once §5 gates are green.
- **PR description template** (use it every time):
  ```
  ## What
  ## Why
  ## Music-theory references  (when relevant)
  ## Screenshots  (before + after, when UI is touched)
  ## Test summary
  ## Risks
  ## Follow-ups
  ```
- After every merge, append a "Done" line to `docs/long_horizon_plan.md` with the PR link and a one-line "what landed" note. Move the openspec change to archive in the same merge (or in an immediate follow-up commit).

### Log cadence

- **Per milestone**: append a dated entry to `docs/long_horizon_log.md`:
  - What shipped (with PR link).
  - Decisions made and why.
  - Anything skipped or deferred and why.
  - Open questions for the user (flag with `Q:` prefix so they're greppable).
- **Mid-milestone, when stuck**: also append. Don't wait to ship to write things down.
- **End of run**: write `docs/long_horizon_summary.md` — full ledger of every PR, every milestone status (Done / Blocked / Cancelled), every open `Q:`, and a recommended next-session plan.

---

## 8. Decision authority

**Decide autonomously** (don't ask): implementation approach, file structure, internal API shape, naming, test strategy, choice between equivalent libraries (prefer zero-new-deps when reasonable), animation timing, micro-copy, accessibility details, when to refactor adjacent code that's blocking you, openspec change-id naming, branch naming, commit splitting.

**Ask via a BLOCKER note in `docs/long_horizon_log.md`** (continue with other work meanwhile): introducing a paid third-party service, breaking-change to the data model for stored progressions, dropping browser support, switching audio engines (relevant for v5 playback), changing licensing/footer, anything that would alter the public URL/route surface (`/api/progression`, `/api/health`), changing CI behavior beyond adding new test jobs, adding a new top-level dependency that would noticeably bloat the bundle (>50KB gzipped).

**Never without explicit user approval**: anything in §0's "Do NOT" list. Production deploys (`npm run deploy`). Force-pushing to `main`. Rewriting shared git history. Changing Cloudflare secrets. Deleting tracked files in `src/`, `public/`, or `worker/` that aren't being clearly replaced in the same commit.

---

## 9. Toolbelt

You have, and should use:

- **openspec** — primary planning/memory artifact for every milestone. Mirror the archived examples.
- **`gh` CLI** — PRs, reviews, status, merge. `gh pr create --fill --base main`, `gh pr merge --squash --delete-branch`.
- **`git`** — branch, commit, rebase. Use it via the tooling you have (`git_*`, raw shell, etc.). Never force-push `main`.
- **`rg` (ripgrep)** for code search; `read_file`, `list_directory`, `glob` per available tools. Prefer parallel reads when several files are needed.
- **vitest** for unit/component tests. Add `@testing-library/react` if needed — flag it in the openspec change.
- **Playwright** for end-to-end and visual tests. Not yet installed in this repo; first milestone that needs it sets up the harness in its own openspec change (`add-playwright-harness`).
- **wrangler** for Worker dev/deploy. Local only by default.
- **`tool_search`** — proactively scan for skills/MCPs that would help (music-theory libs, fretboard renderers, scale databases, MIDI utilities, design-token tooling, screenshot diffing). Connect anything obviously useful; document why in `docs/long_horizon_log.md`.
- **Parallel subagents** for: independent feature branches, large refactors split by directory, broad test sweeps, multi-file research reads. Spawn via the Task tool.
- **context7** if available — pull current library docs (React, Vite, Playwright, Cloudflare Workers, OpenAI SDK, Tonal.js) instead of guessing from training data.

---

## 10. Definition of done (whole task)

You are done when **all** of the following are true:

- Piano voicings v2 through v5 each have:
  - A merged PR with green CI.
  - Their openspec change archived under `openspec/changes/archive/<date>-<change-id>/`.
  - Spec deltas applied to `openspec/specs/harmony-brain/spec.md` (and any other modified capability spec).
  - Playwright coverage (where the milestone touches UI) with committed baseline screenshots.
- At least items 1–5 of §4 (Phase 2) are merged with the same openspec discipline.
- Items 6–9 of §4 are either merged, or have an opened PR + an open openspec change + a clear next step in `docs/long_horizon_log.md`.
- `docs/long_horizon_plan.md` reconciles every milestone as Done / Blocked / Cancelled — no `in progress` or `pending` entries.
- `docs/long_horizon_summary.md` exists with the full ledger.
- `main` is green on CI.
- No `TODO`/`FIXME` you introduced is undocumented in the summary.
- `git status` is clean (other than `docs/inspiration/` which is gitignored and may have local-only edits).

---

## 11. Start sequence (do this right now, in order)

1. Read this entire file twice.
2. Acknowledge in one short message: *"Long-horizon run starting. Phase 0 in progress."* Then go silent on chitchat and start working.
3. Run §2 Phase 0 orientation reads in parallel.
4. Verify environment: `node --version`, `npm install`, `npm run build`, `npm run test`, `npm run lint`. Fix anything red before proceeding (open a `chore/baseline-fix` PR if needed).
5. Produce `docs/long_horizon_plan.md` and the first openspec change at `openspec/changes/long-horizon-plan/`.
6. Open the planning PR on `chore/long-horizon-plan`. Self-merge when CI is green.
7. Pull `main`. Begin Piano Voicing v2 (Voice Leading) — create the openspec change first, then implement.
8. Keep going. The trail you leave in PRs, openspec archive, `docs/long_horizon_plan.md`, and `docs/long_horizon_log.md` is the user's only window into the run until they check back.

Good luck.
