# Inspiration

> **This folder is gitignored.** Local-only working reference for the agent (and us). Don't check anything in here into source control. The canonical *outputs* of this folder are openspec change proposals, code, and PR descriptions — not the source imagery.

## What's in this folder

1. **The Piano Voicing Roadmap** — the canonical v1–v5 acceptance spec lives at the **bottom of this file** (see "Piano Voicing — Roadmap" below). v1 is already shipped. This README is what the agent reads first every session.
2. **Screenshots** (`.PNG` / `.png` files) — visual references for Phase 2 feature concepts and existing UI patterns. Each is mapped below to a specific feature.

## Design contract reminder

These screenshots are **reference imagery only — do not clone the visual design.** The Tonari Labs design system (`public/tokens.css`), Harmony Hash's existing component styling, and the workspace-level `../CLAUDE.md` are the source of truth for type, color, motion, and spacing. Pull *concepts and information architecture* from these; re-skin everything in Tonari language.

Concrete don'ts: no Inter/Roboto/system-ui defaults; no purple-on-charcoal; no copy-pasted button styling from the inspiration apps; no new design tokens that aren't deliberately added to `public/tokens.css` with a one-line rationale.

---

## Existing-product references (already shipped, screenshots for context)

These reference UI patterns that **are already in Harmony Hash today**. They're here so the agent recognizes what's done and doesn't try to rebuild it.

### Suggestion overlay on the chord grid

- `suggestions_jazz_mode.png` — Jazz mode: colored *borders* mark suggested next chords; brighter border = stronger fit (voice-leading, scale, tritone subs). The suggestion ring keys off the selected/last-played chord.
- `suggestions_diatonic_mode.png` — Diatonic mode: colored *fills* (not borders) across the whole grid, mapped to scale degree. Same scoring engine, different render mode.

Take: the two-mode pattern (borders vs fills, single scoring engine, multiple visualizations).

### Onboarding flow

The reference product has a 6-step welcome tour. We don't need to copy it, but the *structure* (what they consider the 6 most important things to teach) is a useful sanity check.

1. `onboarding_01_welcome.png` — Welcome / mental-model setup.
2. `onboarding_02_browse.png` — "Tap any chord to play it and see it on the keyboard."
3. `onboarding_03_progression.png` — "Drag chords into the timeline. Long-press to drag, or use the add button on each chord chip."
4. `onboarding_04_randomize.png` — "Tap the dice to instantly generate 4 chords that sound great together."
5. `onboarding_05_instrument_toggle.png` — **Directly relevant to piano-parity work.** "Toggle between piano keyboard and guitar fretboard. Browse positions and shuffle note order independently."
6. `onboarding_06_save_share.png` — Save to local history, browse past progressions, share link, export to MIDI/WAV/TXT.

Take: scope discipline (six things, not twenty), positions + note-order shuffle as first-class piano affordances, export as a real feature.

---

## New feature concepts (Phase 2 wave)

Each named feature has a **Tonari-native code/UI name** in bold. Use these names — not the inspiration-app names — in branches, components, and PR titles.

### Piano view extensions — bring piano to parity with guitar

**Reference for:** extending the **existing Harmony Hash piano view** with the affordances the guitar view already has (variant cycling, randomize-all, lock variation), plus a side-by-side voicing comparison view that becomes possible once v3 ships.

This is **not a new feature** — it's the natural extension of `src/components/PianoKeyboard.tsx` and `src/components/ChordCard.tsx`. The guitar side of those components already has multiple voicings per chord (← → arrows), a "Randomize All" button, and per-card variant locking. The piano side needs the equivalent for piano voicings produced by v2–v5.

- `voice explore - harmony hash (piano view).PNG` — **this is what the piano view of Harmony Hash should look like.** Fm7 rendered across seven labeled voicings (Root Position, 1st/2nd/3rd Inversion, Shell, Rootless A, Rootless B), each on a clean labeled keyboard with notes color-coded by interval role (`F Root` red, `G# min 3rd` olive, `C 5th` blue, `D# b7` pink). One chord builder up top, instrument toggle on the right, a notes-toggle for letter labels. Filename was originally "voicing explorer" in the source product — kept as `voice explore` so it sorts alongside the other inspiration files. Similar to the already existing guitar view, once extended chords are added we should see intervals and/or fingering as options for the view. Along with the ability to lock or randomize voicings at a per-chord level.

The named-voicing vocabulary (Shell, Rootless A/B) ships with v3. Until then, the piano view's parity work is variant cycling + randomize + lock for the Drop 2 voicings v1 already produces, plus the voice-leading variants v2 introduces.

### **Note Neural Network** — modal relationships

**Reference for:** a future modes/relative-scale exploration view.

A force-directed graph centered on the chosen root mode; parallel modes radiate as colored nodes. Mode-family toggle at top (Major / Natural Minor / Harmonic Minor / Melodic Minor) + Parallel/Relative tab. Side panel for the focused mode shows notes, characteristic interval, interval formula, "use it over" text, and a song reference.

