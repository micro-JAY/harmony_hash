# Harmony Hash — Long-Horizon Log

> Dated decisions, rationales, blockers, and open questions from the long-horizon run.
> Milestone tracker is `docs/long_horizon_plan.md`.
> End-of-run ledger goes to `docs/long_horizon_summary.md`.
> Prefix open questions with `Q:` so they're greppable.

---

## 2026-05-17 — Run kickoff & planning PR

**Session.** Long-horizon run starting. Operating from `docs/long_horizon_prompt.md`. Working tree was intentionally dirty on entry (`CLAUDE.md`, `docs/inspiration/README.md`, `docs/long_horizon_prompt.md`) per the operator's note; those three files are committed as the first commit on `chore/long-horizon-plan`.

**Scope correction (commit 1 on the planning branch).** What was originally called "Voice Explore" in the Phase 2 list is renamed and reframed: it is **not** a new feature. It's the natural extension of `src/components/PianoKeyboard.tsx` + `src/components/ChordCard.tsx` so the piano side matches the affordances the guitar side already has (variant cycling, Randomize All, lock-variant per card), plus a side-by-side voicing comparison view that becomes possible once v3 ships. `CLAUDE.md`, `docs/inspiration/README.md`, and `docs/long_horizon_prompt.md` updated together.

**Playwright cadence change (same commit).** Promoted Playwright from a single end-of-milestone check to a before/during/after cadence: baseline on `main` first, focused checks after each meaningful UI commit, full run with updated baselines before flipping the PR out of draft. `§3.4` and verification `§5 gate 7` of the prompt now spell this out.

**Phase 0 — environment baseline.**
- `node --version` → v24.15.0
- `npm install` → clean (3 moderate / 3 high vulnerabilities surfaced by `npm audit`; pre-existing, not introduced by this run; left alone for now).
- `npm run build` → green (508KB / 132KB gzip).
- `npm run test` → green (48/48 across `chordData.test.ts` and `harmonyBrain.test.ts`).
- `npm run lint` → **EXIT 1** with 6 errors + 1 warning. **All pre-existing on `main`**, not introduced by this run. CI workflow (`.github/workflows/ci.yml`) only runs `npm run build` and `npm run test`, never lint — that's how this drifted in. Tracked as milestone 0.3 in the plan; will land via `chore/baseline-fix` before v2 starts.

**Lint baseline findings (to be fixed in `chore/baseline-fix`):**
- `src/App.tsx:28:63` — `'_errors' is defined but never used` (`@typescript-eslint/no-unused-vars`). Underscore-prefixed params aren't ignored by default; either configure `argsIgnorePattern` or rename/use.
- `src/components/ChordReferenceGrid.tsx:11:14` — `react-refresh/only-export-components` (non-component export in a component file).
- `src/components/GuitarChordDiagram.tsx:70:7` — `react-hooks/set-state-in-effect` (`setFailed(true)` synchronously inside `useEffect`).
- `src/components/GuitarChordDiagram.tsx:255:6` — `react-hooks/exhaustive-deps` (warning: unnecessary `chord.root` dep on `useCallback`).
- `src/i18n/I18nContext.tsx:28:17` and `:34:17` — `react-refresh/only-export-components` (two non-component exports in the context file).
- `worker/index.ts:287:41` — `no-useless-escape` on `\-` in a regex.

**Q:** Should CI also run `npm run lint` going forward, so future drift is caught? Default position: yes, add a lint step to `.github/workflows/ci.yml` as part of `chore/baseline-fix`. Flagging here in case the operator wants lint kept advisory rather than gating.

**Planning artifacts (commit 2 on the planning branch).** `docs/long_horizon_plan.md` lists Phase 1 (v2–v5) and Phase 2 (items 2.1–2.9) with branch names, change-ids, capabilities touched, and test plans. The Playwright harness is its own milestone (1.2) sequenced after v2 — first UI-touching slice where the before/during/after cadence becomes possible. The plan also records milestone 0.3 (baseline-fix). `openspec/changes/long-horizon-plan/` is a docs/process change (no spec deltas).

**Decision.** Stay on Anthropic Opus 4.7 in `worker/index.ts`. The shipped progression-builder-agent change already pinned it for tool-call reliability (`design.md D9`); v2–v5 don't touch the agent path, so no model change needed.

**Decision.** v2 ships a *pure engine* + minimal rendering wire-up only; no UI selector for "voice leading on/off" in v2. Voice leading is the default behavior whenever the chord row has ≥2 chords. A toggle, if needed, can land in v3 alongside style selection (rationale: avoids two separate UI conversations).

**Next concrete step.** Finish commit 2 of the planning PR, push, open the PR, self-merge on green. Then open `chore/baseline-fix` against fresh main, then start v2.

**Current state.** Branch `chore/long-horizon-plan`, working in `docs/long_horizon_plan.md` and `openspec/changes/long-horizon-plan/`. Commit 1 already landed locally (scope correction). Commit 2 in progress (plan + log + openspec change).
