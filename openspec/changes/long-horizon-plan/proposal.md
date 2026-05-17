## Why

The Harmony Hash long-horizon run (Piano Voicing Roadmap v2 → v5, then the Phase 2 inspiration-led feature wave) needs a tracked milestone list, a dated decisions log, and a first openspec change before any feature code lands. This is the contract that lets a future session resume from `docs/long_horizon_prompt.md` + `docs/long_horizon_plan.md` + the last log entry without losing context. It also fixes two scope errors that would have compounded into rework later:

1. The original Phase 2 list named a new "Voice Explore" feature. That was a misframing: piano-view variant cycling, Randomize All, and lock-variant are not a new feature — they're the in-place extension of the already-existing `PianoKeyboard.tsx` + `ChordCard.tsx` to match the affordances the guitar side already ships.
2. Playwright was specced as a single end-of-milestone check. In a long-horizon run that's too late — regressions land mid-branch and aren't caught until the final pass. The cadence is now before / during / after for every UI-touching milestone.

## What Changes

- **Add** `docs/long_horizon_plan.md` — milestone tracker for Phase 1 (v2–v5) and Phase 2 (items 2.1–2.9) with branch names, openspec change-ids, capabilities, and test plans.
- **Add** `docs/long_horizon_log.md` — dated decisions, rationales, blockers, and open questions log. First entry dated 2026-05-17 captures the kickoff + baseline state.
- **Add** this openspec change directory (`openspec/changes/long-horizon-plan/`) — process artifact that gets archived on PR merge.
- **Modify** `CLAUDE.md`, `docs/inspiration/README.md`, and `docs/long_horizon_prompt.md` (already committed on this branch) — scope correction renaming "Voice Explore" to piano-view parity work and adding the Playwright before/during/after cadence to §3.4 and `§5 gate 7`.
- **Track but defer** to a follow-up PR (`chore/baseline-fix`, milestone 0.3 in the plan): six pre-existing lint errors + one warning that surface when `npm run lint` is run against `main`. CI doesn't currently run lint, which is how they drifted in undetected. Fixing them is a prerequisite for v2 starting (per `§5 gate 3` of the prompt).

## Capabilities

### New Capabilities

None. This is a docs/process change.

### Modified Capabilities

None. No capability spec deltas — this change does not alter any product behavior, public API, or capability requirement.

## Impact

- **Affected paths:** `docs/long_horizon_plan.md` (new), `docs/long_horizon_log.md` (new), `openspec/changes/long-horizon-plan/` (new), `CLAUDE.md` (already committed), `docs/inspiration/README.md` (already committed), `docs/long_horizon_prompt.md` (already committed).
- **Code paths affected:** none.
- **Runtime behavior:** none.
- **Test impact:** none. All existing vitest suites stay green (48/48). Lint baseline is `EXIT 1` on `main` and remains so until `chore/baseline-fix` lands — that's tracked separately.
- **Risk:** None significant. Documentation-only.
- **Rollback:** revert the merge commit.
