## 1. Specification And Baseline

- [x] 1.1 Strict-validate the new OpenSpec change and record the TUNE TOOLBOX-only file boundary.
- [x] 1.2 Capture current desktop/mobile Scale Synthesia and Note Neural Network rendered baselines before source edits.
- [x] 1.3 Record the supplied and generated desktop/mobile graph concepts as the visual comparison boundary without committing generated raster assets.

## 2. Scale Synthesia And Toolbox Actions

- [x] 2.1 Add immutable Triad, Seventh, Sixth, Sus2, and Sus4 arpeggio definitions plus internal 120 BPM note-length timing helpers.
- [x] 2.2 Add pure unit tests for every arpeggio sequence, all five note-length onset grids, validation, and frozen catalog behavior.
- [x] 2.3 Add the arpeggio and note-length controls, material-neutral `PLAY`/`STOP` transport, and immediate collapse cleanup in Scale Synthesia.
- [x] 2.4 Remove Circle/Scale collapsed-header action duplicates and apply the expanded-only `HASH it` and `IMPROV INSIGHT` copy in English and Japanese.
- [x] 2.5 Add focused component/browser regressions for action counts, labels, timing choices, playback cursor lifecycle, and HASHER handoff behavior.
- [x] 2.6 Run build, lint, focused Vitest, and Scale/Circle Playwright checks; commit the Scale/action milestone separately.

## 3. Note Neural Network Layout And Interaction

- [ ] 3.1 Replace clustered rows with deterministic centered radial desktop geometry and add a bounded static-mobile projection in the pure layout module.
- [ ] 3.2 Extend layout tests for exact centering, stable rings, collision-free labels, boundary-terminated edges, mobile projection limits, and reduced motion.
- [ ] 3.3 Separate node inspection from context activation so single click shows details, scale/key double click or Enter recenters, and chord clicks never mutate Root/Scale.
- [ ] 3.4 Render the graph on a true-black canvas with one-shot outward desktop motion, connector layering, retained desktop scale details, and retained lower semantic information.
- [ ] 3.5 Omit animated/pannable graph controls on mobile while preserving the complete semantic node/detail path and document containment.
- [ ] 3.6 Add localized instructions and focused component/Playwright coverage for mouse, keyboard, reduced-motion, desktop/tablet radial behavior, and static mobile behavior.
- [ ] 3.7 Compare rendered desktop/mobile screenshots to the accepted concepts, fix every material mismatch, and commit the graph milestone separately.

## 4. Scope And Release Validation

- [ ] 4.1 Run Browser QA through Scale playback/actions, Circle handoffs, graph inspection/recentering, chord details, workspace round trips, and desktop/tablet/mobile containment with clean console output.
- [ ] 4.2 Run the exact full gate: production build, lint, all Vitest, all Playwright, strict OpenSpec, and dependency/Worker packaging checks applicable to the diff.
- [ ] 4.3 Prove no HASHER or FRET FINDER source file changed from the branch base and run their focused existing Playwright regressions plus the full suite.
- [ ] 4.4 Audit the final diff for design-system, React performance, accessibility, localization, snapshot, debug-artifact, and unrelated-scope regressions.
- [ ] 4.5 Reconcile `docs/long_horizon_plan.md` and `docs/long_horizon_log.md` with exact test/browser evidence and commit the validation ledger separately.

## 5. Publication And Branch Hygiene

- [ ] 5.1 Push the reviewed feature branch, open a focused draft PR, and require exact-head build/test, Playwright, and Workers checks to pass.
- [ ] 5.2 Inventory live PR/branch state; delete only branches proven merged or gone while retaining `main`, this feature branch, all open/unmerged work, and the latest few useful feature/fix branches.
- [ ] 5.3 Verify the final local/remote branch inventory, clean worktree boundary, unchanged `.agents/` and `AGENTS.md`, and final exact-head CI status.
