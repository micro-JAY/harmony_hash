## Why

The Fretboard Explorer now maps scales accurately across instruments, tunings, and handedness, but it still shows the entire neck and cannot compare a dictionary chord against the selected scale. Musicians need focused, honestly named guitar patterns and an immediate way to see which chord tones fit the scale or create useful chromatic color before later practice and playback features build on this view.

## What Changes

- Add an `All` / `CAGED` / `3NPS` pattern control with remembered C, A, G, E, D forms and seven three-notes-per-string positions.
- Keep `All` behavior-identical to the current complete scale map.
- Enable CAGED and 3NPS only for Standard six-string guitar in this version; bass and alternate tunings retain `All` with a visible, screen-reader-accessible compatibility explanation rather than showing misleading shapes.
- Add an accessible inline chord-overlay picker backed exclusively by the shared chord dictionary, with keyboard search, selection, focus restoration, and clear actions.
- Preserve the musician's selected overlay while root, mode, pattern, tuning, handedness, labels, or instrument changes so the harmonic fit can be compared across contexts.
- Render in-scale chord tones with the existing scale-degree treatment plus a distinct non-color-only ring, and render outside-scale chord tones with explicit chromatic semantics instead of hiding them.
- Keep pattern membership orientation-neutral so handedness changes visual order only, and preserve tuning, builder state, playback/highlight behavior, Harmony Companion continuity, reduced motion, responsive containment, and the existing interaction budget.
- Add pure-function, component, responsive, keyboard, accessibility, performance, and visual-regression coverage.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `guitar-fretboard`: Extend the explorer with standard-guitar CAGED/3NPS filtering and dictionary-valid chord-tone overlays across the supported guitar/bass maps.

## Impact

- Extends the shared pure fretboard theory layer and its exports without changing existing scale-position semantics.
- Extends `FretboardExplorer.tsx` and `HorizontalFretboard.tsx` with a separate learning-layer control surface and chord-tone rendering semantics.
- Consumes existing chord lookup, catalog-entry identity, note parsing, and display-spelling helpers; it does not change the chord-data format, public routes, provider tools, dependencies, or persisted state.
- Adds focused Vitest and Playwright coverage and updates only intentional fretboard visual evidence.
