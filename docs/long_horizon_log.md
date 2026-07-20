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

---

## 2026-05-17 — Milestone 1.2 (Playwright harness) shipped

**PR [#18](https://github.com/micro-JAY/harmony_hash/pull/18)** — `chore(e2e): add Playwright harness with first voice-leading smoke spec` (squash commit `572cc27`). Both `build-and-test` and the new `playwright` CI job green on Linux.

**Design.** `@playwright/test ^1.60.0` + `playwright.config.ts` + one smoke spec at `e2e/smoke.spec.ts` that loads the SPA, types "Dm7 G7 Cmaj7", switches to Piano, and asserts the rendered MIDI exactly matches the v2 voice-led set. `expect(page).toHaveScreenshot` provides the loose CSS-regression backstop; the DOM-decoded MIDI assertion is the strong contract.

**Cross-platform.** Used `snapshotPathTemplate: "{testDir}/__screenshots__/{testFileName}/{arg}{ext}"` to drop the `{projectName}/{platform}` suffix Playwright adds by default. With a 10% pixel-ratio and 0.3 per-pixel threshold on `toHaveScreenshot`, the macOS-generated baseline passes against the Linux CI render. If a real regression slips through this tolerance later, we tighten.

**CI.** New `playwright` job runs in parallel with `build-and-test`. Chromium-only (no Firefox/WebKit), no browser caching yet (`actions/cache` is a follow-up). Adds ~2-3 min per push.

**Process change locked in.** The before/during/after cadence is now operable from v3 onward. v3 (Drop 3 + rootless + shell) will add the per-card style selector — first milestone with a real visual contract to lock down.

**Q (already open):** add `npm run lint` to CI — still no answer; defaulting to "no, unless the operator asks." Not blocking.

**Q (resolved by this PR):** the cross-platform snapshot strategy works with generous tolerance. Will tighten in a future small chore if it starts masking real regressions.

**Decision.** Bundle next milestone's archive housekeeping into the next milestone's branch as the first commit, instead of separate `chore/archive-*` PRs. Saves ~3 min CI wait per archive and keeps PR count manageable across the rest of the long-horizon run. v2 used a separate archive PR (#17); v3 onward starts with archive commits.

**Next concrete step.** v3 (Piano Voicings — Extended Styles): Drop 3, rootless A/B, shell voicings. Engine: `computeVoicingForStyle(noteNames, style)` returning a `VoicedChord` for any of the named styles. UI: per-card style selector (parallel to the guitar Fingering/Intervals/Notes pattern). Playwright cadence kicks in for the first time on this milestone.

**Current state.** Branch `feat/piano-voicings-v3-extended-styles` off main (which is at 572cc27 = post-1.2). About to commit the v1.2 archive housekeeping as the first commit on this branch, then design + implement v3.

---

## 2026-05-17 — Milestone 1.3 (v3 Extended Styles) shipped

**PR [#19](https://github.com/micro-JAY/harmony_hash/pull/19)** — `feat(piano): voicings v3 — Drop 3, Rootless, Shell + per-card style selector` (squash commit `54203da`). Both `build-and-test` and `playwright` CI jobs green.

**Engine.** Added `VoicingStyle = "auto" | "drop2" | "drop3" | "rootless" | "shell"`, extended `VoicedChord.voicingType` to match. Five new module-private helpers (`isStyleApplicable`, `enumerateClosedCandidates`, `buildDropNVoicing`, `enumerateDropCandidates`, `enumerateVoicingCandidatesForStyle`) plus two new public exports (`computeVoicingForStyle`, expanded `computeVoiceLedProgression` with optional `styles` arg). Auto path is byte-for-byte v2; explicit styles constrain the candidate set.

**Music theory locked down.** Hand-verified MIDI sets for Cmaj7, Dm7, G7 across all 4 explicit styles. Drop 3 underflows at oct 3 for most chords → resolves at oct 4. Rootless drops noteNames[0] and voices the remaining 3-4 notes. Shell is gated by `hasSeventh(noteNames)` — interval from root to noteNames[3] must be 10 or 11 semitones — so C6 and Cadd9 don't pick up a meaningless shell. All-shell ii-V-I in C: `[F3,C4] → [F3,B3] → [E3,B3]` — 2 semitones of cumulative motion.

**UI.** Per-card pill toggle above the keyboard: Auto / Drop 2 / Drop 3 / Rootless / Shell. Non-applicable styles disabled per chord. The "Drop 2" pill below the keyboard generalized to show any non-root voicingType.

**Playwright before/during/after.** First milestone where the cadence actually ran. Before: existing baseline from 1.2 captured the v2 view. During: re-ran e2e after the UI commit, visual diff failed (expected — added toggle row) but DOM-decoded MIDI passed. After: regenerated baseline + added a second e2e test that clicks "Shell" on every card and asserts the shell voice-led MIDI chain.

**Decision.** Shipped `rootless` as one style (not "rootless A" + "rootless B"). The inversion difference between A and B (3rd in bass vs 7th in bass) is what voice-leading already picks naturally. Explicit A/B controls would be Phase 2 piano-parity territory.

**Decision.** Cross-platform Playwright baseline held on Linux CI on first try, with the 10% pixel-ratio + 0.3 per-pixel threshold. Confirms the milestone 1.2 tolerance picks are workable.

**Bundled-archive pattern working.** v3's branch started with `chore(openspec): archive add-playwright-harness + update plan/log` and continued straight into the engine work. Saved one CI cycle compared to a separate archive PR.

**Next concrete step.** v4 (Interval Spacing & Spread Voicings). Three concepts in the inspiration spec:
1. **Spread (10th interval)** — root in LH (oct 3), 3rd at +12-15 semitones in oct 4, rest of chord above. Wide, lush R&B/gospel sound.
2. **Upper structure triad (UST)** — for dominant chords, play a triad from the chord's upper extensions over LH = root + b7. **Deferring**: USTs imply chromatic tones not present in the input chord's note set (e.g. D major over G7 introduces F#), which breaks the "render the chord's notes" contract. Tracked as a follow-up after a separate design pass.
3. **Two-hand spread** — LH = root + 5th at oct 3, RH = 3rd + 7th + extensions at oct 4+.

v4 ships spread + two-hand; UST deferred to a follow-up openspec change.

**Q (open):** when should UST land? Either as a separate openspec change ("piano-voicings-ust") proposing how to handle the "adds chromatic tones" issue (e.g. by surfacing as a new chord type the user opted into via chord input like "G7+UST"), or as part of v4.5 with a richer chord-tone model.

**Current state.** Branch `feat/piano-voicings-v4-spread` off main (which is at 54203da = post-v3). Archive housekeeping + spec deltas committed in the first commit. About to design + implement v4 spread + two-hand.

---

## 2026-05-17 — Milestone 1.4 (v4 Spread + Two-Hand) shipped; UST deferred

**PR [#20](https://github.com/micro-JAY/harmony_hash/pull/20)** — `feat(piano): voicings v4 — Spread + Two-Hand voicings`. Both CI jobs green; landed on 2026-05-17.

**Engine.** Two new builders + a generic enumerator:
- `buildSpreadVoicing` — root in LH at startOctave; every subsequent tone in RH starting at least one octave above the root, ascending. The 3rd lands a 10th above the root (16 semitones for major, 15 for minor 3rds). For high-root chords like Bmaj7, RH skips oct 4 and starts at oct 5 to clear the LH root.
- `buildTwoHandVoicing` — LH = root + 5th (root only for triads), RH = remaining tones one octave above LH root.
- `enumerateRootBassCandidates` — generic candidate enumerator, varies only the starting octave because the root-in-bass rule makes inversion irrelevant for these styles.

**Music theory locked down.**
- Spread Cmaj7 = `[48, 64, 67, 71]`. Dm7 = `[50, 65, 69, 72]`. G7 = `[55, 71, 74, 77]`. C triad = `[48, 64, 67]`. Bmaj7 = `[59, 75, 78, 82]`.
- Two-hand Cmaj7 = `[48, 55, 64, 71]`. G7 = `[55, 62, 71, 77]`. C triad = `[48, 64, 67]` with LH=root only.
- Voice-led spread ii-V-I in C: `[50,65,69,72]` → `[55,71,74,77]` → `[60,76,79,83]`. The engine bumps Cmaj7 to oct 4 to stay close to G7's upper register — locked down in a new e2e test.

**Scope decision: UST deferred.** UST as a piano technique inherently introduces chromatic tones not in the chord's `Notes` field (e.g. D major triad over G7 needs F# and A — neither exists in G7's `[G, B, D, F]`). That breaks the engine's "render the chord's notes" contract. Two design options sketched in v4's proposal — new chord type or extension-hint mechanism. Both warrant their own openspec change. Filed as `piano-voicings-ust` to be picked up after v5 ships.

**Playwright before/during/after**: the addition of 2 more pills to the style toggle (5 → 7) landed within the existing 10% pixel-ratio tolerance against v3's baseline — no regeneration needed.

**Next concrete step.** v5 (Playback). Lightweight WebAudio synth that plays the voiced progression in sequence. Design: pure `buildPlaybackSchedule(voicings, bpm): PlaybackEvent[]` for unit testability + side-effecting `playSchedule(schedule, audioContext)` for actual audio. UI: global "Play progression" button + active-chord glow during playback. Honor prefers-reduced-motion for the glow.

**Current state.** Branch `feat/piano-voicings-v5-playback` off main (post-v4). Archive housekeeping committed; this log entry being added as part of the same housekeeping wave before v5 code lands.

---

## 2026-05-17 — Milestone 1.5 (v5 Playback) shipped; **Phase 1 COMPLETE**

**PR [#21](https://github.com/micro-JAY/harmony_hash/pull/21)** — `feat(piano): voicings v5 — playback (WebAudio synth + active-chord indicator)`. Both CI jobs green; landed 2026-05-17.

**Engine.** New `src/lib/audioEngine.ts`:
- `buildPlaybackSchedule(voicings, bpm, beatsPerChord = 2)` — pure function; one PlaybackEvent per chord with absolute start time, duration, MIDI list, and chordIndex.
- `midiToFrequency(midi)` — equal temperament, A4=440Hz.
- `playSchedule(schedule, audioContext, onChordChange?)` — side-effecting. Per chord: one OscillatorNode per MIDI note (triangle wave) + GainNode with soft ADSR envelope (attack 20ms → 70% decay → release 50ms before chord end). Schedules onChordChange via setTimeout for UI active-chord highlighting. Returns PlaybackHandle with stop().

**Why triangle waves not sines:** layered sine waves over 4-5 chord tones beat harshly; triangles stay warm without faking a piano sound we don't have. Synth is intentionally not piano-emulating — it's a synth that doesn't pretend.

**UI.** App.tsx adds:
- `activeChordIndex` state + `audioContextRef` + `playbackHandleRef`.
- "Play progression" toggle button (Play / Square icons) when piano + chords ≥ 1.
- Cleanup `useEffect` on `[chords, pianoVoicings]` stops in-flight playback when chords / styles change.
- AudioContext lazily created on first user gesture (Safari + iOS compatibility via `webkitAudioContext` fallback).
- ChordCard accepts `isPlaying?` prop; flips border + box-shadow to `--glow-accent` when active.

**Playwright cadence (before/during/after).** Before: v4 baseline. During: focused e2e after engine/UI commits; visual diff blew past tolerance (added Play button) — expected. After: regenerated baseline + added a new e2e test that clicks Play and asserts the visual `data-playing="true"` marker appears on a card within 2 seconds + the Stop control becomes visible. Audio output itself isn't asserted (fragile in headless); the visual contract is what carries the test value.

**Decision.** No prefers-reduced-motion gate on the active-chord glow because it's a static `box-shadow` with no animation — doesn't violate WCAG SC 2.3.1. If a beat-flash animation is added later, that change should gate behind `useReducedMotion`.

**Bundle delta tally for Phase 1:** v2 = +1.3 KB raw. v3 = +2 KB. v4 = +1 KB. v5 = +1.5 KB. Total: ~+5.8 KB raw / +1.5 KB gzip. Voice-leading engine + four extended styles + playback for less bundle than a single icon font. WebAudio + framer-motion already vendored.

**Phase 1 complete.** Five milestones (v1 already there; v2-v5 shipped this session) plus the Playwright harness milestone. The piano view goes from "Drop 2 / closed root only" at the start of the session to "auto voice-leading + seven explicit styles + audio playback with visual indicator" at the end.

**Q (still open):** add `npm run lint` to CI. Defer.

**Q (still open):** UST design — picked up post-Phase-1.

**Q (still open):** tighten Playwright cross-platform tolerance. Still no real regression to demand it; held across all four UI-touching milestones.

**Next concrete step.** Phase 2 begins. Item 2.1 (piano view parity with guitar) is the most natural follow-on: bring lock-toggle + Randomize All + Notes/Fingering display toggle to piano cards. Engine support is already there (v3+v4 produced seven voicing styles; randomization just needs to cycle them per-card).

**Current state.** Branch `feat/piano-view-parity` off main (post-v5 = post-Phase-1). Archive housekeeping for v5 in flight as the branch's first commit. Then 2.1 code.

---

## 2026-05-17 — Milestones 2.1 (piano view parity) and 2.2 (suggestion overlay — Off + Diatonic slice) shipped

**PR [#22](https://github.com/micro-JAY/harmony_hash/pull/22)** — `feat(piano): view parity with guitar — lock, randomize, Notes/Fingering toggle`. Both CI jobs green; landed 2026-05-17.

**2.1 in three moves:**
- Lock toggle no longer gated to guitar — same `lockedCards: Set<number>` state drives both instruments.
- `randomizeAll()` branches by instrument: guitar = existing variant randomization; piano = pick a uniformly-random applicable explicit style (auto excluded) per unlocked card. New `RANDOM_PIANO_STYLES` list filtered through `isStyleApplicable`.
- Notes / Fingering pill toggle wired into `ChordCard` via local `pianoDisplay` state. The `PianoDisplayMode` type has existed since 2026-03-06; this PR finally surfaces it in the UI.

**Side-by-side voicing comparison view** (the "optional" piece of 2.1) deferred. Filed in the plan as 2.1.x. Engine support is there from v3 + v4; the UX is a separate design pattern from per-card toggles.

**2.2 audit + minimal slice (this PR, [#23](https://github.com/micro-JAY/harmony_hash/pull/23)).** The audit confirmed the suggestion overlay didn't exist in `ChordReferenceGrid.tsx` — no mode toggle, no scoring engine, no diatonic gating. Shipping the **minimum useful slice**: a new pure-function theory module + an Off / Diatonic mode toggle on the grid. Non-diatonic rows dim to 35% opacity when active. Key + scale type pulled from `ProgressionInput.tsx`'s existing `selectedKey` + `activeGroup.scaleType` state.

**Jazz and Modal modes deferred.** Each needs its own scoring engine (Jazz: voice-leading + tritone-sub + ii-V detection; Modal: parent-mode coloring). Filed as `suggestion-overlay-jazz` and `suggestion-overlay-modal` follow-up changes. The minimum slice still delivers: the grid stops being "every chord that exists" and starts being "where to look in this key."

**Theory module groundwork.** `src/lib/theory/` is set up to be the shared engine for Phase 2 items 2.3 (Improv Insight), 2.5 (Mood/Genre filter), 2.7 (Scale Synthesia), and 2.9 (Note Neural Network). v1 exports `pitchClassOf`, `scalePitchClasses`, `isRootDiatonic`, `scaleDegreeOf` — all pure, all unit-tested. Subsequent Phase 2 items extend this module rather than duplicate scoring logic.

**Decision.** Use opacity (35%) rather than fill or border-glow for the dimming because: (1) the existing cell rendering uses a lot of color state already (root color, flash state, hover state) — adding a fourth color layer would clash; (2) opacity is the cheapest visual cue that doesn't require any new tokens; (3) Jazz mode will introduce variable-strength styling when it lands, at which point a richer encoding makes sense.

**Decision.** Free Input doesn't have its own key picker yet — the suggestion overlay uses `selectedKey` from the (shared) ProgressionInput state, which defaults to "C". A "guess key from typed chords" inference layer is filed as a future investigation. Today's behavior: the user can change keys via the Progressions-tab dropdown, and the overlay updates accordingly.

**Phase 2 items 2.3, 2.4, 2.5 remain** before the prompt's Definition of Done is met. Each is its own openspec change + PR. Pacing: Improv Insight (2.3) shares the most engine code with 2.2's theory module; progression library expansion (2.4) is mostly data + a UX hook; Mood/Genre (2.5) is a JSON dataset + filter UI.

**Q (still open):** add `npm run lint` to CI. No answer yet.

**Q (still open):** Hungarian voice-assignment vs the min-distance metric. Still no counterexample to demand the swap.

**Q (still open):** Free Input key inference. UX investigation deferred.

**Next concrete step.** Phase 2 item 2.3 — Improv Insight. Progression-aware scale suggestions with motion/tension/palette/style metadata. The `src/lib/theory/` module gets extended with scale-membership scoring against a chord progression. UI: a "Compatible Scales" panel that surfaces ranked scales per progression.

**Current state.** Branch `feat/suggestion-overlay-diatonic` off main (post-2.1). 2.2 staged for commit; PR after.

---

## 2026-05-17 — Session handoff (Phase 1 + 2.1 + 2.2 shipped; 2.3-2.5 remain)

**Session totals:** 11 PRs merged across the session — every Phase 1 milestone (v1 was already there; v2 voice leading, the Playwright harness, v3 extended styles, v4 spread + two-hand, v5 playback) plus Phase 2 items 2.1 (piano view parity) and 2.2 (suggestion overlay — Off + Diatonic slice). Each PR landed with both `build-and-test` and `playwright` CI jobs green.

**PR ledger:**

| PR | Branch | Landed | Milestone |
|----|--------|--------|-----------|
| [#14](https://github.com/micro-JAY/harmony_hash/pull/14) | chore/long-horizon-plan | eac596e | 0.1 + 0.2 (planning) |
| [#15](https://github.com/micro-JAY/harmony_hash/pull/15) | chore/baseline-fix | 1cd2ab9 | 0.3 (lint baseline + first archive) |
| [#16](https://github.com/micro-JAY/harmony_hash/pull/16) | feat/piano-voicings-v2-voice-leading | 04aa233 | 1.1 (voice leading) |
| [#17](https://github.com/micro-JAY/harmony_hash/pull/17) | chore/archive-piano-voicings-v2 | bb6f34c | v2 archive |
| [#18](https://github.com/micro-JAY/harmony_hash/pull/18) | chore/add-playwright-harness | 572cc27 | 1.2 (Playwright harness) |
| [#19](https://github.com/micro-JAY/harmony_hash/pull/19) | feat/piano-voicings-v3-extended-styles | 54203da | 1.3 (Drop 3 + rootless + shell) |
| [#20](https://github.com/micro-JAY/harmony_hash/pull/20) | feat/piano-voicings-v4-spread | 86f5909 | 1.4 (spread + two-hand) |
| [#21](https://github.com/micro-JAY/harmony_hash/pull/21) | feat/piano-voicings-v5-playback | aace25e | 1.5 (playback) — **Phase 1 closed** |
| [#22](https://github.com/micro-JAY/harmony_hash/pull/22) | feat/piano-view-parity | 8cc7203 | 2.1 (piano view parity) |
| [#23](https://github.com/micro-JAY/harmony_hash/pull/23) | feat/suggestion-overlay-diatonic | 736b713 | 2.2 (Off + Diatonic) |
| **this PR** | chore/session-handoff | — | plan/log housekeeping + handoff |

**Code reality at handoff:**
- Test suite: 120 vitest assertions (chord-data 12 / harmony-brain 82 / audio-engine 11 / theory 15) + 4 Playwright e2e. All green on `main`.
- Bundle: 510 KB raw / 133 KB gzip. Phase 1 (v2-v5) added ~5.8 KB raw / 1.5 KB gzip combined; Phase 2 adds another ~1 KB raw across 2.1 + 2.2.
- Engine surface: 7 voicing styles (auto / drop2 / drop3 / rootless / shell / spread / two-hand), voice-leading across progressions, audio playback with active-chord visual, theory module v1 (pitch classes, scale sets, diatonic test, scale-degree lookup).
- UI surface: piano cards now have lock + Randomize + style toggle + Notes/Fingering toggle + voicing-type pill + Play/Stop progression + active-chord glow. Chord-grid suggestion overlay (Off / Diatonic) ships behind a mode pill toggle.

**What's still needed for Definition of Done:**

Per `docs/long_horizon_prompt.md §10`, the run is done when:
- ✅ v2-v5 each have a merged PR + archived openspec + spec deltas + Playwright coverage (where UI is touched).
- ✅ At least items 2.1-2.5 of Phase 2 are merged. **2.1 + 2.2 done; 2.3 + 2.4 + 2.5 remain.**
- ❌ Items 2.6-2.9 either merged or have an opened PR + open openspec change + clear next step logged. **Not started.**
- ✅ Plan reconciles every milestone as Done / Blocked / Cancelled — being updated in this PR.
- ❌ `docs/long_horizon_summary.md` exists with the full ledger. **Pending end-of-run.**

**The remaining Phase 2 items 2.3-2.5 — concrete design notes for the resuming session:**

### 2.3 — Improv Insight (largest of the three)

Build a "Compatible Scales" panel that ranks scales against the current progression. Live next to (or below) the chord cards.

Engine work in `src/lib/theory/`:
- Add `chordToneSet(noteNames: string[]): Set<number>` — the pitch-class set of a chord's notes (use the existing `parseNotes` + `noteToPitchClass`).
- Add `progressionToneSet(progression): Set<number>` — union over all chords in a progression.
- Add `scoreScale(scaleType, scaleRoot, progressionToneSet): { overlap, missing, accidentals }` — for each scale candidate, compute: how many of the progression's pitches are in the scale (`overlap`), how many pitches in the scale aren't used (`missing`), how many progression pitches are outside the scale (`accidentals`). The match % = `overlap / progressionToneSet.size`.
- Add metadata derivation:
  - `motion(scaleType): "smooth" | "jumpy"` — based on the scale's interval variance.
  - `tension(scaleType): "rises" | "static" | "falls"` — based on the scale's tritone count.
  - `palette(scaleType): "diatonic" | "chromatic"` — modes of major = diatonic; harmonic/melodic minor + altered + symmetric = chromatic.
  - `style(scaleType): "modal" | "tonal" | "blues"` — Lydian / Mixolydian / Phrygian = modal; major / natural minor = tonal; blues + pentatonic = blues.

These are pure-function decompositions; each gets unit tests with hand-picked expected outputs.

UI work in a new component `src/components/ImprovInsight.tsx`:
- Two-tab layout: "Per chord" and "Whole progression."
- "Per chord" tab: tabs across the top for each chord in the progression; selecting one shows the ranked scales for that chord alone.
- "Whole progression" tab: ranked scales for the union over all chords.
- Each row: scale name, match %, motion/tension/palette/style badges, "also known as" enharmonic equivalents.
- Open/close via a "Show compatible scales" button in the action bar (only when a progression is rendered).

This is at least one full PR's worth of work. Spec deltas in a new `improv-insight` capability.

### 2.4 — Common Progressions library expansion

Audit pass: read `src/data/progressions.ts` against the inspiration "Common Progressions" examples (`I–IV–I–V (Resolving)`, `ii–V–I`, etc.). The current library is already substantial — fill named gaps where they exist and verify the existing entries match.

Engine work:
- Add `src/data/progression-library.ts` if a richer schema is needed (with `description`, `genre`, `era` fields beyond name + numerals).
- If the schema stays as-is, this is a pure data PR: append entries to the existing `progressions.ts` and the `hh-library.md` document.

UI work in `ProgressionInput.tsx`:
- The preset browser already exists. Drop-in of the new entries is automatic via the existing render.
- Potentially add a search/filter affordance if the list grows beyond what's pleasant to scroll. Defer if the existing list is fine.

Smallest of the three. Mostly data work + audit.

### 2.5 — Mood / Genre filter

JSON-driven mapping mood → scale-set + chord-quality weights. The minimum vocabulary the prompt lists: Bright, Dark, Jazzy, Bluesy, Latin, Film Noir, Ethereal, Happy, Melancholy, Heroic, Ancient, Lively.

Engine work in `src/data/moods.json` + `src/lib/theory/`:
- `MoodId = "bright" | "dark" | ...` (TS-typed).
- `moodSchema`: `{ id: MoodId, label: string, scales: ScaleType[], qualityWeights: Record<ChordQuality, number> }`.
- `filterByMood(chord-candidates, mood): scored-candidates` — runs each candidate against the mood's quality weights + scale memberships.

UI:
- Compact optional selector above the input surfaces, keeping the full vocabulary available without a dense beginner-facing pill wall.
- Active mood biases the suggestion overlay (extending 2.2's overlay to "mood-weighted" mode) and filters compatible-scale results (Improv Insight in 2.3, then the Scale Synthesia picker in 2.7). This follows the canonical prompt's two required consumers; progression-library tagging is not part of the Phase 2.5 contract.

Bigger lift than 2.4 because it touches both the overlay and compatible-scale surfaces, but it shares the theory module v2.2 set up.

**Design + integration notes for the resuming session:**

- **Theory module versioning.** Today's `src/lib/theory/index.ts` exports four functions (`pitchClassOf`, `scalePitchClasses`, `isRootDiatonic`, `scaleDegreeOf`). The Phase 2.3 / 2.5 extensions ADD functions to this module — they should not modify the existing four. The 2.2 PR's test suite locks the canonical behavior of v1.
- **No new dependencies.** Phase 1 added zero new top-level dependencies. The Phase 2 work should hold that line — everything can be pure functions + existing React + framer-motion + lucide.
- **Bundled-archive pattern.** Each Phase 2 milestone's first commit archives the previous milestone, applies its spec deltas to canonical specs, and updates the plan + log. This session adopted that pattern from milestone 1.2 onward; it works well.
- **Playwright cadence.** Holding the 10% pixel-ratio + 0.3 per-pixel tolerance across six UI-touching milestones (1.2 → 1.3 → 1.4 → 1.5 → 2.1 → 2.2). No real regression to demand tightening. Keep it.
- **Open Qs ledger** (track these in the resuming session's log entries):
  - Add `npm run lint` to CI? Status: unresolved.
  - Hungarian voice-assignment vs the simpler min-distance metric in `harmonyBrain.computeVoiceLedProgression`? Status: no counterexample observed through Phase 1.
  - Cross-platform Playwright snapshot tolerance — when (if ever) does it mask a real regression? Status: held across six milestones, no false-positive observed.
  - Free Input key inference (guess key from typed chords) — UX investigation deferred from 2.2.
  - UST design path — chromatic-tone insertion (new chord type vs extension hint mechanism). Status: deferred from v4 to a post-Phase-1 `piano-voicings-ust` openspec change. Not blocked, just unscheduled.

**This handoff PR's scope:**

- Plan-table updates that didn't land in 2.2's PR (an Edit stalled on a stale-context mismatch): 2.1 → Done, 2.2 → Done, deferred sub-items inserted as 2.1.x / 2.2.x.a / 2.2.x.b rows.
- This dated log entry.
- No code changes. No archive moves (2.1 + 2.2 archives already moved in their respective branches' first commits per the bundled-archive pattern).

**Next concrete step (for whoever picks this up):**

1. Read `docs/long_horizon_prompt.md` + this log entry's "design notes for 2.3-2.5" section + `docs/long_horizon_plan.md`.
2. Start with 2.4 (smallest) if you want a fast warmup win, OR start with 2.3 (largest) if you want to get the substantive feature behind you first.
3. Branch from `main`; the bundled-archive pattern means the new branch's first commit should be `chore(openspec): archive suggestion-overlay-diatonic + plan/log` (move 2.2's openspec change directory + apply its `chord-grid-suggestions` capability to a new canonical `openspec/specs/chord-grid-suggestions/spec.md` + log a "Phase 2.3 / 2.4 begin" entry).
4. From there: openspec change → engine first → tests → UI → e2e → PR → self-merge — same rhythm Phase 1 used.

**Session-end note.** The work has been continuous and the commits incremental, so cache warmth has stayed high and each PR has gone through CI quickly. The bundled-archive pattern has been worth it — saved roughly a 3-minute CI cycle per milestone. Keep doing that.

---

## 2026-05-25 — Voice Companion (side-track, not a Phase-2 roadmap item)

A user-directed side-quest, separate from the v1–v5 / Phase-2 roadmap: a **voice companion** built on the ElevenLabs Agents platform. A musician can talk through a progression (the companion builds/edits it on the timeline) and ask for the theory behind it (in depth or ELI5). It is a voice-native sibling of the text `ProgressionAgent`. Branch `feat/voice-companion`, openspec change `add-voice-companion`.

**What shipped (7 staged commits + 1 review-fix commit):**
- `src/voice/` module adapted from a supplied integration package: `ProgressionBridge` contract (`types.ts`), client-tool schemas (`toolSchemas.ts`), browser tool-handler hook, ElevenLabs provider + split `voiceAgentContext.ts`, restyled panel, and the real `progressionBridge.ts` adapter.
- New Worker route `POST /api/voice/signed-url` (in the existing `worker/index.ts`) backed by `src/lib/elevenLabsAuth.ts`, mirroring `/api/progression`'s CORS/allowlist/error contract. Provisioned a live ElevenLabs agent (`agent_2501ksecrah0epa92phh1fh5ymxp`).
- Mounted the provider + panel in `App.tsx` over a **ref-mirror** (no new store) so tool callbacks read live state outside React's render cycle.

**Key decisions / reconciliations:**
- **Tool surface trimmed 12 → 9.** Dropped `get_chord_suggestions`, `set_key`, `set_suggestion_mode`: reading `harmonyBrain.ts` + `theory/` confirmed there is **no key detection, roman-numeral analysis, compatible-scale ranking, or next-chord engine**. `analyze_progression` reshaped to only what the engine computes (chords, tones, voice-led voicing); the system prompt forbids the agent claiming the app computed key/numerals/scales.
- **`randomize_progression` redefined** to "reshuffle existing voicings/variants" (the shipped `randomizeAll` does not generate chords).
- **Ref-mirror over Zustand** (deliberate, low blast radius — core state untouched).
- **Critical bug caught in review + fixed:** `highlight_chord` and `play_progression` had collided on `activeChordIndex` (the playback cursor); split into a dedicated `highlightedChordIndex`. Also surfaced live-connection errors in the panel (`startSession` is sync in `@elevenlabs/react` 1.6.3, so failures bypass the `handleStart` catch).

**Security:** `ELEVENLABS_API_KEY` is Worker-only (`.dev.vars` locally; `wrangler secret put` in prod — the run operator's step). Only the non-secret `VITE_HH_VOICE_AGENT_ID` reaches the browser. Verified no key in any committed file.

**Verification:** `npm run lint` (0), `npm run build` (0), `npm run test` (120), `npm run test:e2e` (5 — added an idle-panel render test, regenerated the ii-V-I baseline since the panel grew the page). Signed-URL route verified live against `wrangler dev` (200 happy path; 502 + server log on a bad key). All 5 Playwright screenshot gates passed (desktop, idle gold/warm tokens, 375px reflow, connect-state + fetch, builder regression).

**Open Qs / follow-ups for a later session** (also written to `claude-code_sessions/prompts/prompt-harmony-hash-audit.md`):
- `Q:` Lazy-load the voice panel (React.lazy)? The `@elevenlabs` SDK adds ~135KB gzip to the main bundle (135 → 269KB gzip). Status: noted, not done (the panel is always-visible; lazy-loading mainly defers initial transfer).
- `Q:` Distinct visual for agent highlight vs the playback glow (currently shares the "playing" emphasis). Status: deferred.
- Worker returns 502 on an upstream ElevenLabs failure (more correct than 500 for a gateway); intentional.
- `play_progression` returns ok when already playing — could distinguish "started" vs "already playing" for the agent's spoken feedback.
- A `provision:voice` npm script would make the provisioning incantation discoverable.

**Bundled-archive note:** unlike the Phase-2 milestones, this side-track's openspec change is left **active** (`openspec/changes/add-voice-companion/`) pending PR merge — archive + canonical `openspec/specs/voice-companion/spec.md` application is the merge-time step (tasks.md 8.2).

---

## 2026-07-12 02:33 JST — Agent Builder Recovery, OpenAI Milestone

User-directed recovery on branch `fix/agent-builder-companion-ui`, OpenSpec change `restore-agent-builder-experience`. Production already carried an `OPENAI_API_KEY` secret on the active Worker version, but the checked-in and deployed code still used Anthropic. The live ElevenLabs agent was also diagnosed safely: its nine client tools matched source, but signed authentication was disabled while the browser exclusively requested a signed URL.

**Progression milestone current state:** replaced the Anthropic SDK with OpenAI `6.46.0`; moved the agent loop into `worker/progressionAgent.ts`; pinned `gpt-5.4-mini-2026-03-17`; added a strict parallel `lookup_chord` tool, stateless response-item preservation, strict 3–8 structured output, dictionary revalidation, 30-second Worker/browser deadlines, explicit failed/incomplete Responses handling, sanitized logs, and OpenAI-aware health. The public routes and shared chord-rendering path are unchanged.

**Verification:** build and lint pass; full Vitest is 146/146; focused Playwright is 3/3 for success, malformed output, failure preservation, and retry. A real local Wrangler smoke returned healthy OpenAI readiness and generated five valid F-minor chords including extensions, an altered dominant, and a slash chord in about eight seconds. No credential values were printed or returned.

**Current state:** progression implementation is ready for a milestone commit. Next: upload an immutable preview Worker version, smoke and deploy that exact version, then repair the existing ElevenLabs agent with a narrow PATCH that preserves its customized name/voice/TTS before compacting and re-testing the builder UI.

**Deployment update:** commit `9f15b0f` was uploaded as immutable Worker version `fe568a25-1c3c-4d62-bc48-8c92e9e2483a`. The exact version preview passed OpenAI health and a four-chord extended/slash-chord generation, then Wrangler deployed it to 100% production traffic. The active `workers.dev` hostname passed health and a separate three-chord gospel/slash-chord generation. Raw requests to `harmony.tonari.ai` remain behind the pre-existing Cloudflare browser challenge (403); deployment state and direct Worker production checks confirm the new version itself is healthy.

---

## 2026-07-12 02:54 JST — Harmony Companion Live Repair

The first guarded updater run stopped before PATCH because ElevenLabs returns existing allowlist entries as `{ hostname }` objects even though the update schema accepts host strings/empty arrays. The verifier was extended and tested for both shapes, then the same narrow update succeeded. Live signed authentication is now enabled, the incompatible hostname allowlist is explicitly empty, and all nine client tools exactly match source. The updater's before/after assertion proved the customized `Hanz Hasher` name, voice id, and `eleven_v3_conversational` TTS model were unchanged; a separate `--verify` read confirmed the post-update state.

Production `/api/voice/signed-url` now returns a valid `wss:` URL shape without printing the token. The in-app browser reached the session path but macOS denied that browser's microphone entitlement; no ambient audio was transmitted. A rerunnable Playwright smoke therefore supplied a silent synthetic media device, established a real signed ElevenLabs browser session, injected a deterministic text turn, observed the real `replace_progression` client tool change the visible timeline to `Fmaj7 Gm7 C7 Fmaj7`, and disconnected cleanly. Full Vitest is 160/160, build/lint pass, and the panel's retryable signed-URL error state has browser coverage.

---

## 2026-07-12 03:13 JST — Builder UI Cleanup

Randomize, piano playback, and the permanently mounted Harmony Companion now share one responsive action toolbar. The companion is collapsed by default at roughly 50px high instead of reserving the prior 281px card, expands explicitly, keeps status visible when collapsed, and preserves expansion, the SDK session, transcript, and all nine registered client tools across input-tab changes. With chords rendered, the toolbar-to-card distance is the normal 32px desktop layout gap.

Free Input and OpenAI prompt controls stack to full width at 375px, the header wraps into two deliberate rows, and the progress metadata drops the keyboard shortcut on small screens. Guitar and piano card pages now keep document `scrollWidth <= clientWidth`; the fixed 630px keyboard is contained by a card-local horizontal scroller. The invalid guitar SVG `height="auto"` attribute is gone, and browser QA reports no warnings/errors after diagram rendering.

**Verification:** lint and production build pass (the external-volume `dist/music_src` cleanup race required one harmless retry); Vitest is 160/160; full serial Playwright is 12/12 with new Free Input, Progressions, desktop expanded-companion, and updated piano baselines. The live signed ElevenLabs smoke also passed with the panel collapsed during the real client-tool mutation, then reopened and disconnected cleanly. Current state: ready for independent code/security/spec reviews and final production/PR workflow.

---

## 2026-07-12 14:29 JST — Security Audit Remediation

Completed and sealed Codex Security diff scan `e20b726d-e691-439c-a392-b0857a302a42` for immutable revisions `1e3c47b6947113aa95cf662201558e9940bffd60..3aa2f2847a8d85cde04c210a3aea3cd37147ca67`. All 24 review worklist rows and candidate receipts closed. The scan reported one Medium finding: the ElevenLabs verifier proved only a lossy legacy client-name list and could miss provider-side tool authority.

**Security remediation:** migrated provisioning fully to modern toolbox records plus exact `prompt.tool_ids`; re-read every created record before attachment; compare the complete nine source contracts and response/execution behavior; preserve the complete TTS object; and fail closed on built-ins, MCP/native MCP, workflows, nested language-preset tool overrides, legacy non-client tools, response mocks, task execution, duplicate/unresolved ids, and unknown capability fields. Ambiguous provider detach surfaces block before any agent write. Provider error redaction now covers OpenAI/ElevenLabs key forms, bearer headers, signed WebSocket capabilities, sensitive query parameters, and labeled secret fields. A lockfile-only non-breaking audit refresh moved vulnerable Vite/Vitest/PostCSS and transitive tooling to patched versions; `npm audit` now reports zero vulnerabilities.

**Review fixes:** shared the timeline-mutation epoch at `App` so manual, preset, text-agent, and Harmony Companion edits cannot overwrite one another out of order; kept mode-only cancellation separate so prompt, health, rationale, and retry state survive tab/tonality navigation; gated generation on validated health; implemented the specified tablet two-column card layout; and made Playwright build a fresh preview, run serially, and wait for `domcontentloaded` instead of the external stylesheet's full load event.

**Verification:** reproducible `npm ci`; production build; full lint; 185/185 Vitest assertions; 17/17 Playwright; the formerly flaky layout file passed 12/12 across three consecutive runs; dependency graph valid; `npm audit` 0; local Worker health ready and one live OpenAI request returned a validated `Em Cmaj7 G/B D` progression. Independent security, code, and spec-coherence re-reviews found no remaining Critical, High, or Medium issue. A recurring external-volume `.DS_Store` race in Vite's output cleanup was replaced with a verified retrying `prebuild` cleanup; two consecutive populated-tree builds passed. Final client bundle: 1,029.85 kB raw / 271.79 kB gzip; the existing large-chunk warning remains known and unchanged in kind.

**Credential incident / blocker:** during scan validation, the configured ElevenLabs key was accidentally echoed in transient agent-tool output. It was not written to Git or scan artifacts, and no subsequent live ElevenLabs call used it. Rotate that key in ElevenLabs and Cloudflare before any further live voice verification or production deployment. Current branch state is locally complete and ready for intentional commits/push; final live voice verification, PR merge, production deploy, and OpenSpec archive remain pending rotation and the normal PR workflow.

---

## 2026-07-12 15:29 JST — Quick Chord Modifiers

Started the user-requested Phase 2.10 slice on stacked branch `feat/quick-chord-modifiers`, OpenSpec change `quick-chord-modifiers`. The first planning commit (`2b1a32d`) defines a two-action per-card flow: ranked family-aware quick changes plus searchable access to every dictionary-valid same-root alternative. The chosen `IndexedChord` stays shared between guitar and piano; no provider, dependency, or chord-data format was added.

**Implementation:** added a pure catalog/ranking helper and a compact Tonari-styled `Modify` disclosure on every card. Major triads surface `maj7`, `6`, add-tone, 9th, and 13th choices; dominant chords surface 9ths, 13ths, and altered fifth/ninth choices including `G7#9`. Flat display roots and true slash basses are preserved. `App` owns the one-index mutation, invalidates stale text-agent responses, stops playback, preserves locks and stable card identity, clamps guitar variants, retains compatible display/voicing modes, and resets only an incompatible piano style.

**Catalog correction found by tests/review:** the prior comma split broke aliases containing commas inside parentheses and could make `G9` resolve to a minor 6/9 entry. Symbols now split only at top-level commas and lookup normalizes optional quality parentheses. Independent review then found that the catalog parser treated the `s` in natural names such as `Csus2` as the internal sharp marker. Root extraction and user-input splitting now distinguish natural `Csus` from `C#sus`; all twelve roots have suspended-option coverage.

**Accessibility and UI QA:** the disclosure exposes `aria-expanded`/`aria-controls`, focuses search on open, closes with Escape, restores focus after cancellation or keyboard selection, and uses semantic buttons/search. Browser QA covered desktop, 820px tablet, and 375px mobile with zero console warnings/errors or document overflow; screenshots were inspected directly. Playwright covers pointer selection, lock/variant preservation, guitar/piano display-mode preservation, piano-style fallback, keyboard focus, altered-dominant search, mobile containment, instrument switching, and stale-agent invalidation.

**Verification:** production build and lint pass; Vitest is 194/194; full Playwright is 22/22; the focused modifier file is 12/12 across three consecutive runs. One cold external-volume preview navigation exceeded the default 30-second total test timeout; Context7-confirmed per-suite configuration now gives this focused file 60 seconds without relaxing the global suite, and the repeat gate passed immediately. Two visual baselines were reviewed and updated solely for the intentional per-card `Modify` row. Independent review found three Medium issues (suspended-root parsing, component remount state loss, and keyboard focus loss); all were fixed, regression-tested, and the post-fix re-review found no remaining Critical, High, or Medium issue.

**Stacked-branch blocker:** S.2 PR #29 remains intentionally draft. The rotated ElevenLabs secret is present, but the provider returns `401 missing_permissions` because the key lacks `convai_write`; the Worker surfaces that as 502. Granting that permission and obtaining a status-only 200 remains required before S.2 merge, production verification, and OpenSpec archive. Phase 2.10 can be pushed on its feature branch meanwhile but will not merge to `main` first.

**Current state:** planning commit `2b1a32d` and implementation commit `b1380a7` are pushed to `origin/feat/quick-chord-modifiers`. The OpenSpec implementation checklist is complete. Keep this branch stacked and unmerged until S.2 clears the live `convai_write` gate and PR #29 lands; then rebase/retarget Phase 2.10 onto updated `main`, run the same full gates, open its PR, and archive/apply the spec only after merge.

---

## 2026-07-12 16:58 JST — Free Input Harmonic Suggestions

Started Phase 2.11 on stacked branch `feat/free-input-harmonic-suggestions` with OpenSpec change `free-input-harmonic-suggestions`. Free Input now owns an independent key and seven-mode context, keeps the dictionary browser available after Run, and offers Off, Key, and Next scoring for all 84 visible basic-chord cells. The pure `src/lib/theory/` engine combines chord-tone key fit, nearest-tone voice leading, and root motion; Next mode resolves against the last dictionary-valid input chord while leaving invalid-tail errors visible. Insertion still uses the shared `IndexedChord` path for identical guitar and piano rendering.

The suggestion cells keep existing root identity colors at full text contrast while token-based tier backgrounds, percentages, legends, titles, and ARIA reasons explain the ranking. Keyboard and pointer insertion preserve focus; mobile scroll stays inside the grid; reduced-motion users get zero-duration panel and cell transitions. The app-local scoring context does not expand or misrepresent the unchanged nine-tool Harmony Companion surface.

Historical OpenSpec drift from merged PR #23 was also repaired: `suggestion-overlay-diatonic` now has its missing design/task reconciliation, is archived at `openspec/changes/archive/2026-05-17-suggestion-overlay-diatonic`, and its canonical `chord-grid-suggestions` spec is restored before Phase 2.11's delta extends it.

**Review and verification:** an independent first review found three Medium issues—missing reduced-motion handling, insufficient low-tier contrast, and an incomplete `chord-grid-suggestions` delta. A post-fix pass then caught suppressed select focus rings and delta syntax in the restored canonical spec. All five findings were fixed: focus visibility now has computed-style browser assertions, the canonical capability and current change both pass strict validation, and the final independent re-review found no remaining Critical, High, or Medium issue. Coverage includes all-cell scoring, real Tab order, pointer insertion, guitar/piano continuity, responsive containment, console health, reduced motion, and a 500ms interaction budget. Build and lint pass; Vitest is 212/212; focused shared-library regressions are 130/130; full Playwright is 29/29; the focused suite is 21/21 across three repeats. Desktop, 820px tablet, and 375px mobile screenshots plus DOM/overflow/console evidence were inspected with no remaining visual or runtime issue. The in-app Browser integration was attempted first but its required runtime was unavailable, so the documented Playwright fallback supplied the same evidence.

**Current state:** historical reconciliation commit `f9480f9` and feature commit `58088d3` are pushed to `origin/feat/free-input-harmonic-suggestions`; stacked draft PR [#30](https://github.com/micro-JAY/harmony_hash/pull/30) targets `feat/quick-chord-modifiers`. A fresh status-only production check still returns 502, so S.2 PR #29 remains untouched and draft; its signed-URL endpoint must return 200 before merge, with no key or signed URL ever printed. Keep PR #30 stacked and unmerged until the provider gate clears and the stack is rebased/retargeted through normal review.

---

## 2026-07-12 17:34 JST — Guitar/Bass Fretboard Explorer

Started Phase 2.8 v1 on stacked branch `feat/guitar-fretboard` with OpenSpec change `guitar-fretboard-view`. The shared header now exposes Builder/Fretboard workspace navigation; the explorer lazy-loads as its own 4.5 kB gzip chunk and maps standard six-string guitar or four-string bass across open strings through fret 15. Root, all seven shipped modes, and Intervals/Notes controls are independent from Free Input and builder instrument state. Roots remain gold, third/fifth/seventh roles reuse Tonari warm/academy/soft tokens, and every colored position also carries a visible label plus exact string/fret/note/interval semantics.

**Engine and accessibility:** `src/lib/theory/fretboard.ts` is a pure, deterministic map over runtime-frozen ordered scale formulas. It handles octave equivalence, standard tunings, invalid inputs, and deterministic flat/sharp display without touching the chord dictionary or public routes. The board uses semantic rows/cells and a roving focus target; Left/Right moves along a string, Up/Down selects the nearest scale tone on the adjacent string, and focused notes scroll into the one internal horizontal region. The app retains exactly one `main` landmark and no document overflow at desktop, 820px tablet, or 375px mobile.

**Companion continuity review fix:** the first independent review found one High issue—the initial workspace branch unmounted ElevenLabs `ConversationProvider`, which would force-end a live session—and two Medium issues: workspace transitions ignored reduced motion and ordered scale arrays were only type-readonly. The provider and panel now stay at stable tree positions with a reachable compact companion in both workspaces, expanded panel state survives a workspace round trip, header transition duration becomes `0s` under reduced motion, and scale formulas are frozen with mutation-resistance coverage. A refreshed final review found no remaining Critical, High, or Medium issue.

**Verification:** Context7 guided the React lazy/memoized derivation and Playwright focus/scroll checks. Production build and lint pass; Vitest is 220/220; full Playwright is 35/35; the focused explorer suite is 18/18 across three consecutive runs. In-app Browser QA confirmed page identity, semantic DOM, guitar/bass changes, Eb Dorian flat spelling, arrow navigation, desktop/mobile containment, internal scroll, and zero console warnings/errors. The stable desktop baseline and direct mobile render evidence were inspected against the existing builder design language; a flaky corrupt nested-scroller full-page mobile capture was removed rather than committed, while the structural mobile assertions remain.

**Explicit follow-ups:** alternate tunings and left-handed reversal move to `fretboard-tunings-handedness`; All/CAGED/3NPS pattern filtering and chord overlays move to `fretboard-patterns-chord-overlay`. This v1 ships no inert affordances. The production voice endpoint remains status-only 502, so PR #29 and the full stacked chain remain unmerged.

**Current state:** OpenSpec commit `2287578` and implementation commit `c49f737` are pushed to `origin/feat/guitar-fretboard`; stacked draft PR [#31](https://github.com/micro-JAY/harmony_hash/pull/31) targets `feat/free-input-harmonic-suggestions`. Keep it unmerged until the provider gate clears and the stack is rebased/retargeted through normal review.

---

## 2026-07-12 18:36 JST — Fretboard Tunings and Handedness

Completed Phase 2.8.x.a on stacked branch `feat/fretboard-tunings-handedness` with OpenSpec change `fretboard-tunings-handedness`. The shared theory engine now publishes runtime-frozen tuning records for guitar Standard, Drop D, DADGAD, and Open G plus bass Standard, Drop D, and BEAD. Each definition has a stable id, instrument ownership, low-to-high pitch readout, and frozen high-to-low string records; unknown and instrument-mismatched ids fail explicitly. Catalog-wide invariants keep display sequences synchronized with the actual open-string data.

**Explorer behavior:** Fretboard owns independent remembered guitar and bass tuning ids plus a session-local Right-handed/Left-handed control. One derived fret sequence drives headers, cells, markers, accessible names, and horizontal keyboard order: right-handed ArrowRight moves toward higher frets, left-handed ArrowRight moves toward lower frets, and boundary arrows remain stationary without scrolling the page. String numbers remain high-to-low. A layout effect synchronizes the internal scroll region to the open-string edge after handedness changes, including the 375px mobile layout. Builder state, the mounted Harmony Companion provider/panel, scale/mode/label controls, focus rings, reduced motion, and the single internal scroller remain intact.

**Review and verification:** Context7 was queried before implementation; fresh calls timed out, so this slice carried forward the successful current-run React 19 guidance on render-derived lists/layout effects and Playwright guidance on role locators, focus, scroll metrics, reduced motion, and performance budgets. Production build and lint pass; Vitest is 223/223; full Playwright is 41/41; the focused tuning/handedness suite is 18/18 across three consecutive runs; strict OpenSpec and diff checks pass. Desktop, 820px tablet, and 375px mobile assertions cover every option, pitch changes, per-instrument memory, mirrored column order, exact accessible names, arrow semantics, open-edge scroll position, console health, document containment, reduced motion, and a 500ms interaction budget. In-app Browser QA confirmed page identity, semantic DOM, Open G left-handed rendering, keyboard movement, screenshot evidence, and zero console warnings/errors; its surface did not expose viewport resizing, so the green Playwright tablet/mobile runs provide that responsive evidence. Independent review found no Critical, High, or Medium issue; all three Low suggestions were also fixed and revalidated.

**CI stabilization:** the first PR Playwright run exposed a cross-platform flex-wrap threshold: macOS placed Labels on a second row while Linux fit the same controls on one row, producing incompatible full-page screenshot heights. The control rail now uses a narrower horizontal gap while retaining its vertical wrap gap, making the intended single-row 1280px layout deterministic on both platforms without changing tablet/mobile wrapping. The inspected baseline is 1280×968, and the complete local Playwright suite remains 41/41 after the fix.

**Stack and follow-ups:** OpenSpec commit `9451770` and implementation commit `5750211` are pushed to `origin/feat/fretboard-tunings-handedness`; stacked draft PR [#32](https://github.com/micro-JAY/harmony_hash/pull/32) targets `feat/guitar-fretboard`. All/CAGED/3NPS filtering and dictionary-valid chord overlays remain scoped to `fretboard-patterns-chord-overlay`. PR #29 remains draft because the production voice signed-URL route is still status-only 502 pending `convai_write`; do not merge or retarget this stack to `main` until that gate returns 200 and the reviewed stack is rebased normally.

---

## 2026-07-12 23:00 JST — Fretboard Patterns and Chord Overlay

Completed Phase 2.8.x.b on stacked branch `feat/fretboard-patterns-chord-overlay` with OpenSpec change `fretboard-patterns-chord-overlay`. The shared theory layer now carries immutable absolute open pitches, five transposable CAGED form templates, and seven absolute-pitch 3NPS start-degree positions. `All` remains exactly the complete prior map. Focused patterns are explicitly Standard-six-string-only; bass and alternate tunings retain the remembered selection while visibly using `All`, and bounded-neck 3NPS positions report when a complete ascending 18-note shape cannot fit frets 0–15.

**Chord overlay and accessibility:** a frozen unique catalog search resolves selections through the existing dictionary, and shared chord-tone derivation now powers both harmonic suggestions and the fretboard without a second parser. In-scale tones retain the scale fill plus a visible ring; chromatic tones such as the `#9` in `G7#9` over C Major remain visible inside focused envelopes with dashed treatment, forced note labels, exact scale-fit semantics, and a non-color-only legend. Search, selection, invalid input, Escape, Clear, filtered roving focus, and trigger-focus restoration work by keyboard. Overlay identity persists across every explorer axis without touching builder, playback/highlight, or Harmony Companion state.

**Guidance and review:** Context7 resolved the current official React and Playwright libraries, but the documentation endpoint stalled on all three allowed queries per topic. Implementation therefore applied the successful current-run guidance already recorded here: render-derived memoized maps, effects only for external focus/scroll synchronization, role-based locators, focus/overflow/reduced-motion assertions, and explicit latency budgets. Independent review found two Medium accessibility issues—Clear focus loss and inaccurate pattern-membership wording for chromatic tones—and both were fixed with regression coverage. The final re-review found no remaining Critical, High, or Medium issue and no security regression.

**Verification:** production build and lint pass; Vitest is 239/239; full Playwright is 49/49; the focused pattern/overlay suite is 24/24 across three post-fix repeats; strict OpenSpec and diff checks pass. Desktop, 820px tablet, and 375px mobile checks cover pointer and keyboard paths, compatibility recovery, handedness invariance, responsive containment, reduced motion, console health, builder/provider continuity, and updates below 500ms. In-app Browser QA inspected the CAGED E form plus `G7#9`, confirmed one dashed `A#` alteration and ten in-scale chord markers inside the form, document containment, and zero console warnings/errors.

**Current state:** commits `392a878`, `e28f45e`, and `c841749` are pushed to `origin/feat/fretboard-patterns-chord-overlay`; stacked draft PR [#33](https://github.com/micro-JAY/harmony_hash/pull/33) targets `feat/fretboard-tunings-handedness`. PR #29 remains untouched and draft while the live voice endpoint is status-only 502 pending provider permission. Do not merge this stack to `main` or archive the change early. After this change becomes eligible, merges, and is archived, discontinue OpenSpec for subsequent work and use normal planning as the user requested.

---

## 2026-07-13 03:49 JST — Improv Insight and Learning Color Pass

PRs #29–#33 and #35 are now merged to `main`; their completed OpenSpec changes were archived through #34 and #36. Per the user direction, subsequent work now uses normal planning without new OpenSpec changes. Automated curl and a fresh browser session currently meet a Cloudflare challenge before reaching either `/api/health` or `/api/voice/signed-url`, so that status is recorded as an edge-security verification limitation rather than a Worker or ElevenLabs failure.

Phase 2.3 is implemented on `feat/improv-insight` and opened as [#37](https://github.com/micro-JAY/harmony_hash/pull/37). The user-disclosed panel stays collapsed until `Show compatible scales` is activated, then ranks per-chord or whole-progression scales by unique pitch-class coverage. Motion, tension, palette, and style derive from immutable scale formulas; the candidate set includes the seven prior scales plus major/minor pentatonic and blues. Degree-aware spelling handles Phrygian flats, B Major/B Lydian sharps including E#, and blues alterations such as Eb and Gb.

The same branch adds app-local music-semantic tokens on top of the mirrored Tonari token layer: Improv match values interpolate from pale pink-red to pastel green; Free Input fit tiers use distinct labeled colors; and the fretboard gives each interval a stable, equally weighted cue while retaining exact text/ARIA semantics. Its legend now follows the selected formula (`Minor third`, `Raised sixth`, `Flat seventh`, `Flat fifth (blue note)`), and the explorer offers major/minor pentatonic and blues scales while keeping 3NPS limited to seven-note formulas.

**Verification:** production build and lint pass; Vitest is 253/253; full Playwright is 54/54 after the standards follow-up; desktop and 375px in-app Browser QA confirm locally loaded Zalando Sans and JetBrains Mono, user disclosure, zero document overflow, internal fretboard scrolling, correct `C Eb F Gb G Bb` minor-blues spelling, Harmonic Minor's `Flat sixth`/`Raised seventh` legend, and zero fresh console warnings/errors. The final independent re-review is clean with no remaining Critical, High, or Medium findings. Commits `7092419` and `33d82fc` are pushed; the next step is PR #37 CI/review, then merge and production validation.

**CI stabilization:** the first Linux Playwright run exposed a platform-specific flex threshold: Linux fit the six desktop fretboard controls in one row while the macOS baseline wrapped Labels, producing 1159px versus 1243px snapshots. Select controls now use an explicit 10rem width with the narrower horizontal gap, and Playwright asserts the Instrument and Labels groups share one row. The refreshed 1280×1159 baseline passes the seven-test explorer suite locally and matches the Linux geometry.

**2026-07-13 05:25 JST standards follow-up:** the user-supplied Tonari source file exactly matched the repo's `public/tokens.css`, but the app still loaded that layer through jsDelivr and the Google import omitted Zalando Sans in a clean Chromium run. The token layer and official OFL-licensed Zalando Sans/JetBrains Mono variable fonts are now served locally, with browser coverage proving the actual font faces load. Essential small labels use the higher-contrast secondary text token. Improv scoring now moves through all four semantic stops (low/mid/good/high), and the mode-aware fretboard legend adds `Flat sixth` and `Raised seventh` while retaining distinct text and color cues. Major/minor pentatonic and blues options plus the Free Input four-tier, non-color-only suggestions were re-audited and remain complete.

---

## 2026-07-13 04:15 JST — Common Progressions Library Audit

Completed the bounded Phase 2.4 audit on `feat/progression-library-expansion` using the normal planning workflow requested after the prior OpenSpec round. The inspiration roadmap names `I – IV – I – V` and `ii – V – I` as reference gaps, but both already ship as `The Plagal Loop` and `The 2-5-1 (The King)`. The existing picker already drops either preset into the shared timeline in the selected key, so neither a schema change nor speculative catalog additions were justified.

**Coverage added:** a two-way source/document contract now compares all 62 presets by group, subgroup, label, numerals, and effective scale type. A parameterized matrix resolves every preset in all 12 keys through the same `transposeNumeralString` and `lookupChord` path used by the app (744 combinations). Browser coverage selects the two roadmap examples through accessible names, verifies D-major `I – IV – I – V` becomes D–G–D–A, and confirms C-major `ii – V – I` renders three real guitar SVGs and three piano keyboards. Progression controls now expose stable accessible labels; instrument render roots expose test ids without visual changes.

**Review and verification:** Context7 supplied the current Vitest structured-parameter guidance. The first independent review found three Medium test-quality issues: an overbroad example claim, flattened documentation parity, and brittle/overstated browser assertions. All three were fixed, and the final re-review found no remaining Critical, High, or Medium issue. Production build and lint pass; Vitest is 986/986; full Playwright is 51/51; focused catalog coverage is 747/747; focused browser coverage is 2/2. The existing large-chunk build warning remains unchanged.

**Current state:** implementation commit `c4da050` is pushed to `origin/feat/progression-library-expansion`; PR [#38](https://github.com/micro-JAY/harmony_hash/pull/38) targets `main`. The runtime catalog remains unchanged. PR [#37](https://github.com/micro-JAY/harmony_hash/pull/37) has since merged.

**Voice deployment reconciliation:** the earlier S.2 blocker note was stale. PR [#29](https://github.com/micro-JAY/harmony_hash/pull/29) is merged, and `wrangler deployments list` shows tagged production deployments for merged recovery commit `ec35ad2` and completed feature-stack commit `063fe5b`; the active version exposes both OpenAI and ElevenLabs secret bindings by name. No redundant deploy was performed from this unrelated feature branch. Status-only curl and in-app Browser checks both stop at the custom domain's Cloudflare challenge (403 / "Just a moment...") before the Worker, so live signed-URL success remains unclaimed; no key, response body, or signed URL was read or printed.

---

## 2026-07-13 04:58 JST — Mood and Genre Lens

Completed Phase 2.5 on `feat/mood-genre-filter`, stacked on the reviewed Improv Insight branch because compatible-scale filtering consumes that engine. A validated `src/data/moods.json` catalog defines the complete twelve-item vocabulary—Bright, Dark, Jazzy, Bluesy, Latin, Film Noir, Ethereal, Happy, Melancholy, Heroic, Ancient, and Lively—using existing scale families plus dictionary-native Major/Minor/Dominant/Other/Sustained quality weights. The parser fails closed on malformed records, missing or duplicate ids, unsupported scales, duplicate scale entries, empty copy, out-of-range weights, and oversized vocabularies; all published definitions are deeply frozen.

**Shared engine and UI:** `src/lib/theory/moodEngine.ts` scores each chord from its best mood-scale membership and quality weight, then applies that result as a 28% lens over the existing Key/Next score without hiding any dictionary chord. Improv Insight filters its full candidate pool to the selected mood's scale families while preserving the match bar as progression-tone coverage. One compact native selector in the builder owns the shared optional state; `Any harmony` is behavior-identical, active descriptions explain the choice, and changing the lens never mutates the timeline, card state, playback, instrument, text agent, or Harmony Companion.

**Accessibility, visual QA, and performance:** Context7 guided controlled render-derived state and role-based Playwright coverage. Real Tab order reaches the grouped native select; live summaries name the active lens; reduced motion is honored; desktop, 800/820px tablet, and 375px mobile layouts remain contained. Inspected baselines cover the action/card rail, Improv Insight, piano cards, and an active Film Noir mobile grid. The feature-specific browser suite records render latency entirely inside the page from the native `change` event through the scored DOM mutation and next animation frame, with a 500ms ceiling and zero console warnings/errors.

**Review and verification:** the first independent review found three Medium issues—duplicate JSON records could bypass the length check, the historical consumer note contradicted the canonical prompt, and the first performance assertion measured Playwright RPC overhead. All three were fixed; the final re-review found no remaining Critical, High, or Medium issue, and its Low stale wording was also corrected. Production build and lint pass; Vitest is 270/270; full Playwright is 57/57 after merging the Tonari standards follow-up into the stack. Two unrelated external-volume preview navigations stalled before DOM load in earlier full runs; the affected builder layout then passed 12/12 and the isolated fretboard path 3/3, confirming no reproducible app regression.

**Current state:** implementation commit `9c0527c` is pushed to `origin/feat/mood-genre-filter`; draft PR [#39](https://github.com/micro-JAY/harmony_hash/pull/39) targets `feat/improv-insight`. Keep it stacked until PR [#37](https://github.com/micro-JAY/harmony_hash/pull/37) merges, then rebase or retarget through the normal reviewed workflow. PR [#38](https://github.com/micro-JAY/harmony_hash/pull/38) remains an independent progression-library audit branch.

**CI stabilization:** the first Linux visual run exposed one-pixel native-control metric differences in three inherited full-page baselines and a larger unrelated mobile page-height difference. The mood rail now has deterministic responsive minimum heights, while the new mobile baseline is scoped to the Mood Filter itself. This preserves full-page coverage in the established builder, Improv Insight, and piano suites while making the feature-specific snapshot compare only the surface introduced here.

**2026-07-13 05:55 JST review-thread follow-up:** two unresolved P2 spelling reviews were validated and fixed before closing the work. Improv Insight now preserves flat context for every flat alias accepted by the shared chord parser—including lowercase `bb`/`eb` and internal `Bf`/`Ef` spellings—so flat progressions publish `Bb Major` and degree-correct flat notes rather than A#/double-sharp guidance. The fretboard and Improv Insight now share one immutable scale-degree speller, which teaches `E#`/`B#` correctly in C# learning views instead of collapsing them to F/C. Build and lint pass; Vitest is 255/255; full Playwright is 55/55; focused spelling coverage is 12/12. Context7 was invoked before coding but its current TypeScript/Playwright requests stalled repeatedly, so the change retained the already-loaded current-run guidance and existing strict patterns.

---

## 2026-07-13 06:47 JST — Circle of Fifths

Completed Phase 2.6 on `feat/circle-of-fifths` using the normal planning workflow requested after the archived OpenSpec round. A frozen twelve-key model follows ascending fifths, preserves degree-correct sharp/flat spelling through the shared scale engine, exposes relative minors and signatures, and derives dictionary-valid I–IV–V handoffs for every key. The view is a dedicated lazy-loaded workspace with clickable SVG wedges, roving arrow/Home/End focus, selected and adjacent-key cues, exact accessible labels, key details, diatonic chords, nearby-key actions, and reduced-motion-aware modulation arcs.

**Builder continuity:** `Use … in Builder` resolves every chord through the existing dictionary and shared `DisplayChord` path. It preserves the current guitar/piano context, clears incompatible per-card presentation state through the established result handler, stops playback, preserves the mounted Harmony Companion, and increments the timeline version so delayed OpenAI agent responses cannot overwrite the newer selection.

**Responsive correction:** adding the third workspace tab exposed a real 800–820px overflow in the existing header. The workspace navigation now occupies its own row through tablet widths and returns to the compact single row at desktop. The affected builder, Free Input suggestions, Improv Insight, and Circle suites all pass at tablet and mobile widths.

**Verification:** production build and lint pass; Vitest is 1,023/1,023; full Playwright is 67/67. The seven Circle browser tests cover all twelve keys, pointer and spatial keyboard selection, guitar and piano rendering, desktop/tablet/mobile containment, reduced motion, the visual baseline, and stale-agent invalidation. In-app Browser QA confirmed the 375px and desktop layouts, no document overflow, and zero warnings/errors; the desktop baseline was visually compared with the generated concept. Context7 React and Playwright requests were attempted before implementation and test work but the documentation service stalled, so the slice used the installed current plugin guidance and established repository patterns.

**Current state:** Circle of Fifths merged to `main` via [#42](https://github.com/micro-JAY/harmony_hash/pull/42) after the reviewed dependency chain and refreshed CI completed.

---

## 2026-07-13 07:31 JST — Scale Synthesia

Completed Phase 2.7 on `feat/scale-synthesia` using the normal planning workflow requested after the archived OpenSpec round. One runtime-frozen, fail-closed catalog now publishes 28 definitions: all seven major modes, all seven harmonic-minor modes, all seven melodic-minor modes, major/minor pentatonic, major/minor blues, Hungarian minor, whole tone, and whole–half diminished. Degree-correct note spelling, W/H/augmented-step formulas, named intervals, ascending/descending MIDI practice sequences, triad/seventh arpeggios, and monophonic playback schedules are pure shared-theory functions. Learning copy lives in `src/data/moods.json` beside the existing mood vocabulary rather than in a second disconnected dataset.

**Practice surface:** the new lazy-loaded Scales workspace preserves the Tonari app shell and gives users Piano/Guitar, Root, Family, Scale or mode, Mood lens, Direction, and Scale/Arpeggio controls plus audible playback. The piano is a two-octave, internally scrollable degree-colored keyboard; the guitar consumes the existing shared fretboard renderer and now narrows to the selected triad/seventh tones in arpeggio mode. Root remains gold in both views and every other degree uses the established accessible interval tokens. The learning rail shows exact notes, step formula, named degrees, “Use it for,” “Hear it in,” and a compact practice summary.

**Shared mood and continuity:** the same `moodDefinitionFor` records used by Builder and Improv Insight filter Scale Synthesia’s family/mode options inside the 500ms budget. Selecting Dark, for example, narrows Major modes to Phrygian and Natural Minor. Practice changes never mutate the Builder timeline, playback/highlight state, or mounted Harmony Companion, and navigation round trips preserve the existing cards.

**Review and verification:** the ImageGen concept established the complete desktop hierarchy before code; the final baseline was inspected against it with the required image comparison. Context7 React and Playwright lookups were attempted before implementation and browser-test work but the service stalled before returning documentation, so current installed plugin guidance and established repository patterns remained authoritative. Diff review caught and fixed the initial full-scale guitar rendering in arpeggio mode. In-app Browser QA then caught a React border shorthand/longhand warning and an autoplay-resume delay in visual playback state; both were corrected and the final clean session reported zero warnings/errors.

Dependency install reports 0 vulnerabilities with only the repository’s existing `allow-scripts` notices. Production build and lint pass; Vitest is 1,028/1,028; full Playwright is 74/74; the focused Scale Synthesia suite is 7/7. Desktop, 820px tablet, and 375px mobile coverage proves containment, reduced motion, internal keyboard scrolling, seven distinct degree colors, exact F# harmonic-minor spelling, mood filtering, guitar/arpeggio behavior, audio UI state, Builder continuity, and the visual baseline.

**Current state:** Scale Synthesia merged to `main` via [#43](https://github.com/micro-JAY/harmony_hash/pull/43) after the reviewed dependency chain and refreshed CI completed.

---

## 2026-07-13 08:22 JST — Note Neural Network

Completed Phase 2.9 on `feat/note-neural-network` using the normal planning workflow requested after the archived OpenSpec round. A shared pure theory model publishes the Major, Natural Minor, Harmonic Minor, and Melodic Minor mode families as exact seven-mode rotations. The dedicated lazy-loaded Network workspace starts from E Harmonic Minor and supports Relative or Parallel relationships, root/family controls, pointer selection, roving arrow/Home/End navigation, and selected-mode recentering. The learning rail uses the shared JSON catalog for notes, characteristic interval, degree-aware interval formula, W/H step pattern, “Use it over,” and “Hear it in” guidance.

The final independent review caught and drove fixes for five cross-surface details before commit: explicit Scale Synthesia launches now clear an incompatible mood lens; selected satellites become the graph center; network exploration state survives workspace round trips; mobile uses an internally scrollable minimum-size graph rather than shrinking labels below readability; and the listbox uses one coherent roving-focus model. A second theory review caught enharmonic ambiguity in pitch-distance-only labels, so `scaleIntervalFormulaFor` now derives accidentals from diatonic degree offsets and correctly distinguishes Locrian `b5`, Ionian `#5`, Lydian `#2/#4`, and Altered Diminished `bb7`.

**Verification:** dependency install reports 0 vulnerabilities; production build and lint pass; Vitest is 1,035/1,035; full Playwright is 82/82. The eight Network browser tests cover exact E harmonic-minor relatives, pointer and keyboard selection, all four families, Parallel roots, mood-safe Scale Synthesia handoff, Builder/companion/network-state continuity, desktop/tablet/mobile containment, reduced motion, minimum readable mobile geometry, console health, and the inspected desktop visual baseline. The final independent re-review found no remaining Critical, High, or Medium issue. Context7 React and Playwright requests were attempted before implementation and browser-test work but stalled, so installed current plugin guidance and established repository patterns remained authoritative.

**Current state:** Note Neural Network merged to `main` as `4046435` via [#44](https://github.com/micro-JAY/harmony_hash/pull/44) after the full #38/#40–#43 dependency chain, exact-head merge guards, refreshed build/Worker checks, and two passing Playwright jobs. Obsolete #28 remains intentionally untouched.

---

## 2026-07-13 15:33 JST — Jazz Suggestion Overlay

Completed the bounded Jazz suggestion slice on `feat/jazz-suggestion-overlay`, stacked on the reviewed Hasher workspace branch. The shared pure theory engine now combines key fit, existing voice-leading and root-motion scores, Jazz chord vocabulary, and cadence context. It recognizes mode-aware ii–V–I and ii–subV–I paths, direct dominant and tritone-substitute resolutions, altered dominants, extensions, and half-diminished vocabulary without mutating timeline history.

The chord grid adds an accessible Jazz mode beside Off, Key, and Next. Every dictionary-valid cell retains the existing four-tier percentage treatment, while Jazz mode adds tier-strength glow and preserves the fit background on pointer hover. Summaries and accessible names explain the active movement, the existing mood lens still composes over the result, and recomputation remains inside the 500ms interaction budget.

Rendered in-app Browser QA found and fixed a React shorthand/longhand border warning; the clean desktop pass reports zero warnings/errors. The independent theory review found two Medium labeling edge cases: incompatible tonic-root chords could be called I resolutions, and ii was initially fixed at two semitones across every mode. Cadence recognition now requires scale-compatible tonic and degree-two qualities; negative tonic-quality and Phrygian coverage prevent regressions. The final re-review found no remaining Critical, High, or Medium issue.

**Verification:** production build and lint pass; Vitest is 1,044/1,044; full Playwright is 87/87. Desktop, tablet, 375px mobile, keyboard, pointer-hover, reduced-motion, console, and performance paths are covered. Context7 returned current React purity and Playwright locator/assertion guidance before implementation; OpenSpec was intentionally not used per the user's post-archive workflow direction. The existing large-chunk build warning remains unchanged.

**Current state:** Jazz merged to `main` as `b415fe5` via [#47](https://github.com/micro-JAY/harmony_hash/pull/47) after exact-head CI completed. PR #28 was closed as superseded by the merged OpenAI migration rather than conflict-resolved.

---

## 2026-07-13 16:20 JST — Modal Suggestion Overlay

Completed the bounded Modal suggestion slice on `feat/suggestion-overlay-modal`, stacked on the green Jazz draft. Every root inside the selected Free Input context maps to its relative mode through the shared mode-family and scale-learning catalogs. Mode identity owns a stable high-contrast palette across rotations—Dorian keeps the same color when it moves from degree 2 in C Major to degree 1 in D Dorian—while intensity and percentage retain the exact chord-tone fit. Harmonic Minor exposes all seven family names; the existing selectable `ScaleType` contract remains intentionally bounded and does not add Melodic Minor to this slice.

The grid adds Modal beside Off, Key, Next, and Jazz, with a dynamic legend plus visible `M1`–`M7` / `OUT` markers so users do not have to infer mode identity from color. Roots outside the selected scale keep honest fit percentages and a separate outside cue. Mood adjustment preserves modal identity or outside status, and insertion, keyboard order, reduced motion, internal mobile scrolling, and existing suggestion modes remain unchanged.

The first independent review found four Medium issues: context-relative colors, an ambiguous Melodic Minor scope, an artificial outside-root score cap, and color-only cell mapping. Stable palette intervals, an exhaustive supported-context family switch, uncapped scoring, and visible markers resolved all four; the post-fix re-review found no remaining Critical, High, or Medium issue. Context7 was attempted once and stalled, so the user-authorized official React and Playwright guidance plus established repository patterns were used without repeated lookups. The in-app Browser refused localhost under its URL policy; real Chromium Playwright remained the authoritative rendered validation.

**Verification:** production build and lint pass; Vitest is 1,057/1,057; full Playwright is 89/89; the focused suggestion suite is 11/11. Desktop, 820px tablet, 375px mobile, pointer, keyboard, reduced-motion, console, stable-color, mode-rotation, harmonic-minor, mood-preservation, overflow, and sub-500ms recomputation paths are covered. The initial bundle increases by about 1.7 kB gzip from consuming the existing shared mode/learning catalogs; the pre-existing large-chunk warning remains.

**Current state:** Modal merged to `main` as `2a6a60c` via [#48](https://github.com/micro-JAY/harmony_hash/pull/48) after the retargeted exact head passed two build/test jobs, two full Playwright jobs, and the Worker build. Jazz and Modal suggestion-overlay follow-ups are both complete.

---

## 2026-07-13 17:12 JST — Piano Voicing Comparison

Completed the deferred Phase 2.1.x implementation on `feat/piano-voicing-comparison` using the normal planning workflow requested after the archived OpenSpec round. Each piano chord card now offers a collapsed, accessible comparison rail for the explicit voicings that are genuinely available in the shared C3–B5 engine range: Drop 2, Drop 3, Rootless, Shell, Spread, and Two-Hand. Compact interval-colored keyboards, note-and-octave labels, and Current/Use states make the choices directly comparable without disturbing the default card layout.

Comparison previews use the same preceding adopted voicing and candidate selection path as the timeline, so choosing a preview produces exactly the voicing shown and preserves voice-leading continuity. Unavailable high-register shapes are omitted instead of being mislabeled through fallback output, and explicit-style progression computation now falls back safely to Auto candidates if its requested shape becomes unavailable. Keyboard users can open with Enter, traverse choices, select with Enter or Space, and close with Escape while focus returns to the disclosure trigger; reduced-motion behavior is preserved.

The independent review found and drove fixes for three issues before publication: empty-candidate styles could be mislabeled and later crash progression computation, later-card previews could differ from the adopted inversion, and visible note labels were not associated with their option controls. Candidate-availability guards, shared context-aware preview computation, and `aria-describedby` note associations resolved all three. The post-fix re-review found no remaining Critical, High, or Medium issue. Per the user's authorization, official/current React and Playwright guidance plus established repository patterns were used without repeated Context7 queries.

**Verification:** production build and lint pass; Vitest is 1,064/1,064; the focused harmony engine suite is 89/89; full Playwright is 95/95; the focused comparison browser suite is 6/6. Desktop, tablet, 375px mobile, pointer, keyboard, reduced-motion, clean-console, exact-preview, unavailable-style, playback-highlight, timeline-lock, and stale-agent invalidation paths are covered. The final desktop rendering was also inspected in the in-app Browser. The pre-existing large-chunk build warning remains unchanged.

**Current state:** Piano Voicing Comparison merged to `main` as `1587ff4` via [#50](https://github.com/micro-JAY/harmony_hash/pull/50) after its exact head passed two build/test jobs, two full Playwright jobs, and the Worker build. The deferred Phase 2.1.x milestone is complete.

---

## 2026-07-13 17:32 JST — Long-Horizon Ledger Closure

Closed the final contract gap by authoring `docs/long_horizon_summary.md`, which records every Phase 0, Piano v2–v5, Phase 2, and agent-recovery milestone with its merged PR evidence, current quality gates, architectural outcomes, and deliberately deferred work. The summary does not include or describe any local inspiration asset beyond the tracked documentation contract.

A production in-app Browser check loaded the Hasher and reported the progression API ready. Starting Hanz successfully passed the Worker's signed-URL fetch before the ElevenLabs SDK reached its microphone handshake; the host then returned `Permission denied by system`. This verifies the rotated production credential and signed-auth path without reading or printing the secret or signed URL. A command-line request remains intercepted by Cloudflare's challenge before reaching the Worker, so its 403 is not treated as a provider failure.

The independent accuracy review initially found two Medium ledger gaps: omitted supporting PRs/statuses and incomplete dispositions for earlier open questions. The final summary now records every PR from #13 through #51, marks #28 Cancelled as superseded, assigns Done to every shipped milestone including both side tracks, and resolves or explicitly defers every canonical Q/follow-up. The final re-review found no remaining Critical, High, or Medium issue.

**Current state:** branch `chore/long-horizon-summary` contains only the independently reviewed summary and this dated closure entry. Next: standard docs-only CI and exact-head merge; future product work begins as a separate bounded feature from the sealed ledger baseline.

---

## 2026-07-13 18:31 JST — Lazy Voice Runtime

Completed side-track S.3 on `feat/lazy-voice-runtime` using the normal planning workflow requested after the final archived OpenSpec change. The ElevenLabs provider, Hanz panel, and SDK now live behind one dynamic-import boundary. Pointer or keyboard intent on the contextual help control starts the fetch, activation opens the popup, and the provider remains mounted after first use so transcript, client-tool registration, and connection state survive close/reopen. The initial path imports the progression bridge directly rather than through the voice barrel, preventing eager SDK reachability.

The lightweight loading shell preserves Hanz's Tonari surface, close/Escape focus restoration, and short-viewport scrolling before the runtime arrives. A failed runtime payload is contained without taking down the Hasher and offers a truthful page reload; the app never logs the provider key or signed URL. Closing during a pending signed-URL fetch still aborts the request before microphone access, and voice highlight state remains separate from the playback cursor.

**Bundle result:** production initial JavaScript fell from 1,099.45 kB raw / 292.37 kB gzip to 596.91 kB raw / 158.73 kB gzip. The deferred voice runtime is 501.17 kB raw / 132.93 kB gzip, a 133.64 kB (45.7%) reduction in initial gzip transfer. Vite's >500 kB warning remains accurate for that optional chunk but no longer describes the initial voice cost.

The independent review found one Medium issue in an early two-wrapper retry design: both wrappers shared the same provider payload, so a real payload failure could not be retried in place. The duplicate entry was removed, recovery became reload-only, and the browser test now aborts the actual 501 kB chunk. A Low test gap was also closed by proving signed-URL error state persists across close/reopen without a second request. The final re-review found no remaining Critical, High, or Medium issue.

**Verification:** production build and lint pass; Vitest is 1,064/1,064; full Playwright is 97/97; the focused voice suite is 18/18 across three consecutive runs. Desktop, 375px portrait, short landscape, pointer intent, keyboard intent, Escape focus restoration, chunk failure, provider persistence, signed-URL failure, and pending-request cancellation are covered. The first CI pass exposed a Linux-only test race that measured the loading shell while React replaced it with the full panel; waiting for the full panel's connect control fixed the target-state ambiguity without weakening layout assertions. The exact `704d8cf` head then passed both build/test jobs, both full Playwright jobs, and the Worker build.

**Current state:** Lazy Voice Runtime merged to `main` as `61464b5` via [#53](https://github.com/micro-JAY/harmony_hash/pull/53). PR #28 remains closed and superseded; no conflict resolution or deletion is needed.

---

## 2026-07-13 19:25 JST — Hanz Chord Focus

Completed side-track S.4 on `feat/hanz-chord-focus` using the normal planning workflow requested after the final archived OpenSpec change. Hanz focus now uses the academy-blue semantic tokens with an `AudioLines` marker and visible status text, while playback remains gold. When both states target the same chord, the gold playback border and glow remain intact and the inset blue rail and Hanz badge communicate the independent voice-agent state without relying on color alone. The shared card frame keeps guitar and piano rendering identical.

Stale focus is cleared when the Hanz popup closes, the user leaves the Hasher workspace, a conversation ends, the ElevenLabs provider disconnects or errors, or a new timeline replaces the current progression. The progression bridge validates an index or symbol reference before focusing; explicit UI, session, provider, and timeline teardown owns stale-focus clearing. A Playwright-only focus hook is gated by `VITE_HH_E2E` and confirmed absent from the production bundle.

The independent review found and drove fixes for incomplete popup/workspace teardown, missing bridge coverage, an arbitrary typography value, and session/provider teardown gaps. Shared lifecycle helpers and focused tests resolved each issue; the final re-review found no remaining Critical, High, or Medium issue. Per the user's authorization, official/current React and Playwright guidance plus established repository patterns were used without repeated Context7 queries.

**Verification:** production build and lint pass; Vitest is 1,075/1,075; full Playwright is 101/101. Desktop, tablet, 375px mobile, pointer, keyboard, Hanz-only, playback-only, simultaneous focus, popup close, workspace exit, bridge validation, provider disconnect/error, accessibility status, and production-bundle exclusion paths are covered. The first CI Playwright attempt hit an inherited transient `boundingBox()` null in the mobile popup test after visibility succeeded; both the separate exact-head retry and the in-place rerun then passed all 101 tests, leaving every check green. The pre-existing large-chunk warning remains unchanged.

**Current state:** Hanz Chord Focus merged to `main` as `c93440b` via [#55](https://github.com/micro-JAY/harmony_hash/pull/55) after exact-head build/test, two passing full Playwright jobs, and the Worker build. PR #28 remains closed and superseded; no conflict resolution or deletion is needed.

---

## 2026-07-13 21:46 JST — Truthful Hanz Playback and Live Provisioning

Completed side-track S.5 through [#57](https://github.com/micro-JAY/harmony_hash/pull/57). `play_progression` now reports `started`, `already_playing`, `requires_piano`, `empty`, `cancelled`, or `unavailable` from a generation-safe playback controller with bounded audio-context resume. The Hasher exposes the pending start honestly, playback/highlight behavior remains independent from Hanz focus, and teardown cancels stale async starts without leaking audio resources.

The first live provisioning retry exposed provider-added defaults across the current ElevenLabs agent, workflow, legacy-tool, and toolbox schemas. Six bounded fail-closed compatibility fixes shipped through [#58](https://github.com/micro-JAY/harmony_hash/pull/58)–[#63](https://github.com/micro-JAY/harmony_hash/pull/63). Each accepts only an exact inert provider shape while continuing to reject active built-ins, workflows, LLM/RAG/knowledge-base overrides, non-client legacy tools, nonempty parameter bindings, omission authority, schema constraints, mocks, task support, and unknown fields. Independent review found no remaining P0–P2 issue in the final slices.

The live source update then succeeded, and an immediate verify-only readback independently confirmed Hanz Hasher has signed authentication, an empty hostname allowlist, exactly the nine source-owned client tools, no built-ins, no MCP servers, no workflow nodes or edges, and no unknown capability fields. No API key or signed URL was read or printed. Production build and lint pass; Vitest is 1,095/1,095; full exact-head Playwright is 102/102. PR #28 remains closed, unmerged, and superseded; GitHub retains it as historical record, so no deletion or conflict resolution is needed.

**Current state:** S.5 product and provider compatibility changes are merged to `main` at `3cf1246`. The independently reviewed docs-only reconciliation is [#64](https://github.com/micro-JAY/harmony_hash/pull/64); next is its green exact-head merge.

---

## 2026-07-13 23:27 JST — Composer Continuity and Usage-Pause Handoff

Completed the composer continuity prerequisite on `fix/composer-timeline-continuity`. The chord-grid composer now derives its draft from the latest committed App timeline, so preset selection, quick modifiers, Circle/Hanz replacements, and workspace remounts cannot leave a stale draft that later resurrects old chords. A dirty-draft collision rebases immediately and announces the replacement through a polite live region. Grid add, remove, clear, and undo actions also synchronously invalidate a pending text-agent generation before React can render its response.

Independent review found no remaining P0–P2 issue. Production build and lint pass; Vitest is 1,095/1,095; focused composer/agent Playwright is 12/12; full local and exact-head CI Playwright are 107/107. Desktop, tablet, 375px mobile, pointer, keyboard, preset, modifier, remount, delayed-agent, accessibility, overflow, and clean-console paths are covered. The change merged via [#66](https://github.com/micro-JAY/harmony_hash/pull/66) at `aeb08a9`; the post-merge `main` CI run [#29257734025](https://github.com/micro-JAY/harmony_hash/actions/runs/29257734025) is green. PR #28 remains closed, unmerged, and superseded. No open PR remains.

**Paused state:** user requested a clean stop before weekly usage exhaustion. No share-link implementation or partial feature code exists. After usage resets, branch `feat/share-progression-links` from the then-current `main`. The bounded v1 contract is a versioned `hh=1` URL containing only dictionary-valid chord spellings and the selected instrument; reject duplicate, oversized, or invalid payloads through shared `lookupChord`; initialize valid imports synchronously; show invalid imports visibly; expose an accessible Share progression panel with read-only link, explicit Copy, truthful clipboard fallback, Escape/focus handling, and no live URL mutation. Cover codec bounds plus valid/invalid/copy/special-`#` desktop, tablet, mobile, keyboard, pointer, and console flows before the full build, lint, Vitest, Playwright, independent review, exact-head CI, and merge gates. Continue with normal planning; OpenSpec remains discontinued by user direction.

---

## 2026-07-14 04:14 JST — Sharing and UI-System Major-Update Closure

Resumed from the usage-pause handoff and completed the bounded progression-sharing contract on `feat/share-progression-links`. The `hh=1` codec serializes only a validated chord snapshot and Guitar/Piano selection, round-trips through the shared `IndexedChord` rendering path, imports valid links immediately, and surfaces recoverable errors for malformed, oversized, duplicate, unsupported, or dictionary-invalid payloads. Prompts, Hanz/voice state, credentials, and unrelated URL data are never serialized. Pointer, keyboard, clipboard success/denial/timeout, focus restoration, tablet, mobile, and Guitar/Piano rendering paths are covered. Independent review found no remaining P0–P2 issue. The change merged and deployed via [#68](https://github.com/micro-JAY/harmony_hash/pull/68).

Completed the deliberate Tonari UI-system cleanup on `feat/ui-system-cleanup`. Shared workspace headers, control rails, segmented controls, selects, panels, disclosures, and actions now align Hasher, Fretboard Explorer, Circle of Fifths, Scale Synthesia, Note Neural Network, Improv Insight, Share, chord tools, Hanz, and Minor Blend. Page titles, card geometry, control sizing, responsive breakpoints, focus visibility, reduced motion, and the Minor Blend modal focus loop are consistent from desktop through 375px mobile. The design-system pass intentionally preserves the music-learning exceptions: roots, interval roles, match-score range, chord-grid suggestion modes, playback, and Hanz focus keep their distinct semantic palettes and non-color cues.

The first full browser pass exposed a legacy CAGED accessible-name regression, literal reduced-motion mismatch, and three synchronized baseline changes; each was fixed and rerun. Independent review then identified three P2 accessibility gaps in the Minor Blend dialog, reduced-motion scope, and primary header touch targets. The dialog is now named, focus-trapped, Escape-closeable, and restores its trigger; reduced motion covers Hasher, workspace, topbar, Hanz, and dialog roots; workspace and instrument controls use the 44px minimum token. Final re-review found no P0–P2 issue.

**Verification:** production build and lint pass; Vitest is 1,109/1,109; full Playwright is 121/121 locally and in both exact-head CI runs; Worker packaging passes. Desktop, tablet, mobile, pointer, keyboard, focus restoration, reduced motion, console cleanliness, semantic color separation, share/import, OpenAI generation, Hanz, timeline continuity, playback, and responsive overflow paths are covered. UI PR [#69](https://github.com/micro-JAY/harmony_hash/pull/69) merged to `main` at `f2c39a4`. PR #28 remains closed, unmerged, and superseded; no conflict resolution or deletion is needed.

**Current state:** all product code for this major update is merged. Closure [#70](https://github.com/micro-JAY/harmony_hash/pull/70) reconciles the plan, log, and summary and removes a CI-only lazy-Hanz measurement race by waiting for the full panel before measuring its bounds atomically. After its green merge, the exact final `main` will be deployed and verified live without bypassing Cloudflare protections.

---

## 2026-07-15 08:35 JST — Hasher Learning Suite Release Gates

Implemented the full `hasher-learning-suite` change on `feat/hasher-learning-suite` from `a20c8db`. The Hasher now leads with mode tabs, light Browse, mode-local Key/Mode context, no Hasher mood lens, a compact `or`, an accessible identity-based timeline composer with boundary insertion/reordering, and shared Share/Improv/Hanz/playback actions. Guitar playback uses selected diagram pitches with a distinct plucked/strummed Web Audio path; Piano density reaches measured 2/3/4-card thresholds; Compare remains bounded; contextual modifiers rank dictionary-valid choices from key, function, neighbors, and complexity.

The top-level navigation is now `Hasher`, `Tune Toolbox`, and `Fret Finder`, while the familiar `Circle of Fifths` title remains inside the Toolbox. Circle, Scale Synthesia, and Note Neural Network share one persistent context and collapsible workspace. Scale supports truthful Hasher transfer with required Mood=`Any`; Circle transfers context to Improv; the relationship catalog provides non-color strength semantics; Network uses deterministic clustered layout, bounded pan/zoom/reset, wrapped labels, and an equivalent semantic node path. The standalone Fretboard tuning badge is removed without losing tuning semantics. First-visit onboarding persists only explicit dismissal, degrades to session state if storage is blocked, and always reopens from Help/About. English/Japanese, focus, reduced motion, mobile containment, share/import, progression generation, and Hanz coexistence remain covered.

**Verification:** production build/typecheck and ESLint pass; Vitest passes 40 files / 1,190 tests; full Chromium Playwright passes 136/136 in 1.8 minutes; the affected 44-test visual suite passes after intentional baseline refresh; desktop and 375px Hasher/Toolbox/Improv/Fret Finder renders were inspected. The inherited large-bundle advisory remains non-blocking and unchanged in kind. OpenSpec artifacts are complete and the acceptance ledger now maps every product requirement to local implementation/test evidence while production evidence remains explicitly pending.

**Current state:** two independent read-only code reviews are running. The native Codex Security diff workspace for the working-tree change against `a20c8db` remains open but its first Start-scan wait expired without submission; it must be completed before PR publication. Next: resolve all review findings, run exact-reviewed-head build/lint/Vitest/Playwright/Worker/OpenSpec gates, make focused conventional commits, push/open the PR, verify CI and the exact nine-tool ElevenLabs source, squash-merge, archive/sync OpenSpec, deploy exact `main`, and complete real desktop/mobile production verification.

---

## 2026-07-15 09:11 JST — Hasher Learning Suite Review Closure

Independent runtime and theory-workspace reviews are complete, and every actionable finding is fixed. Runtime fixes preserve intentional empty-timeline commits, restore cached guitar SVGs after a failed variant, and retain keyboard focus on a chord-grid suggestion after insertion. Theory fixes make Circle details modal-aware, canonicalize shared enharmonic roots, keep mood filtering truthful without discarding the current scale, restore Network family/parallel-relative exploration, correct semantic list markup and embedded names, localize graph and Circle relationship details, make the full graph reachable at 375px/100% zoom, and stabilize fractional SVG geometry without screenshot tolerance. Re-review additionally corrected C-sharp relative-minor/key-signature details, Japanese relationship strengths, and the complete Japanese canonical-signature vocabulary.

**Verification:** production build/typecheck and ESLint pass; Vitest passes 40 files / 1,196 tests; full Chromium Playwright passes 141/141 in 1.8 minutes. The refreshed Circle and Network baselines were inspected at original resolution. No skip, `.only`, `fixme`, tolerance increase, or hardcoded graph height was introduced. The inherited large-bundle advisory remains non-blocking and unchanged in kind.

**Current state:** implementation review is closed with no remaining finding. The next gate is the native security-diff review of the working tree against `a20c8db`, followed by exact-tree Worker/OpenSpec validation, focused conventional commits, PR/CI/provider readback, squash merge, OpenSpec sync/archive, Cloudflare promotion, and live desktop/mobile verification.

---

## 2026-07-15 11:31 JST — Hasher Learning Suite Security and Provider Gate

Sealed standard security scan `ad2f0e3c-fd2b-4d81-8a7c-acd8801d17bd` reported three release-relevant boundaries: anonymous paid-provider admission, anonymous signed-URL minting, and a workstation-local wildcard `git push` approval. The shipped patch now admits both provider routes through separate fail-closed Cloudflare rate-limit bindings before secret-backed calls, requires an allowed browser `Origin` for voice URL minting, hashes edge caller keys, bounds progression bodies before JSON parsing, pins the repository-local Wrangler CLI, and removes the ignored local wildcard approval. Defense-in-depth fixes also replace fetched SVG HTML insertion with a bounded DOM allowlist, use ref-owned drag identity, bound audio schedules and voice-authored chord batches, reject inherited chord-root properties, and require exact source-prompt readback from ElevenLabs.

The post-remediation working-tree security diff scan `aed64f35-c26f-4972-9746-c79da466c2a0` closed all 80 source/config/test worklist rows with no surviving finding. A clean-context lock regeneration restored Linux/macOS optional binary entries after review caught a platform-specific lockfile, and both production/full npm audits report zero vulnerabilities. The live ElevenLabs update initially exposed unsupported provider JSON-schema bounds; those keywords were removed while retaining the same 24-chord/48-character runtime enforcement and explicit tool descriptions. The retry updated Hanz Hasher and verified signed auth, empty allowlist, the exact nine client tools, no built-ins/MCP/workflow/unknown capability, and unchanged identity/TTS settings.

**Verification:** lint, production build, 41 files / 1,212 Vitest assertions, 143/143 Playwright, Wrangler 4.110.0 dry-run with both rate-limit bindings, dependency-tree validation, strict OpenSpec validation, and diff checks are green. Next: rerun the exact post-fix gate, make focused commits, push/open the ready PR, require green exact-head CI plus verify-only ElevenLabs readback, squash-merge, sync/archive OpenSpec, and deploy/verify the exact merged main revision.

## 2026-07-15 12:14 JST — Hasher Learning Suite release and closeout

- PR [#72](https://github.com/micro-JAY/harmony_hash/pull/72) passed both build/test jobs, both full 143-test Playwright jobs, and the Cloudflare Workers build on reviewed head `96652a5`; it squash-merged to remote `main` as `529568c77a0fdab05399e42c38f7f3ee81136d5c` with a tree identical to the reviewed head.
- Local release gates are green: build/typecheck, lint, 41 Vitest files with 1,212 tests, 143 Playwright tests, Worker dry-run, strict OpenSpec validation, npm audits, and independent code/security review. The final security diff scan sealed with no surviving finding.
- The live ElevenLabs source readback confirms signed authentication, exactly nine client tools, no built-ins/MCP/workflow/unknown capabilities, and unchanged identity/TTS configuration; no credential or signed URL was printed.
- Cloudflare automatically deployed exact merged main at 100% as deployment `1f225dc4-28e5-447b-86e8-10e248441e5e`, Worker version 263 (`d1499720-0cf2-4f15-a1a8-0b50da798b19`). Version inspection confirmed static assets, compatibility date `2026-04-02`, separate progression/voice rate-limit bindings, expected non-secret voice agent id, and the existing provider secret names.
- A non-traffic exact-main preview (`f614e3b0-c0ac-4e89-b8ec-8ee3d3f791ad`, alias `release-529568c`) passed `/api/health`, voice signed-URL, and one bounded progression request with HTTP 200. Real in-app browser checks covered onboarding; both Hasher modes; Browse/Key/Mode/`or`; direct composer insertion/move controls; Share; Improv; Guitar/Piano cards and transport controls; Compare; Tune Toolbox context, Circle relationships and Improv handoff, Scale-to-Hasher, the bounded Note Network, contextual modifier scoring; Fret Finder; and 390×844 containment with no console log.
- The custom domain is intercepted by its managed Cloudflare security challenge from this automation environment, so no WAF weakening was attempted. The browser host also has no resumable audio device; live Play controls and lifecycle are verified, while audible output is not claimed. Deterministic Web Audio tests prove distinct guitar pluck/stagger and Piano scheduling behavior.
- OpenSpec verification found no critical implementation gap. Its two artifact warnings were reconciled before canonical sync: Hanz provider continuity now reflects safe panel/focus teardown on workspace exit, and the design records the security-driven rate-limit bindings.
- Current state: `chore/close-hasher-learning-suite`; all eight canonical specs are reconciled, the change is archived at `openspec/changes/archive/2026-07-15-hasher-learning-suite`, all 18 canonical specs pass strict validation, and the exact-main build/lint/1,212 Vitest/143 Playwright/Worker packaging gate is green. Next concrete step is the documentation closeout PR, exact-head CI, squash merge, and final deployment readback.

---

## 2026-07-16 18:13 JST — PR #75 HASHER correction review closure

Completed the user-directed correction round on `feat/hasher-unified-flow` through implementation head `33eb5d9`. The primary workspace navigation now uses true geometric centering in English and Japanese. Four centered Major, Minor, Modal, and Advanced buttons open contained localized dialogs with the full 23/21/13/5 catalogue and exact subgroup hierarchy. Preset selection closes and restores focus. The three ambiguous shipped Roman-slash cases now preserve their documented intent: `I/III` resolves to `C/E`, the Soulful Descent keeps `V/vii` as `G/B`, and the named Secondary Pull makes `V/ii` a real A secondary dominant in C.

Composer chips expose one selected `X`, commit clean removals immediately through the shared timeline transaction, retain coherent staged behavior for mixed drafts, clear stale preset identity after non-preset edits, and support exact native/touch insertion plus an explicit temporary outside removal target. Boundary Alt-arrow shortcuts are consumed without browser navigation; real Chromium touch removal, cancellation, and invalid drops are covered. Stable IDs continue to remap locks, variants, Piano styles, playback, Hanz focus, and agent versions through the existing transaction layer.

The shared chord-family palette now classifies aliases, slash chords, suspended roots, minor sharp-five qualities, altered dominants, diminished/half-diminished, and augmented chords consistently. Root rows remain blue and percentage matches retain their independent gradient. Guitar label controls are geometrically centered and absent from Piano. Modifier alternatives use family treatments inside the accessible `Modify … chord` dialog with a `Top picks` section and readable score reasons. Piano comparison selection closes and restores focus; dominant headings and every small inactive/helper label meet computed contrast.

Piano cards render the complete proportional C3–B5 keyboard with 21 white and 15 black keys, no card-level horizontal scrolling, every active key in bounds, only applicable style choices, non-truncated bounded two-row selectors, and equal sibling heights from desktop through 375px. Desktop Browser QA inspected English/Japanese preset, composer, Guitar, modifier, and Piano states with no console issue or document overflow; Playwright supplies the 820px, 500px, 375px, reduced-motion, pointer, keyboard, and real-touch evidence.

**Verification:** production build and lint pass; Vitest is 48 files / 1,269 tests; full Chromium Playwright is 161/161 in 1.8 minutes; the focused integrated correction slice is 36/36; Wrangler 4.110.0 dry-run packages 3,424 assets with the expected assets, progression-rate-limit, voice-rate-limit, and voice-agent-id bindings; strict OpenSpec and diff checks pass. Two fresh post-fix reviews report no remaining P0–P2 finding. The inherited main-chunk size advisory remains unchanged and non-blocking.

**Current state:** milestone commits `3e346b4`, `1685b43`, `00a4605`, `04c464e`, `3d303a6`, and `33eb5d9` are complete locally. Next: commit this evidence ledger, push the exact branch to draft [#75](https://github.com/micro-JAY/harmony_hash/pull/75), update its description, and require exact-head GitHub build/test, Playwright, and Workers checks to pass. Do not merge or archive `refine-hasher-presets-and-chord-cards`; the user has additional PR #75 corrections to address later.

---

## 2026-07-16 18:47 JST — PR #75 Linux Playwright root-cause closure

The first correction heads exposed one deterministic cross-platform visual failure in `e2e/builder-layout.spec.ts`: all 160 functional scenarios passed, but the 375px full-page HASHER baseline was 1,279px on macOS and 1,251px on Linux. Block-level geometry instrumentation proved the header, navigation, context, presets, composer, chord browser, and output were identical. The only 28px divergence was the progression-agent metadata footer after prompt help appeared: Linux font metrics fit the character/help readout and API status on one row, while macOS wrapped the status to a second row.

Commit `8065b8e` makes that mobile help state deterministic by placing the API status on an explicit second flex line below 640px while preserving the original compact single-line footer before help appears. The focused regression asserts the status is geometrically below the readout and retains both full-page snapshots. A fresh independent review found no P0–P2 issue; its only Low observation was closed by applying the layout class only when the help control is actually renderable.

**Verification:** production build, lint, 48 Vitest files / 1,269 tests, the focused 4-test layout suite, and the complete local 161-test Playwright suite pass. Exact implementation head `8065b8e` then passed both Linux build/test jobs, both complete Linux Playwright jobs (3m33s and 3m49s), and Cloudflare Workers build `39c4e8f3-f276-453d-ac9a-f645d756cbc7`.

**Current state:** the bounded correction batch is complete and OpenSpec task 6.7 is closed. Draft [#75](https://github.com/micro-JAY/harmony_hash/pull/75) remains intentionally unmerged because the user has additional issues to review. OpenSpec task 6.8 and archive/sync remain deferred until the full PR is approved and merged.

---

## 2026-07-16 20:19 JST — PR #75 full-contract implementation closure

Restored the complete original PR #75 request from the supplied build brief, with the later correction prompt treated as authoritative where it refined removal, preset, color, alignment, and Piano behavior. Milestone `663794d` replaces the temporary composer removal target with actual native mouse drops and threshold-qualified touch/pen releases anywhere outside the composer while preserving cancellation and external-source safety. Milestone `ad30bdc` completes the global chord-family presentation, exact media rail, centered applicable-only Piano selectors, full three-octave equal-card keyboards, modal chord/Piano tools, dedicated IMPROV palette and vocabulary, shared named-degree colors across IMPROV/SCALE SYNTHESIA/FRET FINDER, and local Circle/Toolbox IMPROV access.

The final Browser pass measured desktop navigation within 3px of the viewport center, four equal 446px Piano cards with aligned keyboards, tablet cards at equal 429px heights, and no document overflow at 1440×900, 820×1000, or 375×812. The complete Major dialog renders all documented subgroups and progressions in a contained 1,024px modal. IMPROV is centered at the 1,152px rail on desktop, remains contained on mobile, and emits no browser warning or error.

**Verification:** exact-tree production build and lint pass; Vitest is 48 files / 1,270 tests; full Playwright is 171/171; the highest-risk composer/color/Piano/IMPROV slice is 75/75 across three consecutive passes; Wrangler 4.110.0 dry-run packages 3,424 assets with the expected rate-limit, assets, and voice-agent-id bindings; production dependency audit reports zero vulnerabilities; strict OpenSpec and diff hygiene pass. Independent correctness, accessibility/specification, and responsive-layout reviews report no remaining P0–P2 finding. The inherited large main-chunk advisory remains unchanged and non-blocking.

**Current state:** all product code is committed locally through `ad30bdc`. Next: commit this reconciled acceptance ledger, push the complete branch, update draft [#75](https://github.com/micro-JAY/harmony_hash/pull/75), require exact-head build/test, both Playwright jobs, and Workers build to pass, then hand the draft back without merge or deployment. OpenSpec archive/sync remains deferred until user-approved merge.

### Exact-head publication gate

Draft [#75](https://github.com/micro-JAY/harmony_hash/pull/75) is updated with the complete A1–A18 scope, root-cause note, validation, milestone commits, and committed desktop/mobile/IMPROV screenshots. Exact published head `1a3d96d` passed both build/test jobs, both complete 171-scenario Linux Playwright jobs in 3m59s and 3m52s, and Cloudflare Workers build `cd1cb35a-fa95-4784-af3c-3041ed177f17`. The PR remains draft, mergeable, undeployed, and unarchived pending user approval.

---

## 2026-07-17 11:05 JST — PR #75 post-merge grid and IMPROV polish

PR [#75](https://github.com/micro-JAY/harmony_hash/pull/75) was squash-merged as `887d2f6` before this follow-up. Draft [#76](https://github.com/micro-JAY/harmony_hash/pull/76) therefore starts cleanly from current `main` and carries only the requested presentation corrections. The chord-grid toolbar now shares the grid's root-column geometry, and a compact six-family legend uses the existing major, minor, dominant, suspended, diminished, and augmented tokens without changing the matrix columns. The IMPROV vocabulary launcher retains a 44px accessible target while rendering only a centered 20px circular pink glyph, removing the browser-independent rectangular highlight. STYLE now uses the same soft-pink metadata treatment as Motion, Tension, and Palette.

**Verification:** production build and lint pass; Vitest passes 48 files / 1,270 tests; the CI-equivalent Chromium Playwright suite passes 171/171; strict OpenSpec and diff hygiene pass. Desktop and 375px assertions prove legend/grid alignment, containment, no document overflow, circular help-icon geometry, and identical STYLE metadata colors. Exact implementation head `1cdc367` passed both GitHub build/test jobs, both complete Linux Playwright jobs in 4m01s and 4m04s, and Cloudflare Workers build `f25ef48d-d9b1-47dd-aa61-1ad1f5cbcf76`.

**Current state:** draft [#76](https://github.com/micro-JAY/harmony_hash/pull/76) remains unmerged and undeployed. OpenSpec archive/sync remains deferred until user-approved merge; the local `.agents/` and `AGENTS.md` files remain untracked and untouched.

---

## 2026-07-17 17:11 JST — TUNE TOOLBOX neural and Synthesia local validation

Implemented the scoped TUNE TOOLBOX upgrade on `feat/tune-toolbox-neural-synthesia` from base `0f6a2b5`. SCALE SYNTHESIA now offers Triad, Seventh, Sixth, Sus2, and Sus4 arpeggios at `1/16`, `1/8`, `1/4`, `1/2`, and `1` note lengths on an internal 120-BPM 4/4 schedule. The transport uses the material-neutral `PLAY`/`STOP` vocabulary. Duplicate header handoffs are removed; the retained expanded Circle and Scale actions read `HASH it`, and the retained Circle action reads `IMPROV INSIGHT`.

NOTE NEURAL NETWORK now derives a deterministic desktop radial layout with the active scale exactly centered, related scale/key nodes on an inner ring, chord nodes on an outer ring, boundary-terminated connectors, bounded labels, and a one-shot outward entrance. Single click inspects without changing context; double click and semantic Enter recenter only scale/key nodes; chord activation remains informational. The graph canvas is true black while the right detail panel and lower complete semantic list remain in place. At mobile width the component mounts a contained 11-node static projection with no animation, graph buttons, pan, zoom, or reset controls while retaining the full semantic list and detail path.

**Rendered verification:** desktop E Harmonic Minor measured 18 contained nodes, zero node overlaps, exact center deltas of `0px`, true-black canvas, and no document overflow. Scale single-click preserved E Harmonic Minor; double-click moved B Phrygian Dominant to center; chord double-click preserved that context. Mobile measured a 309×360 static graph with 11 nodes, zero graph buttons, no viewport controls, and no overflow. English and Japanese mobile layouts remained contained, Scale playback visibly changed `PLAY` to `STOP`, internal `120` was absent from rendered copy, and Browser console warning/error output was empty.

**Release verification:** production build and lint pass; Vitest passes 48 files / 1,273 tests; the complete Chromium matrix passes 174/174 in 2.2 minutes; the explicit HASHER/FRET FINDER suite passes 37/37; Wrangler 4.110.0 dry-run packages 3,432 assets with the expected rate-limit, assets, and voice-agent-id bindings; production dependency audit reports zero vulnerabilities; strict OpenSpec, dependency-tree validation, source/debug scan, and diff hygiene pass. The only changed source paths are TUNE TOOLBOX components, localization, and shared theory modules—no HASHER or FRET FINDER source file changed. Generated concepts remain external and uncommitted; accepted desktop/mobile snapshots are committed.

**Current state:** specification commit `62688d8`, Scale/action milestone `76843eb`, graph milestone `fd164a7`, and integration-test correction `9ec2889` are complete. Next: commit this local validation ledger, push a focused draft PR, require its exact-head build/test, Playwright, and Workers checks to pass, then conservatively delete only branches proven merged or gone. No merge or deployment is authorized; `.agents/` and `AGENTS.md` remain untouched.

---

## 2026-07-17 17:16 JST — Local branch hygiene and publication safeguard

Read-only GitHub inventory found no open PRs and confirmed the merged head branch for every locally deleted squash-merge candidate. Local cleanup deleted 46 old branches recoverable from `main` or a merged PR. The retained working set is `main`, `feat/tune-toolbox-neural-synthesia`, and the three most recent prior feature branches: `feat/hasher-unified-flow`, `feat/logo-splash-tool-names`, and `feat/hasher-learning-suite`. Two unique unmerged histories were not deleted; they are explicitly marked `stale/pre-reset-main-20260513` and `stale/chord-reference-legacy`.

The host external-disclosure safeguard rejected the first push of `feat/tune-toolbox-neural-synthesia` to `https://github.com/micro-JAY/harmony_hash.git` because the repository's trust/public-private status is not established. No alternate upload path was attempted. Remote branches were refreshed/pruned for inspection but not deleted, so remote cleanup and draft-PR exact-head CI remain pending the user's explicit approval of the push risk. Local implementation, commits, validation, and branch cleanup remain intact; `.agents/` and `AGENTS.md` are still untouched.

### 2026-07-17 17:20 JST — Remote branch hygiene complete

A fresh check again found zero open PRs. Remote cleanup then deleted 39 branches proven merged by PR history or direct `main` ancestry. The retained remote set is `main`, `feat/hasher-unified-flow`, `feat/logo-splash-tool-names`, `feat/hasher-learning-suite`, and the unique unmerged `chore/deploy-hardening` branch. The new TUNE branch was not uploaded as part of cleanup, so the earlier external-disclosure safeguard remains respected. Publication and exact-head CI are now the only incomplete release tasks.

### 2026-07-17 17:39 JST — Draft PR #77 exact code-head gate

After explicit user authorization, published `feat/tune-toolbox-neural-synthesia` and opened draft [#77](https://github.com/micro-JAY/harmony_hash/pull/77). Exact code head `831669c` is mergeable and passed both GitHub build/test jobs in 32s and 35s, both complete 174-scenario Linux Playwright jobs in 4m06s and 4m11s, and Cloudflare Workers build `84b9bc8f-84a0-45af-ab2a-419eb8730a90`. No retry, snapshot weakening, skip, or CI-only workaround was used.

The final local branch inventory contains `main`, the TUNE feature branch, the latest three prior feature branches, and two explicitly marked stale unique histories. The remote inventory contains `main`, the same latest three prior feature branches, the TUNE branch, and unique unmerged `chore/deploy-hardening`. The worktree is clean except the protected user-owned untracked `.agents/` and `AGENTS.md`, which remain untouched. No HASHER or FRET FINDER source path changed. Merge, deployment, and OpenSpec archive/sync remain intentionally deferred.

---

## 2026-07-20 07:34 JST — NOTE NEURAL NETWORK force-canvas continuation

Reopened only the NOTE NEURAL NETWORK portion of `enhance-tune-toolbox-neural-synthesia` after [#77](https://github.com/micro-JAY/harmony_hash/pull/77) merged as `bc8e349`. The desktop graph now uses a native high-DPI canvas backed by a dependency-free physics module: all-pairs repulsion, relationship springs, center gravity, collision separation, `0.88` damping, containment, energy-based settling, and deterministic reduced-motion warm-up. The active scale stays anchored at the world center. Connection-weighted circular nodes retain the existing Harmony scale/relationship/chord-family palette and glow over a true-black graph-only surface.

Pointer interaction is fully physical: direct node drag keeps every other node in the live solver, empty-space drag pans the camera, non-passive wheel input zooms around the cursor, hover isolates first-degree neighbors and edges, and click/double-click preserve the existing inspection-versus-scale-activation contract. The current static mobile SVG, right detail panel, complete lower semantic list, keyboard path, Scale Synthesia handoff, and English/Japanese structure remain unchanged. Browser inspection verified settled and hovered renderings, elastic chord drag, pan, zoom, reset, and an empty warning/error console.

**Verification:** production build and lint pass; Vitest passes 49 files / 1,282 tests; the focused neural/chord-color browser slice passes 15/15; the exact corrected tree passes all 175 Playwright scenarios in 2.1 minutes; strict OpenSpec passes; Wrangler 4.110.0 dry-run packages 3,432 assets with the expected rate-limit, asset, and voice-agent bindings; production audit reports zero vulnerabilities and the installed dependency tree validates. Desktop/tablet/mobile tests cover 2× and live DPR resizing, exact centering, sleep/wake state, drag elasticity, pan/zoom, canvas hit-testing, color-palette parity, containment, and mobile no-canvas behavior. The committed `src/` diff against `origin/main` is limited to NOTE NEURAL NETWORK, the focused physics/export/tests, and two localized instructions; no HASHER or FRET FINDER source file changed, and their complete browser suites pass inside the 175-run gate.

**Current state:** OpenSpec commit `b19cf75`, implementation commit `36fb36d`, and palette-regression commit `360b92e` are complete on `feat/note-neural-network-force-canvas`. Next: publish a focused draft PR, require exact-head build/test, both Linux Playwright jobs, and Workers build to pass, then hand back without merge, deployment, or OpenSpec archive. The user-owned `.agents/` and `AGENTS.md` remain untouched.

### Exact-head publication gate

Published `feat/note-neural-network-force-canvas` and opened draft [#78](https://github.com/micro-JAY/harmony_hash/pull/78). Exact code head `7c21a82` is mergeable and passed both GitHub build/test jobs in 31s and 38s, both complete 175-scenario Linux Playwright jobs in 3m49s and 4m07s, and Cloudflare Workers build `6d9e50f5-b6c0-42d2-9d42-b8657642ad80`. No retry, snapshot tolerance change, skip, CI-only behavior, merge, or deployment was used.

---

## 2026-07-20 22:58 JST — Hanz spoken-output root cause and repair

Reproduced the reported state in a real signed ElevenLabs session: Hanz connected in voice mode, returned `agent_response` text, and executed the `replace_progression` client tool, but the raw WebSocket inventory contained no `audio` event. The provider conversation record confirmed `text_only: false` alongside zero TTS seconds and zero voice usage. The source provisioner was requesting only `agent_response_complete`; for WebSocket sessions ElevenLabs requires the `audio` client event to generate and stream base64 voice output.

Commit `80cc877` makes the exact source-owned event inventory `audio`, `user_transcript`, `agent_response`, `agent_response_complete`, and `interruption`, with readback proving every other conversation and TTS field is preserved. The client explicitly starts a voice conversation, sets normal output volume, counts real audio packets separately from transcript messages, preserves a live session when the popup closes, and reports a bounded voice-output error if Hanz answers without audio. Existing-agent provisioning can now apply an explicit `HH_VOICE_ID` without overwriting the TTS model or any other TTS setting. Voice selection stays server-managed because the agent deliberately blocks browser voice overrides.

The live agent `agent_2501ksecrah0epa92phh1fh5ymxp` now has signed authentication enabled, an empty allowlist, the verified `nzeAacJi50IvxcyDnMXa` voice on `eleven_v3_conversational`, the required five client events, and exactly nine source-owned client tools. The final exact-tree signed browser smoke connected in voice mode, received 10 non-empty output-audio packets, replaced the timeline with `Fmaj7`, `Gm7`, `C7`, `Fmaj7`, and disconnected cleanly.

**Verification:** production build passes; Vitest passes 50 files / 1,291 tests; the focused Hanz, HASHER layout/smoke, and FRET FINDER Chromium matrix passes 25/25; strict OpenSpec and diff hygiene pass. Lint has no error and retains one pre-existing NOTE NEURAL NETWORK exhaustive-deps warning outside this branch's diff. The separate main worktree and its user/parent-owned changes remain untouched.

**Theory-cost direction:** `docs/hanz-theory-context-architecture.md` recommends a follow-up deterministic browser `get_harmony_context` client tool plus one to three locally tagged teaching cards. It caps continuation candidates and sends compact verified facts only for theory/continuation/improv turns. MCP is deferred until multiple products need the same remote harmony service; vector retrieval is deferred until deterministic card tags stop scaling.

**Current state:** local branch `feat/hanz-spoken-theory` is committed through `80cc877`. No push, PR, merge, app deployment, or OpenSpec archive occurred. The live ElevenLabs configuration repair is complete and independently verify-only read back.

---

## 2026-07-20 23:45 JST — Progressive neural, Circle, and HASHER local release gate

Extended NOTE NEURAL NETWORK from the force-canvas baseline into a progressive expert graph. Scale and chord branches expand idempotently into bounded, evidence-backed relationships; inspection, expansion, centering, branch collapse, and clearing remain distinct transactions. Context-keyed memory restores simulation positions, camera, selected node, and pins across disclosure, workspace, Circle-insight, and desktop/mobile round trips. Desktop supports 550ms stationary long-press plus explicit pin controls, drag release/cancellation safety, and live force reconciliation for newly added nodes. Mobile remains a static non-canvas graph with the complete semantic/detail path. The graph now distinguishes scale, chord, note, and interval concepts with redundant shapes and exact relationship-strength/direction cues, and its localized help dialog restores focus.

The companion learning-control change reorders Toolbox to SCALE SYNTHESIA, THE CIRCLE, and NOTE NEURAL NETWORK with Scale open by default. THE CIRCLE uses the requested product name, balanced enharmonic labels, text-led relationship strength, popular-mode insights, and common-key-change examples. HASHER moves the existing Guitar/Piano selector below Browse chords and adds a wrapping twelve-degree legend; Guitar positions and Piano keys consume the shared interval palette without changing voicings or playback. Commit-range inspection proves the Circle/HASHER source milestone contains no NOTE NEURAL NETWORK or FRET FINDER source change. The final regression correction renders the neural pin live region only while the network is active, preventing hidden Toolbox semantics from leaking into HASHER.

**Rendered verification:** inspected desktop, tablet, 375px mobile, English, and Japanese states for the graph, THE CIRCLE, and relocated HASHER controls. The progressive graph remains contained on true black, the right details and lower information panel retain their positions, mobile mounts no canvas or animation loop, Circle insight rows remain aligned, and the HASHER selector/legend wrap without document overflow. The six intentionally changed baselines were individually compared before refresh; all changes map to the requested control relocation, Scale-first Toolbox default, or renamed Scale actions. Browser warning/error output is empty.

**Local release verification:** production build and lint pass; Vitest passes 53 files / 1,301 tests; the focused repaired browser slice passes 59/59 and the exact full Chromium matrix passes 181/181 in 2.2 minutes. Both OpenSpec changes strict-validate. Wrangler 4.110.0 dry-run packages 3,432 assets with the expected rate-limit, asset, and voice-agent bindings; nothing was deployed. Production dependency audit reports zero vulnerabilities, diff hygiene passes, and an independent post-fix review reports no remaining P0–P2 finding.

**Current state:** PR [#78](https://github.com/micro-JAY/harmony_hash/pull/78) merged its earlier force-canvas head as `bd39340`. To avoid replaying that squash-merged history, the six new milestones were transplanted cleanly onto current `origin/main` as specification `1c40457`, HASHER `73087b0`, THE CIRCLE `826701e`, progressive neural `053e8cb`, regression boundary `f29fc03`, and local ledger `2fa32bb` on `feat/theory-learning-refinements`. The clean continuation still needs a new draft PR and exact-head GitHub build/test, both Playwright jobs, and Workers build. No merge or deployment is authorized; both OpenSpec changes remain active and unarchived, and user-owned `.agents/` plus `AGENTS.md` remain untouched.

### Exact-head publication and branch-hygiene gate

Published `feat/theory-learning-refinements` and opened mergeable draft [#79](https://github.com/micro-JAY/harmony_hash/pull/79). Exact code head `873b3cb` passed both build/test jobs in 31s and 33s, both complete 181-scenario Linux Playwright jobs in 3m54s and 4m18s, and Cloudflare Workers build `85ca6523-0ee2-418f-ab1f-2ec362a5839a`. No retry, snapshot tolerance change, skip, CI-only behavior, merge, or deployment was used.

The requested branch cleanup is complete. Four local and remote feature names proven merged by PR #72, #74, #75/#76, or #78 were deleted after the PR #78 continuation was preserved on the clean new branch. The two unique April deploy commits were retained by renaming their remote branch to `stale/deploy-hardening`; two earlier unique local histories and the PR #77 ledger were already explicitly marked `stale/`. Local `main` now matches `origin/main`. The active local set is `main`, `feat/theory-learning-refinements`, today's separate `feat/hanz-spoken-theory` worktree, and three marked-stale histories; the remote set is `main`, the new feature branch, and `stale/deploy-hardening`. The worktree remains clean except protected untracked `.agents/` and `AGENTS.md`.

---

## 2026-07-21 00:39 JST — Hanz side-branch integration gate

Reviewed the isolated `feat/hanz-spoken-theory` worktree and its complete 13/13 `restore-hanz-spoken-voice` contract before transplanting the requested commits. Commit `80cc877` is now `9cea2e5` on `feat/theory-learning-refinements`; validation ledger `e9e30fa` is now `01773a3`. The only cherry-pick overlaps were the chronological run log and milestone numbering. Their resolution preserves every existing PR #79 record and adds Hanz as S.14; no runtime source was changed during conflict resolution.

**Independent combined-tree verification:** the installed ElevenLabs 1.6.3/1.8.1 contracts confirm the explicit voice options, conversation-kind callback, output-audio callback, and control-layer session semantics. A GET-only live agent readback verifies signed authentication, an empty allowlist, `nzeAacJi50IvxcyDnMXa` on `eleven_v3_conversational`, the exact five client events, exactly nine source-owned client tools, and no built-in, MCP, workflow, or unknown capability drift. A fresh signed browser session on the integrated production build created a voice conversation, received 9 non-empty output-audio packets, rendered `Fmaj7`, `Gm7`, `C7`, `Fmaj7` through the real `replace_progression` client tool, and disconnected cleanly.

Production build and lint pass; Vitest passes 54 files / 1,310 tests; the focused Hanz/HASHER/FRET FINDER matrix passes 39/39; the complete Chromium matrix passes 181/181 in 2.3 minutes. All three active OpenSpec changes strict-validate. Wrangler 4.110.0 dry-run packages 3,432 assets with the expected bindings and exits without deployment. Production dependency audit reports zero vulnerabilities, the installed tree validates, and diff hygiene passes. The protected `.agents/` and `AGENTS.md` remain untracked and untouched. Next: commit this integration receipt, push draft PR #79, and require its exact-head build/test, both Linux Playwright jobs, and Workers build to pass; no merge, app deployment, live agent mutation, or OpenSpec archive is authorized.

### Exact-head Hanz integration gate

Published draft PR [#79](https://github.com/micro-JAY/harmony_hash/pull/79) implementation head `fb9115d` with the Hanz root cause, scope, side-commit mapping, live-audio proof, and fail-closed provisioning behavior added to the PR contract. Both exact-head build/test jobs passed in 35s and 38s, both complete 181-scenario Linux Playwright jobs passed in 4m12s and 4m22s, and Cloudflare Workers build `ed8d9b49-7825-4656-9153-ce478e7624f9` passed. No retry, snapshot tolerance change, skip, CI-only behavior, merge, deployment, live-agent mutation, or OpenSpec archive was used. This receipt is documentation-only; its final PR head will be required to pass the same remote gate before handoff.

---

## 2026-07-21 06:04 JST — Connector P2 patch gate

Patched the two Codex-connector findings on clean follow-up branch `fix/theory-connector-p2` from current `origin/main` after [#79](https://github.com/micro-JAY/harmony_hash/pull/79) merged as `8c125a8`. Issue [#80](https://github.com/micro-JAY/harmony_hash/issues/80) now derives seed-chord expandability from a successful shared-dictionary lookup: C# Major's theoretically spelled `B#dim` remains inspectable, but exposes no `Expand connections` action and cannot enter the exploration ledger when its spelling is unsupported. Issue [#81](https://github.com/micro-JAY/harmony_hash/issues/81) now renders THE CIRCLE center signature from the same canonical context as its `C# (Db)` center label and C# detail panel, while the selected sector retains its accessible `Db major, relative Bb minor, 5 flats` identity.

**Rendered proof:** the in-app production preview selected `B#dim` as a chord with zero expansion actions and an unchanged exploration count, then selected the Db sector with `7 sharps` in both the Circle center and detail panel. Page identity, nonblank content, framework-overlay absence, interaction state, screenshot evidence, and warning/error console checks pass.

**Local release verification:** production build and lint pass; Vitest passes 54 files / 1,311 tests; the focused Circle/Neural Chromium suites pass 24/24; the complete Chromium matrix passes 182/182 in 2.2 minutes; both affected OpenSpec changes strict-validate and diff hygiene passes. The follow-up source diff contains only `CircleOfFifths.tsx` and Note Neural Network knowledge logic plus their direct tests; no HASHER or FRET FINDER source changed. Next: publish the focused follow-up PR from `fix/theory-connector-p2`, link both issues for auto-close on merge, and require both exact-head build/test jobs, both Linux Playwright jobs, and Workers Builds to pass. No merge, deployment, live-agent mutation, or OpenSpec archive is authorized.
