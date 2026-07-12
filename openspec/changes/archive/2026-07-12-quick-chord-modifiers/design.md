## Context

Harmony Hash already resolves every chord through the build-time catalog and renders the resulting `IndexedChord` through the same `ChordCard` for guitar and piano. Timeline state is owned by `App`: chords are positional, while guitar variants, locks, and piano styles are keyed by index. The restored progression agent also uses a synchronous timeline version so any local edit can invalidate a stale provider response.

This change is a focused interaction inside the existing Tonari Labs card system, not a visual redesign. It therefore does not require generated concept art or new tokens. The main design concern is making a one-card replacement feel immediate without bypassing the shared dictionary or resetting unrelated timeline state.

## Goals / Non-Goals

**Goals:**

- Offer common same-root extensions and alterations within two pointer actions from a chord card.
- Keep the complete same-root catalog reachable through a compact searchable list.
- Apply one dictionary-valid replacement identically to guitar and piano.
- Preserve positional state that still makes sense and invalidate stale asynchronous agent results.
- Provide explicit focus, Escape, pointer, touch, and responsive behavior.

**Non-Goals:**

- Generating new chord spellings, adding catalog entries, or synthesizing unsupported voicings.
- Recommending functional harmony, detecting a key, or scoring the next chord.
- Changing multiple cards, transposing a progression, or modifying the voice-agent tool schema.
- Redesigning the chord card, app shell, or Tonari Labs visual system.

## Decisions

### 1. Derive alternatives from indexed catalog entries

A dedicated pure helper will query unique `IndexedChord` entries with the same canonical root, exclude the current entry, preserve the musician's sharp/flat root spelling, and optionally retain a real slash-bass note. Every returned option will be re-resolved through `lookupChord` before it reaches the UI.

This keeps the catalog as the source of truth and handles quality strings that themselves contain `/` (for example `6/9`) by relying on the existing `bass` discriminator rather than parsing display text heuristically. Hard-coded chord construction was rejected because it could advertise symbols the catalog cannot render.

### 2. Rank, do not restrict, the quick set

The helper will rank a small family-aware quick set: major chords prioritize major sevenths/sixths/add tones, minor chords prioritize minor sevenths/sixths/extensions, and dominant chords prioritize ninths/thirteenths/alterations. The panel will also search the entire same-root set.

This makes `C → Cmaj7/C6` and `G7 → G7#9` immediate while avoiding a new theory engine. Showing only a curated list was rejected because it would hide valid catalog alternatives; showing every entry up front was rejected because roughly fifty choices per root would overwhelm a card.

### 3. Use an inline disclosure panel within the card

Each card header will expose a labeled `Modify` button with `aria-expanded`/`aria-controls`. Opening it reveals quick option buttons plus a search field and filtered results. Escape closes the panel and restores focus to the trigger; selection applies immediately and closes it.

An inline panel fits the existing card language, works without a portal dependency, and remains predictable on mobile. A hover-only menu was rejected for touch and keyboard accessibility. A full-screen modal was rejected as too disruptive for a rapid local edit.

### 4. Keep replacement authority in `App`

`ChordCard` will emit the chosen input label and validated `IndexedChord`; `App` will replace only that index, increment the shared timeline mutation version, stop playback, preserve the lock, clamp the guitar variant to the replacement's available range, and retain the piano style only when it remains applicable (otherwise reset that index to `auto`). Other cards and their state remain unchanged.

`App` will also allocate stable render keys for each card. Full progression replacements receive fresh keys, appends receive new keys, removals drop only the removed key, and local chord modification preserves the selected key. This keeps compatible component-local guitar/piano display modes attached to the surviving card instead of remounting it or transferring state by array index.

This follows the existing ref-mirror and timeline ownership instead of introducing component-local progression state or a store. Reusing the full-progression `handleResult` was rejected because it intentionally resets all per-card state.

### 5. Keep the component boundary narrow

Catalog/ranking logic will live in `src/lib/chordModifiers.ts`; the focused disclosure UI will live in `src/components/ChordModifier.tsx`; `ChordCard` will compose it; and `App` will own the mutation callback. Static ranking tables and labels will be module-level constants, and derived option filtering will be memoized by primitive inputs.

## Risks / Trade-offs

- [A ranked option feels musically prescriptive] → Label the row `Quick changes`, base it only on chord family, and keep the full catalog search visible.
- [A replacement has fewer guitar variants] → Clamp only that card's variant to the replacement's valid range.
- [A selected piano style cannot voice the replacement] → Preserve applicable styles and reset only the affected card to `Auto` otherwise.
- [A replacement or removal resets/transfers component-local display state] → Track stable card render keys alongside the positional timeline and preserve them for surviving cards.
- [Flat-root labels drift back to sharps] → Derive labels from the current display root and verify every spelling with `lookupChord`.
- [The inline panel makes narrow cards taller] → Keep the default collapsed, cap the result region, and validate 375px, tablet, and desktop layouts for overflow.
- [An in-flight text-agent response overwrites the edit] → Increment the existing synchronous timeline mutation version before replacing the chord.
