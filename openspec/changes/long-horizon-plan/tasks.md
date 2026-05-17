## 1. Scope correction on tracked docs (already committed as commit 1)

- [x] 1.1 Reframe Phase 2 item from a new "Voice Explore" feature to in-place piano-view parity work on existing components (`CLAUDE.md`)
- [x] 1.2 Mirror the rename in the prompt's Phase 2 section (`docs/long_horizon_prompt.md`)
- [x] 1.3 Mirror in the inspiration concept map and clarify the `voice explore - harmony hash (piano view).PNG` reference (`docs/inspiration/README.md`)
- [x] 1.4 Promote Playwright from end-of-milestone to before/during/after cadence in `§3.4` and verification gate 7 of the prompt
- [x] 1.5 Clarify that `docs/inspiration/README.md` is tracked while the screenshots alongside it remain gitignored (`CLAUDE.md`)

## 2. Planning artifacts

- [x] 2.1 Write `docs/long_horizon_plan.md` listing Phase 1 (v2–v5) and Phase 2 (items 2.1–2.9) with branch names, openspec change-ids, capabilities touched, test plans, and status fields
- [x] 2.2 Sequence the Playwright harness as milestone 1.2 — first UI-touching slice where the before/during/after cadence becomes possible
- [x] 2.3 Track the lint baseline issue as milestone 0.3 (`chore/baseline-fix`) so it lands before v2 starts
- [x] 2.4 Write `docs/long_horizon_log.md` with the kickoff entry: scope correction context, environment baseline (node/npm install/build/test/lint results), lint findings catalogue, key decisions (Opus stays in the worker; v2 has no UI selector toggle), and the next concrete step
- [x] 2.5 Verify `docs/inspiration/` screenshots remain gitignored (`git status` does not list them) before pushing — only the tracked `README.md` should diff

## 3. Openspec change

- [x] 3.1 Create `openspec/changes/long-horizon-plan/proposal.md` with Why / What Changes / Capabilities (none) / Impact
- [x] 3.2 Create `openspec/changes/long-horizon-plan/tasks.md` (this file)
- [x] 3.3 No spec deltas — this is a docs/process change

## 4. Ship the planning PR

- [ ] 4.1 Commit plan + log + openspec change as commit 2 on `chore/long-horizon-plan`
- [ ] 4.2 Push the branch
- [ ] 4.3 Open the PR with the standard template (What / Why / Test summary / Risks / Follow-ups). Test summary records that `npm run build` and `npm run test` are green and `npm run lint` is the known-red baseline tracked by milestone 0.3
- [ ] 4.4 Wait for CI green (build + test only, per `.github/workflows/ci.yml`)
- [ ] 4.5 Self-merge with `gh pr merge --squash --delete-branch`
- [ ] 4.6 `git switch main && git pull` to land the merge locally

## 5. Archive

- [ ] 5.1 After PR merges, move this change directory: `mv openspec/changes/long-horizon-plan openspec/changes/archive/$(date +%Y-%m-%d)-long-horizon-plan` — committed as a follow-up to `main` (no spec deltas to apply, so the archive move is the only step)
