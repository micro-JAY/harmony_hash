## Why

The first-class fretboard currently assumes standard tuning and a right-handed neck, which makes its scale map misleading for musicians who regularly use alternate tunings or play left-handed. The explorer needs an explicit immutable tuning model and a visual-axis contract before pattern filters and chord overlays build on it.

## What Changes

- Add common guitar tunings: Standard, Drop D, DADGAD, and Open G.
- Add common four-string bass tunings: Standard, Drop D, and BEAD.
- Add an accessible Right-handed/Left-handed presentation control.
- Reverse the complete fret axis in Left-handed mode so open strings sit at the right edge while high-to-low string order remains stable.
- Make Left/Right arrow navigation follow visual direction in either handedness and keep the open-string edge visible on mobile after orientation changes.
- Preserve independent tuning selections for guitar and bass while switching instruments.
- Update the tuning readout, board accessible name, string labels, exact position semantics, responsive behavior, and tests.
- Preserve builder state, Harmony Companion continuity, scale/mode/label controls, public routes, and provider/tool surfaces.

## Capabilities

### New Capabilities

None.

### Modified Capabilities
- `guitar-fretboard`: Extend the pure mapping and explorer contract with immutable alternate-tuning definitions, per-instrument selection, and handed visual orientation.

## Impact

- Extends `src/lib/theory/fretboard.ts`, `FretboardExplorer.tsx`, and `HorizontalFretboard.tsx` without changing the shared builder `Instrument` type.
- Adds theory and Playwright coverage plus updated desktop visual evidence.
- Uses existing React, Framer Motion, Playwright, and Tonari tokens; no new dependency, route, API, secret, or persisted data format.
