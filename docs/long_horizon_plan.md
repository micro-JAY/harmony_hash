# Harmony Hash — Long-Horizon Plan

> Milestone tracker for the long-horizon run defined by `docs/long_horizon_prompt.md`.
> Dated decisions, blockers, and open questions live in `docs/long_horizon_log.md`.
> End-of-run ledger goes to `docs/long_horizon_summary.md`.
> Active change proposals live in `openspec/changes/<change-id>/`; archived under `openspec/changes/archive/<YYYY-MM-DD>-<change-id>/`.

Status legend: **Done** · **In Progress** · **Pending** · **Blocked** · **Cancelled**

---

## Phase 0 — Orient

| # | Milestone | Branch | Change-id | PR | Status |
|---|-----------|--------|-----------|----|--------|
| 0.1 | Scope correction + Playwright cadence in the prompt/inspiration/CLAUDE docs | `chore/long-horizon-plan` | (folded into) `long-horizon-plan` | [#14](https://github.com/micro-JAY/harmony_hash/pull/14) | **Done** |
| 0.2 | Long-horizon plan + log + first openspec change | `chore/long-horizon-plan` | `long-horizon-plan` (archived 2026-05-17) | [#14](https://github.com/micro-JAY/harmony_hash/pull/14) | **Done** |
| 0.3 | Lint baseline fix to make `npm run lint` green on main | `chore/baseline-fix` | (no openspec — pure chore) | [#15](https://github.com/micro-JAY/harmony_hash/pull/15) | **Done** |

**Why 0.3 existed.** `npm run lint` exited 1 on main with 6 pre-existing errors + 1 warning (App.tsx unused `_errors`, ChordReferenceGrid + I18nContext fast-refresh boundaries, GuitarChordDiagram set-state-in-effect, worker no-useless-escape). CI only runs build + test, so these drifted in undetected. PR #15 cleaned them all; lint is now exit 0 on main.

---

## Phase 1 — Piano voicings v2 → v5 (PRIMARY)

The canonical roadmap lives in `docs/inspiration/README.md` under "Piano Voicing — Roadmap". Each milestone follows the §3 cadence: openspec change → branch → engine-first impl → exhaustive vitest → UI → before/during/after Playwright (once the harness lands) → PR → self-merge → archive change + apply spec deltas.

| # | Milestone | Branch | Change-id | Capabilities touched | Tests | Status |
|---|-----------|--------|-----------|----------------------|-------|--------|
| 1.1 | **v2 — Voice Leading** — minimal voice movement between consecutive voicings in a progression. Pure engine function `computeVoiceLedProgression(chords): VoicedChord[]` that re-anchors each chord's voicing (via inversion + octave choice) to minimize Σ\|Δmidi\| from the prior chord while keeping all notes in C3–B5. First chord uses existing `computeVoicing` as the anchor. Wire through `ChordCard.tsx` so the piano view consumes the voice-led sequence when a progression has ≥2 chords. | `feat/piano-voicings-v2-voice-leading` | `piano-voicings-v2-voice-leading` (archived 2026-05-17) | `harmony-brain` (engine), `chord-card-display` (rendering note) | 9 new vitest assertions: hand-verified note sets for ii–V–I in C, I–vi–IV–V in C, ii°–V–i in A harmonic minor, repeated-chord vamp stabilization, MIDI 48-83 invariant across 5-note chords + high-root triads + Dm9-G13, common-tone retention, first-chord-equivalence. Manual smoke via Playwright MCP confirmed DOM-decoded MIDI matches engine output exactly. 48 → 57 tests. | [#16](https://github.com/micro-JAY/harmony_hash/pull/16) **Done** |
| 1.2 | **Playwright harness** — set up `playwright.config.ts`, install browsers (CI permitting), one smoke spec that loads the SPA on `npm run preview`, captures a baseline screenshot of the chord card view for fixture chords. Establishes the §3.4 before/during/after cadence used from v2 onward. | `chore/add-playwright-harness` | `add-playwright-harness` (archived 2026-05-17) | none — process tooling, no user-facing capability delta | One smoke spec (`e2e/smoke.spec.ts`) asserting v2 voice-led MIDI via DOM decoding plus `toHaveScreenshot` visual backstop. New `playwright` CI job parallel to `build-and-test`. Cross-platform snapshots via `snapshotPathTemplate` + 10% pixel-ratio tolerance. | [#18](https://github.com/micro-JAY/harmony_hash/pull/18) **Done** |
| 1.3 | **v3 — Extended Voicing Styles** — Drop 3, rootless, shell. Each chord gains a style selector when in piano mode. Engine: `computeVoicingForStyle(noteNames, style): VoicedChord`. UI: in-card style pill toggle (parallel to the guitar Fingering/Intervals/Notes pattern). | `feat/piano-voicings-v3-extended-styles` | `piano-voicings-v3-extended-styles` (archived 2026-05-17) | `harmony-brain`, `chord-card-display` | 22 new vitest assertions: per-style hand-verified note sets for Cmaj7/Dm7/G7/Cmaj9/triads. New Playwright e2e: Shell-toggle assertion + updated visual baseline. 57 → 79 tests. Rootless A/B simplified to one "rootless" style (voice-leading picks the inversion). | [#19](https://github.com/micro-JAY/harmony_hash/pull/19) **Done** |
| 1.4 | **v4 — Interval Spacing & Spread** — 10th-interval spread voicings + two-hand spread. **UST deferred** to `piano-voicings-ust` (a separate openspec change) because USTs imply chromatic tones outside the input chord's note set and need a dedicated design pass. C3-B5 MIDI range invariant preserved. | `feat/piano-voicings-v4-spread` | `piano-voicings-v4-spread` (archived 2026-05-17) | `harmony-brain`, `chord-card-display` | 15 new vitest assertions: hand-verified spread voicings (Cmaj7, Dm7, G7, C triad, Bmaj7 with RH at oct 5, Cmaj9) and two-hand voicings; all-spread + all-two-hand voice-leading through ii-V-I. New Playwright e2e: Spread-toggle assertion locking the voice-led spread chain. 79 → 94 tests, 2 → 3 e2e. | [#20](https://github.com/micro-JAY/2026-05-17-piano-voicings-v4-spread) **Done** |
| 1.5 | **v5 — Playback** — lightweight WebAudio synth that plays the voice-led progression. Triangle-wave oscillators with soft ADSR per note; per-chord scheduling via `buildPlaybackSchedule` (pure, unit-tested). UI: global Play/Stop toggle + active-chord glow indicator. AudioContext lazily created on first user gesture (Safari + iOS compatibility). | `feat/piano-voicings-v5-playback` | `piano-voicings-v5-playback` (archived 2026-05-17) | new `piano-playback` capability; `chord-card-display` (active-chord indicator + Play/Stop toggle) | 11 new vitest assertions: schedule builder + MIDI-to-frequency. New Playwright e2e: clicks Play, asserts the active-chord visual flag flips within 2 seconds. 94 → 105 tests, 3 → 4 e2e. | [#21](https://github.com/micro-JAY/harmony_hash/pull/21) **Done** |

**Scope guard.** No "v6". v3 already covers Drop 3, rootless, and shell — per `docs/long_horizon_prompt.md §3.6`. Any new style after v3 lands gets a fresh openspec change with rationale.

---

## Phase 2 — Inspiration-led feature wave (SECONDARY)

Begins only after v5 merges. Milestones through 2.8.x.b used one OpenSpec change → one branch → one PR. Subsequent work uses the normal planning workflow per the 2026-07-12 user direction, while retaining branch-per-feature, review, and verification gates. Pull the visual language from the existing chord card / progression UI; never from inspiration screenshots.

| # | Milestone | Branch | Change-id | Capabilities touched | Notes |
|---|-----------|--------|-----------|----------------------|-------|
| 2.1 | **Piano view parity with guitar.** Lock toggle + Randomize All + Notes/Fingering display toggle on piano cards. Piano randomize picks an applicable explicit style per unlocked card (auto excluded). Side-by-side voicing comparison view deferred to 2.1.x. | `feat/piano-view-parity` | `piano-view-parity` (archived 2026-05-17) | `chord-card-display` | [#22](https://github.com/micro-JAY/harmony_hash/pull/22) **Done** |
| 2.1.x | **Side-by-side voicing comparison view** (deferred from 2.1). Render multiple voicings of the same chord side-by-side from the same engine output. | — | TBD | `chord-card-display` | Optional from inspiration; engine support already there from v3 + v4. |
| 2.2 | **Suggestion overlay — Off + Diatonic slice.** Audit found the overlay didn't exist; ship the minimum: `src/lib/theory/` pure-function module + Off/Diatonic mode pill toggle on `ChordReferenceGrid` + 35% opacity for non-diatonic rows when active. Jazz + Modal modes deferred to follow-ups. | `feat/suggestion-overlay-diatonic` | `suggestion-overlay-diatonic` (archived 2026-05-17) | new `chord-grid-suggestions` capability | [#23](https://github.com/micro-JAY/harmony_hash/pull/23) **Done** |
| 2.2.x.a | **Jazz suggestion-overlay mode** (deferred from 2.2). Voice-leading-aware scoring + tritone-sub awareness + ii-V detection + variable-strength border-glow. | `feat/jazz-suggestion-overlay` | normal planning (OpenSpec discontinued) | extends `chord-grid-suggestions` | **In review.** Draft [#47](https://github.com/micro-JAY/harmony_hash/pull/47) is stacked on #46. |
| 2.2.x.b | **Modal suggestion-overlay mode** (deferred from 2.2). Cells colored by parent mode (Lydian / Mixolydian / Phrygian / etc.). | — | `suggestion-overlay-modal` | extends `chord-grid-suggestions` | |
| 2.3 | **Improv Insight** — progression-aware scale suggestions with motion/tension/palette/style metadata. Per-chord and whole-progression tabs. Builds on `src/lib/theory/`. | `feat/improv-insight` | normal planning (OpenSpec discontinued) | new capability `improv-insight`; consumes `src/lib/theory/` | **Done.** Merged via [#37](https://github.com/micro-JAY/harmony_hash/pull/37), including local tokens/fonts, higher small-text contrast, four-stop score colors, and mode-aware interval wording. |
| 2.4 | **Common Progressions library expansion.** Audit `src/data/progressions.ts` and `docs/hh-library.md` against the inspiration "Common Progressions" examples; fill named gaps. Drop selected progression into the timeline. | `feat/progression-library-expansion` | — (normal planning) | `progression-library`, `progression-browser` | **Done.** Merged via [#38](https://github.com/micro-JAY/harmony_hash/pull/38); 62 presets resolve across all 12 keys with source/docs/picker regression coverage. |
| 2.5 | **Mood / Genre filter.** JSON-driven mapping mood → scale-set + chord-quality weights. Min vocabulary: Bright, Dark, Jazzy, Bluesy, Latin, Film Noir, Ethereal, Happy, Melancholy, Heroic, Ancient, Lively. Feeds suggestion overlay (2.2) and scale picker (2.7). | `feat/mood-filter-main-recovery` | — (normal planning) | new capability `mood-filter`; consumes `src/lib/theory/` | **Done.** Merged via [#41](https://github.com/micro-JAY/harmony_hash/pull/41), including the reviewed mood lens and scale-spelling follow-up. |
| 2.6 | **Circle of Fifths** view. Own panel; clickable wedges set key; modulation arcs animate via Tonari motion tokens. | `feat/circle-of-fifths` | — (normal planning) | new capability `circle-of-fifths` | **Done.** Merged via [#42](https://github.com/micro-JAY/harmony_hash/pull/42) with lazy loading, spatial keyboard navigation, and Builder handoff coverage. |
| 2.7 | **Scale Synthesia** — scales/modes/arpeggios for piano + guitar; consistent color-coded degree palette; W/H step formula; "use it for" + "hear it in" copy from the same JSON dataset as 2.5. | `feat/scale-synthesia` | — (normal planning) | new capability `scale-synthesia`; consumes `src/lib/theory/` | **Done.** Merged via [#43](https://github.com/micro-JAY/harmony_hash/pull/43) with shared learning data, piano/guitar practice, playback, and responsive coverage. |
| 2.8 | **Guitar/bass fretboard — first-class scale map.** Builder/Fretboard workspace navigation; Guitar/Bass, root, seven modes plus major/minor pentatonic and blues, Intervals/Notes; horizontal frets 0–15, degree colors, exact note semantics, arrow navigation, internal mobile scrolling. | `feat/guitar-fretboard` | `guitar-fretboard-view` | new `guitar-fretboard`; extends `app-shell` and shared `src/lib/theory/` | **Done.** Merged via [#31](https://github.com/micro-JAY/harmony_hash/pull/31); accessible color/formula expansion is in [#37](https://github.com/micro-JAY/harmony_hash/pull/37). |
| 2.8.x.a | **Fretboard tuning + handedness expansion.** Guitar Standard/Drop D/DADGAD/Open G, bass Standard/Drop D/BEAD, per-instrument tuning memory, and left-handed visual-axis reversal. | `feat/fretboard-tunings-handedness` | `fretboard-tunings-handedness` | extends `guitar-fretboard` | **Done.** Merged via [#32](https://github.com/micro-JAY/harmony_hash/pull/32) and archived via [#36](https://github.com/micro-JAY/harmony_hash/pull/36). |
| 2.8.x.b | **Fretboard patterns + chord overlay.** All/CAGED/3NPS position filtering and dictionary-valid chord-tone overlay on the current scale. | `feat/fretboard-patterns-chord-overlay` | `fretboard-patterns-chord-overlay` | extends `guitar-fretboard`; consumes chord data | **Done.** Merged via [#33](https://github.com/micro-JAY/harmony_hash/pull/33) and archived via [#36](https://github.com/micro-JAY/harmony_hash/pull/36). |
| 2.9 | **Note Neural Network** — modal-relationships graph; mode-family toggle; Parallel/Relative tab; side panel with "use it over" + song reference (same dataset as 2.7). One-click jump into Scale Synthesia. | `feat/note-neural-network` | — (normal planning) | new capability `note-neural-network` | **Done.** Merged via [#44](https://github.com/micro-JAY/harmony_hash/pull/44) with degree-aware formulas, keyboard/pointer access, persistent focus, responsive coverage, and Scale Synthesia handoff. |
| 2.10 | **Quick chord modifiers** — per-card same-root extensions/alterations with ranked quick choices, full catalog search, and shared guitar/piano replacement semantics. | `feat/quick-chord-modifiers` | `quick-chord-modifiers` | new capability `quick-chord-modifiers`; extends shared catalog/timeline behavior | **Done.** Merged via [#35](https://github.com/micro-JAY/harmony_hash/pull/35) and archived via [#36](https://github.com/micro-JAY/harmony_hash/pull/36). |
| 2.11 | **Free Input harmonic suggestions** — independent key/mode context plus Off/Key/Next scoring for every visible dictionary chord, combining key fit, voice leading, and root motion without changing explicit Run or insertion semantics. | `feat/free-input-harmonic-suggestions` | `free-input-harmonic-suggestions` | new `harmonic-suggestions`; extends `progression-input` and `chord-grid-suggestions` | **Done.** Merged via [#30](https://github.com/micro-JAY/harmony_hash/pull/30), archived via [#36](https://github.com/micro-JAY/harmony_hash/pull/36), and contrast-refined in [#37](https://github.com/micro-JAY/harmony_hash/pull/37). |

**Shared theory engine.** Items 2.2, 2.3, 2.5, 2.7, 2.8, 2.9, and 2.11 all consume one library under `src/lib/theory/`. Pure functions, exhaustive unit tests, no duplicated scoring logic per view. This is non-negotiable per `§4 Shared-engine principle`.

**Performance budget.** Per `§4 Performance budget`: Playwright must assert chord grid render/interaction latency doesn't regress when 2.2's overlays land. 2.6/2.7/2.8/2.9 lazy-load via React.lazy + Suspense.

---

## Side tracks (user-directed, outside the v1–v5 / Phase-2 roadmap)

| # | Milestone | Branch | Change-id | Capabilities touched | Status |
|---|-----------|--------|-----------|----------------------|--------|
| S.1 | **Voice Companion** — ElevenLabs real-time voice agent that reads/edits the progression timeline and explains theory. 9-tool client surface, signed-URL Worker route, ref-mirror bridge, Tonari-styled panel. See the 2026-05-25 log entry. | `feat/voice-companion` | `add-voice-companion` | new `voice-companion`; touches `app-shell` (panel mount) | **Done** (shipped; current live-auth repair tracked in S.2) |
| S.2 | **Agent Builder Recovery** — migrate progression generation to OpenAI Responses, restore signed-only ElevenLabs auth, and compact/responsive builder actions. | `fix/agent-builder-companion-ui` | `restore-agent-builder-experience` | `progression-agent`, `voice-companion`, `progression-input`, `app-shell` | **Done.** Merged and deployed via [#29](https://github.com/micro-JAY/harmony_hash/pull/29), then archived via [#34](https://github.com/micro-JAY/harmony_hash/pull/34). Current status-only automation is intercepted by a Cloudflare challenge before the Worker, so it does not indicate a provider regression or prove live voice success. |

---

## Decisions log

Day-by-day decisions, rationales, blockers, and open questions (prefix `Q:` for greppable user questions) live in `docs/long_horizon_log.md`. Reconcile this plan with that log on every milestone boundary.

---

## Definition of done (recap from prompt §10)

- v2–v5 each merged with archived openspec change, applied spec deltas, and Playwright coverage (where UI is touched).
- Phase 2 items 2.1–2.5 merged with the same discipline.
- 2.6–2.9 either merged or have an opened PR + open openspec change + a clear next step logged.
- This plan reconciles every milestone as Done / Blocked / Cancelled — no Pending / In Progress at end.
- `docs/long_horizon_summary.md` written.
- `main` CI green.
- No undocumented introduced TODO/FIXME.
- `git status` clean (other than gitignored `docs/inspiration/` screenshots).
