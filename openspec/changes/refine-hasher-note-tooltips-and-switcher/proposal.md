## Why

HASHER's fixed twelve-item interval legend consumes scarce horizontal space while the dense guitar diagram still leaves open-string and barre-note meanings difficult to read. Putting note and harmonic-role guidance directly on each highlighted guitar or piano note keeps the learning context close to the point of use and simplifies the builder controls.

## What Changes

- Remove the fixed HASHER interval-color legend from the builder output toolbar.
- Add a compact hover/focus tooltip to every highlighted guitar position and piano key, showing the displayed note plus its chord degree and harmonic role (for example, `E · 3 · Major third`).
- Keep guitar open-string, fretted, and barre positions individually discoverable without depending on text drawn inside small markers.
- Move the global Guitar/Piano selector directly beneath the Run button and replace its visible text labels with guitar and keyboard icons.
- Use a black icon on the existing light selected surface and the existing muted grey treatment for the unselected icon, with accessible names retained.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `chord-card-display`: Replace the fixed interval legend with note-level guitar and piano education tooltips, and refine the global instrument toggle's presentation and placement.
- `progression-input`: Place the shared instrument selector in the composer action column directly beneath Run.

## Impact

Affected surfaces are the HASHER composer layout, global instrument toggle, guitar SVG overlay rendering, piano keyboard rendering, shared interval presentation helpers, and focused unit/Playwright coverage. No chord parsing, voicing, playback, Worker API, or TUNE TOOLBOX/FRET FINDER behavior changes.
