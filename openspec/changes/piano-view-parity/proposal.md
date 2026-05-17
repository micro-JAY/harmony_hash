## Why

The original Phase 2 list named this item "Voice Explore" and framed it as a new feature. The scope correction landed early in the long-horizon run renamed it to **piano-view parity with guitar**: it's the in-place extension of `PianoKeyboard.tsx` + `ChordCard.tsx` so the piano side gets the affordances the guitar side has had since v1 — variant cycling, Randomize All, per-card lock — plus the already-specced Notes / Fingering display toggle that the spec called for but `ChordCard.tsx` never actually wired up.

With Phase 1 complete, the engine produces seven voicing styles per chord (Auto, Drop 2, Drop 3, Rootless, Shell, Spread, Two-Hand). The pill toggle introduced in v3 is good for explicit picks; what's missing is the parity moves that let the user shuffle and explore without manually clicking through pills on every card.

## What Changes

### Lock toggle on piano cards

- **Remove** the `instrument === "guitar"` gate around the lock button in `ChordCard.tsx`. Same `lockedCards: Set<number>` state in `App.tsx`, same lock semantics (locked cards skip randomization).

### Randomize All — piano semantics

- **Show** the Randomize All button regardless of instrument. Label flips between "Randomize All Variants" (guitar) and "Randomize All Voicings" (piano) to match the parlance each view uses.
- **Add** piano randomization: for each unlocked card, pick a random *applicable* explicit style from `["drop2", "drop3", "rootless", "shell", "spread", "two-hand"]`. "Auto" is intentionally excluded from the random pool — the button's whole point is to shake things up. Cards whose chord doesn't support any explicit style fall back to "auto" (e.g. a triad with rootless / drop / shell all gated out would still get "auto").
- **Use** the existing `isStyleApplicable` predicate to filter the candidate pool per card.

### Notes / Fingering display toggle

- **Wire** the existing `PianoDisplayMode` type through `ChordCard.tsx`. State is per-card and local to the component (defaults to `"notes"`, user-toggleable via a small pill toggle next to the existing voicing-type pill below the keyboard).
- `PianoKeyboard.tsx` already accepts `displayMode`; the v2 wire-up just hardcoded `"notes"`. This change replaces that hardcode with the local state.

### Deferred from 2.1

- **Side-by-side voicing comparison view.** Listed as "optional" in the inspiration. v3 enabled it; the actual UX (multiple voicings of one chord rendered side-by-side from the same engine output) is a different design pattern from the per-card style toggle and warrants its own openspec change. Filed mentally as a follow-up.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`chord-card-display`** — generalizes existing requirements:
  - Lock toggle visible on both instruments (was guitar-only).
  - Randomize All button visible for both; label adapts to instrument.
  - Piano display mode toggle requirement (already in the spec since 2026-03-06) now actually has a corresponding UI implementation.

## Impact

- **Affected paths:** `src/App.tsx` (randomize semantics + button visibility), `src/components/ChordCard.tsx` (lock gate removed; Notes/Fingering toggle added; pianoDisplay local state), `e2e/smoke.spec.ts` (visual baseline regenerated; no new test — the existing flows now cover lock + display toggle implicitly).
- **Worker impact:** none.
- **Bundle delta:** negligible (~+200 bytes raw / +100 bytes gzip — a couple more `<button>` elements + one local `useState`).
- **Backward compat:** existing Free Input / Progressions / Agent flows untouched. Single-chord views unchanged. The "Randomize All" button used to be guitar-only — it's now always visible, which is the intended UX shift.
- **Test gates:** lint 0, build clean, vitest 105/105 (no engine changes), Playwright 4/4 with the updated visual baseline absorbing the added piano controls.
- **Risk:** **Low.** Pure UI surface extension; no engine, types, or data model changes. The lock + randomize wiring on piano uses the *same* state Set the guitar side has used since v1, so there's nothing new to test at the state level.
- **Rollback:** revert the PR.
