## Why

Harmony Hash can explain chord shapes but has no first-class way to see how a scale or mode spans an entire fretted instrument. Musicians need a fast horizontal map that works for both guitar and bass, keeps interval relationships visible, and remains usable on small screens.

## What Changes

- Add a first-class Fretboard workspace alongside the existing progression Builder without discarding builder state.
- Add a pure fretboard engine for standard guitar and four-string bass tunings, pitch-class placement, scale membership, scale-degree labels, and display-note spelling.
- Add independent instrument, root, mode, and label controls for the explorer.
- Render a horizontally oriented 15-fret board with open strings, octave markers, root emphasis, interval-role coloring, and either interval or note labels.
- Keep the full board keyboard-readable and expose exact string, fret, note, and interval semantics to assistive technology.
- Preserve the existing builder instrument toggle, progression state, voice companion, chord-card rendering, and public API routes.
- Defer alternate tunings, handedness, CAGED/3NPS filtering, chord overlays, and scale playback to independently specified follow-ups rather than ship inert controls.

## Capabilities

### New Capabilities
- `guitar-fretboard`: Pure fretboard mapping plus the responsive guitar/bass scale-and-mode exploration surface.

### Modified Capabilities
- `app-shell`: Add accessible Builder/Fretboard workspace navigation while preserving the existing builder state and controls.

## Impact

- Adds a lazy-loaded explorer component and pure theory/fretboard helpers under `src/components/` and `src/lib/theory/`.
- Updates `App.tsx` and `Header.tsx` for top-level workspace selection.
- Adds Vitest and Playwright coverage plus responsive visual baselines/evidence.
- Uses existing React, Framer Motion, Lucide, Tailwind layout primitives, and Tonari semantic tokens; no new dependency, provider, route, secret, or persisted data format.
