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

---

## 2026-05-17 — Phase 0 closed; Piano Voicings v2 (Voice Leading) shipped

**Three PRs merged today, all green CI:**

- **PR [#14](https://github.com/micro-JAY/harmony_hash/pull/14)** — planning artifacts + scope/cadence corrections (eac596e). Milestones 0.1 and 0.2 done.
- **PR [#15](https://github.com/micro-JAY/harmony_hash/pull/15)** — lint baseline fix + archive of `long-horizon-plan` (1cd2ab9). Milestone 0.3 done; main is now lint-clean.
- **PR [#16](https://github.com/micro-JAY/harmony_hash/pull/16)** — Piano Voicings v2 (Voice Leading) (04aa233). Milestone 1.1 done.

**v2 engine design.** `computeVoiceLedProgression(progressionNotes)` in `src/lib/harmonyBrain.ts`. The first chord uses the existing `computeVoicing`; each subsequent chord enumerates candidate voicings (inversions × octave starts × {default Drop 2 / closed root} for 4+ note chords) filtered to C3-B5, and picks the candidate minimizing a voicing-distance metric (sum of each candidate note's distance to its nearest prior note; common tones cost 0; single-semitone steps cost 1). Ties broken by lower average MIDI for determinism. Candidate set always includes `computeVoicing`'s output, so the worst-case is "no worse than default."

**Hand-traced & locked down by tests.** ii-V-I in C: Dm7=[50,53,57,60] → G7=[50,53,55,59] (inversion 2 of [G,B,D,F], 3 semitones of motion) → Cmaj7=[52,55,59,60] (inversion 1 of [C,E,G,B], 2 semitones). Cumulative voice-led motion = 5; naive `computeVoicing`-per-chord = 13. Test asserts `voiceLedTotal < naiveTotal`.

**UI wire-up.** `App.tsx` lifts voicing computation out of `ChordCard.tsx`, memoizes `computeVoiceLedProgression(chords.map(c => parseNotes(c.chord.entry)))`, threads each voicing into its `ChordCard` by index. `ChordCard.tsx` now takes a `voicing: VoicedChord` prop instead of computing internally. No new selectors, pills, or toggles — v2 is the new default. Single-chord paths are byte-for-byte identical.

**Manual smoke via Playwright MCP.** Started `npm run dev` on localhost:5173, typed "Dm7 G7 Cmaj7" → switched to Piano view, then decoded active-key DOM positions back to MIDI. Result matched the engine's hand-traced output exactly. Pre-existing console errors on `GuitarChordDiagram` (`<svg> height="auto"`) surfaced; flagged as a follow-up.

**Decision.** No committed Playwright baselines in v2's PR. Reason: the harness doesn't exist yet (milestone 1.2 lands it). The before/during/after cadence kicks in for v3 onward. v2's PR documented the smoke verification numerically (MIDI values via DOM evaluation).

**Decision.** Used the simple "min-distance per candidate note" metric rather than 1:1 voice-assignment (Hungarian algorithm). Reason: the simpler metric produces visibly smoother voicings on the canonical test cases (ii-V-I, I-vi-IV-V, vamps) at much lower complexity, and the candidate set always includes the default so the worst case is bounded. If post-v3 we find counterexamples where proper voice-assignment matters, that's a follow-up — flagging here so the choice is reconsidered later.

**Decision.** Folded the v2 archive move + spec delta + plan/log updates into a single `chore/archive-piano-voicings-v2` PR rather than a bare-bones archive commit, since updating the plan + log alongside is what the prompt's archive cadence calls for ("Update `docs/long_horizon_plan.md` to mark milestone 1.1 Done with PR link. Add dated entry to `docs/long_horizon_log.md`.").

**Q (still open):** add `npm run lint` to CI? Tracked from yesterday's entry; no answer yet.

**Q (new):** confirm the simple voicing-distance metric over Hungarian assignment is acceptable through v5. If a counterexample emerges later, swap is contained to one function.

**Next concrete step.** Open the v2 archive PR, then start milestone 1.2 (Playwright harness) which becomes the first UI-touching milestone to enforce before/during/after cadence. After that: v3 (Drop 3 + rootless + shell voicings).

**Current state.** Branch `chore/archive-piano-voicings-v2` off main (which is at 04aa233 = post-v2). Archive move + spec delta + plan/log updates staged. About to commit, push, PR, self-merge.
