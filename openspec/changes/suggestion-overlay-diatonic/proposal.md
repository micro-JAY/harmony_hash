## Why

Phase 2 item 2.2 in the long-horizon plan calls for the chord-grid suggestion overlay sketched in the inspiration screenshots (`suggestions_jazz_mode.png`, `suggestions_diatonic_mode.png`). The audit pass — the first step the plan called for — confirms the overlay **does not exist yet** in `ChordReferenceGrid.tsx`. No `mode` toggle, no scoring engine, no diatonic gating.

This change ships the **minimum useful slice**: an Off / Diatonic mode toggle backed by a pure theory module. Jazz mode (voice-leading scoring + tritone-sub awareness) and Modal mode (parent-mode coloring) are deferred to a follow-up change because each needs its own scoring engine and design pass.

The minimum slice is enough to deliver real value: when the user has a key context (always available in the Progressions tab, derivable from the Free Input tab's tonality selector), the grid dims non-diatonic roots and highlights the in-key ones. That alone closes the gap between "this grid shows every chord that exists" and "this grid shows me where to look in this key."

## What Changes

### Engine — new `src/lib/theory/` module

- **Add** `pitchClassOf(rootName): number` — handles canonical internal forms (`Cs`, `Ef`) and user-facing forms (`C#`, `Eb`). Returns `-1` for unknown.
- **Add** `scalePitchClasses(keyName, scaleType): Set<number>` — produces the pitch-class set for any of the seven supported scale types (major / natural_minor / harmonic_minor / dorian / mixolydian / lydian / phrygian).
- **Add** `isRootDiatonic(rootName, keyName, scaleType): boolean` — coarsest possible diatonic test. The chord root sits inside the key's scale → true.
- **Add** `scaleDegreeOf(rootName, keyName, scaleType): number | null` — 1-indexed scale degree (1..7), or null when the root is non-diatonic. Used by future overlay flavors that want to color cells by harmonic function; the diatonic mode in this PR only needs the boolean.

The module is pure — no React imports, no DOM, no scoring side effects. Designed so Phase 2 items 2.3 (Improv Insight), 2.5 (Mood/Genre filter), 2.7 (Scale Synthesia), and 2.9 (Note Neural Network) can all build on it without rewiring.

### Rendering — `ChordReferenceGrid.tsx`

- **Add** an internal `suggestionMode: "off" | "diatonic"` state (defaults `"off"` — matches current behavior).
- **Add** an optional `keyContext?: { key: string; scaleType: ScaleType }` prop. When unset (or when `suggestionMode === "off"`), the grid renders unchanged.
- **Add** a small mode pill toggle at the top of the expanded grid panel: "Suggest [Off | Diatonic]" plus a "in C major" label when active. The Diatonic button is disabled when `keyContext` is missing.
- **Apply** the overlay: when active, non-diatonic rows get `opacity: 0.35`; diatonic rows stay at full opacity. Both keep their existing colors and interactions — only opacity changes, so undo / flash / insert behavior is unaffected.

### Plumbing — `ProgressionInput.tsx`

- **Pass** `keyContext={{ key: selectedKey, scaleType: activeGroup.scaleType }}` to `ChordReferenceGrid`. `selectedKey` and `activeGroup` are already in the component's state; this is a one-line addition.

### Tests

- **15 new vitest assertions** in `src/lib/theory/theory.test.ts`:
  - `pitchClassOf`: canonical naturals, user-facing sharps/flats, unknowns.
  - `scalePitchClasses`: C major, A natural minor, D dorian, unknown-key edge case.
  - `isRootDiatonic`: C major (C/F/G/A diatonic; C#/F#/Bb not), D major transposition, A harmonic minor.
  - `scaleDegreeOf`: degrees 1..7 in C major, null for non-diatonic, D major, A harmonic minor.

No new e2e — the existing 4 Playwright tests don't open the Browse chords panel, so the new mode toggle is outside their visual surface. A dedicated overlay e2e is a follow-up for when Jazz / Modal modes land.

## Capabilities

### New Capabilities

- **`chord-grid-suggestions`** — chord-grid overlay that highlights chords relevant to the current key context. v1 ships Off and Diatonic modes; Jazz and Modal modes follow in a separate change.

### Modified Capabilities

None.

## Impact

- **New files:** `src/lib/theory/index.ts`, `src/lib/theory/theory.test.ts`, `openspec/changes/suggestion-overlay-diatonic/` (proposal, tasks, spec).
- **Modified files:** `src/components/ChordReferenceGrid.tsx` (mode toggle + overlay rendering), `src/components/ProgressionInput.tsx` (one-line keyContext pass-through).
- **Worker impact:** none.
- **Bundle delta:** ~+800 bytes raw / +400 bytes gzip — small pure module + a couple of buttons.
- **Backward compat:** ChordReferenceGrid's existing prop surface is unchanged; `keyContext` is optional. With no keyContext, the Diatonic toggle is disabled and the overlay never engages. Free Input behavior is unaffected when the mode is "Off".
- **Test gates:** lint 0, build clean, vitest 105 → 120, e2e 4/4.
- **Risk:** **Low.** Pure theory module backed by 15 unit tests. UI change is bounded to opacity changes inside the existing grid render path; insert / flash / undo behavior is unchanged.
- **Rollback:** revert the PR.

## Deferred to follow-ups

- **Jazz mode.** Requires a voice-leading-aware scoring engine (chord-to-chord transitions, tritone subs, ii-V detection). Filed as `suggestion-overlay-jazz`.
- **Modal mode.** Color cells by parent mode (Lydian / Mixolydian / Phrygian / etc.). Filed as `suggestion-overlay-modal`.
- **Border-glow strength = fit strength.** Today the overlay is binary (full opacity or 35%). Jazz mode's scoring engine will make a continuous fit score available; that's where the variable-strength visual lands.
- **Free Input key inference.** Today the grid pulls key from `selectedKey` (defaults "C"). A "guess the key from typed chords" inference layer could go above that — filed as a separate small UX investigation.
