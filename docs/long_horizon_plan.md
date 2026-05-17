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
| 1.2 | **Playwright harness** — set up `playwright.config.ts`, install browsers (CI permitting), one smoke spec that loads the SPA on `npm run preview`, captures a baseline screenshot of the chord card view for fixture chords. Establishes the §3.4 before/during/after cadence used from v2 onward. | `chore/add-playwright-harness` | `add-playwright-harness` | new capability spec `playwright-visual-tests` | One first spec; CI job (lightweight: chromium only) | Pending |
| 1.3 | **v3 — Extended Voicing Styles** — Drop 3, rootless A/B, shell. Each chord gains a style selector when in piano mode. Engine: `computeVoicingForStyle(noteNames, style): VoicedChord`. UI: in-card style pill toggle (parallel to the guitar Fingering/Intervals/Notes pattern). | `feat/piano-voicings-v3-extended` | `piano-voicings-v3-extended-styles` | `harmony-brain`, `chord-card-display` | Per-style hand-verified note sets across triads, 7ths, 9ths, alt dominants. Playwright before/during/after. | Pending |
| 1.4 | **v4 — Interval Spacing & Spread** — 9th/10th spread voicings; upper-structure triads for dominant chords; two-hand spread. Optional widened MIDI range; if widening, propose it explicitly in the change. | `feat/piano-voicings-v4-spread` | `piano-voicings-v4-spread` | `harmony-brain`, `chord-card-display` | Spread-voicing fixtures; MIDI range invariant or documented widening; Playwright before/during/after. | Pending |
| 1.5 | **v5 — Playback** — lightweight WebAudio synth that plays the rendered voicing in sequence (per-chord on click, full-progression playback button). Honor system prefers-reduced-motion for any visual playback flourishes. Keep bundle delta minimal — no large audio libraries. | `feat/piano-voicings-v5-playback` | `piano-voicings-v5-playback` | `chord-card-display` (playback control), possibly new `piano-playback` capability | Unit tests for note→frequency mapping; manual smoke for audio output (Playwright can't validate audio); Playwright before/during/after for visual state of playback controls. | Pending |

**Scope guard.** No "v6". v3 already covers Drop 3, rootless, and shell — per `docs/long_horizon_prompt.md §3.6`. Any new style after v3 lands gets a fresh openspec change with rationale.

---

## Phase 2 — Inspiration-led feature wave (SECONDARY)

Begins only after v5 merges. Each item is one openspec change → one branch → one PR. Pull the visual language from the existing chord card / progression UI; never from inspiration screenshots.

| # | Milestone | Branch | Change-id | Capabilities touched | Notes |
|---|-----------|--------|-----------|----------------------|-------|
| 2.1 | **Piano view parity with guitar** (variant cycling, Randomize All, lock-variant per card, optional v3-side-by-side comparison once Phase 1 v3 lands). Also: surface the already-specced `Notes`/`Fingering` piano toggle that exists in the spec but isn't wired in `ChordCard.tsx` today. Extend `PianoKeyboard.tsx` + `ChordCard.tsx` in place — **not** a new component. | `feat/piano-view-parity` | `piano-view-parity` | `chord-card-display` | This is the renamed "Voice Explore" item from the original Phase 2 list. |
| 2.2 | **Suggestion overlay audit + extend** on `ChordReferenceGrid.tsx`. Audit ship state vs `suggestions_jazz_mode.png` / `suggestions_diatonic_mode.png`. Fill gaps: Jazz/Diatonic/Modal/Off mode toggle, border-glow strength == fit strength. Pure scoring engine under `src/lib/theory/`. | `feat/suggestion-overlay-extend` | `suggestion-overlay-extend` | new capability `chord-grid-suggestions` or extend existing | First task: audit pass; PR may be no-op if already at parity. |
| 2.3 | **Improv Insight** — progression-aware scale suggestions with motion/tension/palette/style metadata. Per-chord and whole-progression tabs. | `feat/improv-insight` | `improv-insight` | new capability `improv-insight`; consumes `src/lib/theory/` | Shared engine with 2.2 and 2.5. |
| 2.4 | **Common Progressions library expansion.** Audit `src/data/progressions.ts` and `docs/hh-library.md` against the inspiration "Common Progressions" examples; fill named gaps. Drop selected progression into the timeline. | `feat/progression-library-expand` | `progression-library-expand` | `progression-library`, `progression-browser` | May overlap with `ProgressionInput.tsx`; verify before rebuilding. |
| 2.5 | **Mood / Genre filter.** JSON-driven mapping mood → scale-set + chord-quality weights. Min vocabulary: Bright, Dark, Jazzy, Bluesy, Latin, Film Noir, Ethereal, Happy, Melancholy, Heroic, Ancient, Lively. Feeds suggestion overlay (2.2) and scale picker (2.7). | `feat/mood-filter` | `mood-genre-filter` | new capability `mood-filter`; consumes `src/lib/theory/` | |
| 2.6 | **Circle of Fifths** view. Own panel; clickable wedges set key; modulation arcs animate via Tonari motion tokens. | `feat/circle-of-fifths` | `circle-of-fifths` | new capability `circle-of-fifths` | Lazy-loaded via React.lazy. |
| 2.7 | **Scale Synthesia** — scales/modes/arpeggios for piano + guitar; consistent color-coded degree palette; W/H step formula; "use it for" + "hear it in" copy from the same JSON dataset as 2.5. | `feat/scale-synthesia` | `scale-synthesia` | new capability `scale-synthesia`; consumes `src/lib/theory/` | Lazy-loaded. |
| 2.8 | **Guitar fretboard as a first-class view** — tuning selector, CAGED / 3NPS pattern toggle, "Overlay a chord on this scale". Shares degree palette with 2.7. | `feat/guitar-fretboard` | `guitar-fretboard-view` | new capability `guitar-fretboard` | Lazy-loaded. |
| 2.9 | **Note Neural Network** — modal-relationships graph; mode-family toggle; Parallel/Relative tab; side panel with "use it over" + song reference (same dataset as 2.7). One-click jump into Scale Synthesia. | `feat/note-neural-network` | `note-neural-network` | new capability `note-neural-network` | Lazy-loaded. |

**Shared theory engine.** Items 2.2, 2.3, 2.5, 2.7, 2.9 all consume one library under `src/lib/theory/`. Pure functions, exhaustive unit tests, no duplicated scoring logic per view. This is non-negotiable per `§4 Shared-engine principle`.

**Performance budget.** Per `§4 Performance budget`: Playwright must assert chord grid render/interaction latency doesn't regress when 2.2's overlays land. 2.6/2.7/2.8/2.9 lazy-load via React.lazy + Suspense.

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