- `modal map 1 - note neural network.PNG` — Harmonic Minor family on E. Satellites: Phrygian Dominant, Locrian #6, Ultra Locrian, Lydian #2, Ionian #5, Dorian #4.
- `modal map 2 - note neural network.PNG` — Major family on E. Satellites: Lydian, Mixolydian, Locrian, Dorian, Phrygian, Aeolian. Side panel: "*Let It Be* by The Beatles."

Take: parallel-vs-relative toggle, characteristic-interval callout, song references per mode, network-as-learning-tool.

### **Improv Insight** — progression-aware scale suggestions

**Reference for:** a "what can I play over this?" panel for the timeline.

Given a chord progression, surface compatible scales ranked by match %, with metadata: motion (smooth/jumpy), tension (rises/static/falls), palette (diatonic/chromatic), style (modal/tonal/blues). Each row includes "also known as" enharmonic equivalents.

- `progression analyzer - improv insight.PNG` — Input: chord chip row (`Am > F > C > G > G > Dm`) with delete affordances + chord builder. Top-bar: PDF / Share / Copy as / Save.
- `progression analyzer - improv insight 2.PNG` — Output: "Compatible Scales" panel with per-chord and whole-progression tabs. Match bars at 98% / 96% / 96% / 93% / 91%. The MOTION/TENSION/PALETTE/STYLE metadata box is the most useful part.

Scoring is pure functions; the panel is one render. The same engine can feed the existing chord-grid border-glow.

### **Scale Synthesia** — scale visualizer for piano + guitar

**Reference for:** a scales/modes practice view, eventually a first-class guitar fretboard view.

Pick scale + mode + root, render on keyboard or fretboard with each scale degree color-coded (root always the same color across instruments). Below: formula with W/H step labels, named degrees, "use it for" stylistic guidance, "hear it in" song reference. Guitar adds tuning selector, pattern toggle (All / CAGED / 3NPS), and "overlay a chord on this scale".

- `scale synthesia.PNG` — F# Harmonic Minor on piano. "*Hava Nagila*" reference, "neoclassical metal, flamenco" usage.
- `scale synthesia 2.PNG` — F# Natural Minor on piano. "*Losing My Religion* by R.E.M." reference.
- `scale synthesia guitar.PNG` — C Major on guitar fretboard. CAGED/3NPS pattern toggle, "Overlay a chord" feature. Top nav (Scale / Progression / Voicings / Modes / Circle) is worth studying as an IA reference.

---

## What to take, what to leave

**Take:**
- Information density without horizontal scroll.
- Color-coded scale degrees with the root always the same color across views.
- "Use it over" and "hear it in" copy slots — turn the tool into a teacher, not just a renderer.
- Pattern toggles (CAGED / 3NPS) and tuning options for guitar.
- "Overlay a chord on this scale" — collapses two views into one moment of insight.
- Progression-aware match scoring with motion/tension/palette/style metadata.

**Leave:**
- The inspiration apps' type/color/button styling. Default-looking sans + pastel-on-charcoal is the AI-slop look our rules forbid.
- Generic icon-and-arrow pages.
- Multi-headline UI ("Scale Visualizer" + breadcrumb + tab strip + selector cluster stacked) — collapse to fewer affordances per screen.

---

## Piano Voicing — Roadmap

**THIS IS THE CANONICAL v1–v5 SPEC.** Read it every session. The long-horizon prompt at `docs/long_horizon_prompt.md` references this section by anchor.

### v1 — ALREADY LIVE NOW

Drop 2 voicing for seventh chords and above (the 2nd-highest note drops an octave, creating an open, spread sound). Root position for triads. Left/right hand split shown visually. Implemented in `src/lib/harmonyBrain.ts` and rendered by `src/components/PianoKeyboard.tsx`. The corresponding capability spec is `openspec/specs/harmony-brain/spec.md` ("Drop 2 voicing calculation" requirement).

### TODO — must ship in order before any Phase 2 / inspiration work

### v2 — Voice Leading

Smooth voice leading between chords in a progression. Calculate minimal movement between voicings so the hands stay close and the progression flows. This is what separates a competent pianist from a musical one.

### v3 — Extended Voicing Styles

Drop 3, rootless voicings (for playing over a bassist), and shell voicings (3rd + 7th only, no root or 5th). Each chord card shows a style selector to try them side by side. **This is the engine that unlocks the side-by-side piano voicing comparison view** described in the Phase 2 section above.

### v4 — Interval Spacing & Spread Voicings

9th/10th interval spacing for wide, lush textures common in R&B, gospel, and neo-soul. Upper structure triads for dominant chords. Two-hand spread voicings that reflect how pianists actually use the full range.

### v5 — Playback

Hear the progression. A lightweight synth renders the voiced chords in sequence so you can audition how the voice leading actually sounds before sitting down at the keys.
