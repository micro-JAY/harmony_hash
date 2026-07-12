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
- Pill row of moods above the chord grid or as a sidebar.
- Active mood biases the suggestion overlay (extending 2.2's overlay to "mood-weighted" mode) AND filters the progression library (extending 2.4 with mood-tagged filtering).

Bigger lift than 2.4 because it touches both overlay + library. But shares the theory module v2.2 set up.

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

**Current state:** implementation, UI QA, tests, and review are complete locally. Next: final OpenSpec verification, logical commits, push, and a draft PR stacked on `feat/free-input-harmonic-suggestions`; do not merge to main.
