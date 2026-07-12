## Why

Changing a chord from a basic quality to a richer extension currently requires re-entering or regenerating the entire progression. Musicians need a fast, local, dictionary-safe way to audition alternatives on one chord without disturbing the rest of the timeline or switching instrument views.

## What Changes

- Add a compact per-card modifier action that exposes valid same-root chord alternatives from the existing chord catalog.
- Organize high-value alternatives so common extensions and dominant alterations such as `Cmaj7`, `C6`, and `G7#9` are immediately reachable while the full valid same-root set remains searchable.
- Replace only the selected timeline chord and preserve unrelated chord state, current instrument, locks, playback/highlight behavior, and all other cards.
- Route the replacement through the shared chord lookup so guitar and piano render the same validated `IndexedChord` result.
- Make pointer, keyboard, desktop, tablet, and mobile interaction first-class and invalidate any stale in-flight text-agent result when a modifier is applied.

## Capabilities

### New Capabilities

- `quick-chord-modifiers`: Per-chord discovery and application of dictionary-valid same-root extensions, qualities, and alterations with accessible responsive interaction and timeline-state preservation.

### Modified Capabilities

None.

## Impact

- Affected UI: chord-card header/actions and the application-owned timeline mutation path.
- Affected shared code: chord catalog indexing/query helpers and their unit tests.
- Affected validation: React state behavior, responsive rendered layout, keyboard/pointer accessibility, and Playwright flows for guitar and piano.
- No new provider calls, dependencies, public API routes, or chord data formats.
