## Why

`docs/inspiration/README.md` "Piano Voicing — Roadmap" v3:
> Drop 3, rootless voicings (for playing over a bassist), and shell voicings (3rd + 7th only, no root or 5th). Each chord card shows a style selector to try them side by side.

v2 (Voice Leading) ships with a single voicing style per chord — whatever the `auto` voice-leading engine picks (closed or Drop 2). v3 widens that vocabulary to include the four named jazz styles, with a per-card selector so the user can compare them at a glance.

This is also the engine that unlocks the side-by-side voicing comparison view scoped in Phase 2 item 2.1 (piano-view parity). Once v3 lands, any number of voicings of the same chord can be rendered side by side from the same engine output.

## What Changes

### Engine (`src/lib/harmonyBrain.ts`)

- **Add** `VoicingStyle = "auto" | "drop2" | "drop3" | "rootless" | "shell"` to `src/lib/types.ts`.
- **Extend** `VoicedChord.voicingType` from `"root" | "drop2"` to `"root" | "drop2" | "drop3" | "rootless" | "shell"`.
- **Add** `isStyleApplicable(noteNames, style): boolean` — pure predicate. Auto is always applicable (non-empty). Drop2/Drop3/Rootless require 4+ notes. Shell additionally requires a true 7th interval (10 or 11 semitones from root to index-3 note) — gates out C6, Cadd9, and similar pseudo-tetrads.
- **Add** `computeVoicingForStyle(noteNames, style): VoicedChord` — returns the canonical voicing for a single chord in the given style. Internally enumerates candidates and returns the first (lowest inversion, lowest starting octave that fits C3-B5). Falls back to `computeVoicing` for inapplicable style/chord combinations.
- **Add** `enumerateVoicingCandidatesForStyle(noteNames, style): VoicedChord[]` — returns every C3-B5-fitting voicing candidate for the chord under that style. Used by voice-leading to pick the smoothest inversion within a style constraint.
- **Extend** `computeVoiceLedProgression(progressionNotes, styles?)` — `styles` is now an optional `ReadonlyArray<VoicingStyle>` matched to chord positions. When provided, each chord's candidate set is constrained to the specified style; voice-leading picks the smoothest inversion within that style. When omitted, every chord uses `"auto"` — byte-for-byte identical to the v2 behavior.

Drop 3 is the canonical jazz Drop 3: take the closed-position voicing, drop the 3rd-from-top of the first 4 notes one octave. Rootless removes the root and voices the remaining chord tones in closed inversions. Shell is 3rd + 7th only, two notes.

### Rendering (`src/components/ChordCard.tsx`, `src/App.tsx`)

- **Add** per-piano-card style selector — pill toggle (Auto / Drop 2 / Drop 3 / Rootless / Shell) above the keyboard, matching the visual pattern of the existing guitar Fingering/Intervals/Notes toggle. Non-applicable styles are rendered disabled (greyed out via `--interactive-disabled-text`).
- **Update** the existing "Drop 2" pill below the keyboard to a generic voicing-type label that surfaces Drop 2 / Drop 3 / Rootless / Shell when the engine produces them. "root" produces no pill (consistent with existing behavior).
- **Add** `pianoStyles: Record<number, VoicingStyle>` state in `App.tsx`. Defaults to `"auto"` per card; resets on new progressions. The memoized `computeVoiceLedProgression(noteSets, styles)` re-runs whenever a style changes.
- Guitar branch is unchanged.

### Tests

- **22 new vitest assertions** in `src/lib/harmonyBrain.test.ts`:
  - `isStyleApplicable` correctness across the matrix of (triad, 7th chord, 9th chord, 6th chord) × (auto, drop2, drop3, rootless, shell).
  - `computeVoicingForStyle` canonical voicings for Cmaj7 / Dm7 / G7 across all four explicit styles, plus Cmaj9 rootless, with hand-verified MIDI sets.
  - `enumerateVoicingCandidatesForStyle` returns the canonical voicing as candidate 0, returns [] for non-applicable styles, all candidates in MIDI 48-83.
  - `computeVoiceLedProgression` with all-shell styles produces the smoothest 2-note voice-led chain through ii-V-I in C.
  - Mixed-style progressions thread correctly through the engine.
  - Falling back gracefully when a style is not applicable mid-progression (triad + shell).
  - `[..., "auto"]` styles reproduces v2 behavior exactly.

- **2 new Playwright e2e tests** in `e2e/smoke.spec.ts`:
  - "Auto" style retains the v2 voice-led MIDI set (regression guard).
  - Clicking "Shell" on every card produces the hand-verified shell voice-led chain `[F3,C4] → [F3,B3] → [E3,B3]` via DOM-decoded MIDI assertion.
- Updated visual baseline reflecting the new style toggle row.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`harmony-brain`** — adds "Voicing style applicability", "Style-constrained voicing", and "Voice-leading honors per-chord styles" requirements. Existing v1 (Drop 2 / root position) and v2 (voice-leading) requirements remain unmodified.
- **`chord-card-display`** — adds "Piano voicing-style selector" requirement and broadens the voicing-type pill label to cover Drop 3 / Rootless / Shell. Existing piano-card rendering requirement remains unchanged.

## Impact

- **Affected paths:** `src/lib/types.ts` (`VoicingType` extended, `VoicingStyle` added), `src/lib/harmonyBrain.ts` (engine extensions), `src/lib/harmonyBrain.test.ts` (22 new tests), `src/components/ChordCard.tsx` (style toggle + label update), `src/App.tsx` (per-card style state), `e2e/smoke.spec.ts` (2 new tests + updated baseline), `openspec/specs/harmony-brain/spec.md` + `openspec/specs/chord-card-display/spec.md` (applied spec deltas on merge).
- **Worker impact:** none.
- **Bundle delta:** ~+2 KB raw (~+0.5 KB gzip) — pure engine functions + a small toggle UI.
- **Runtime cost:** unchanged for "auto" (same v2 algorithm). For explicit styles, candidate generation is bounded at ~N inversions × 2 octaves × {drop, closed} = ~16 candidates per chord. Trivial.
- **Backward compat:** existing callers of `computeVoiceLedProgression` (one call site, App.tsx) work unchanged; the new optional `styles` parameter defaults to "auto" per chord. `computeVoicing` is untouched.
- **Test gates:** lint 0, build clean, vitest 79/79, Playwright 2/2 (including 1 new e2e test for the style toggle).
- **Risk:** **Low.** Engine is pure and exhaustively tested. UI change is additive (existing piano view layout reorders slightly to fit the style toggle row). The "auto" path is byte-for-byte the v2 behavior.
- **Rollback:** revert the PR.
