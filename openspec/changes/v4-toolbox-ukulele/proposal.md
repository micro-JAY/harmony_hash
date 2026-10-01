## Why

Fret Finder belongs beside the other learning tools, but its crowded controls and uneven alignment make the toolbox harder to use. Standard ukulele support should let musicians use the same progression workflow without losing a whole progression when a chord needs a reduced voicing.

## What Changes

- Move Fret Finder into a persistent collapsible Tune Toolbox panel before Scale Synthesia.
- Align primary controls and group optional tuning, handedness, pattern and overlay controls behind a labeled disclosure.
- Add standard high-G G4 C4 E4 A4 ukulele to Hasher and Fret Finder, including deterministic playable chord shapes, variants, diagrams and playback.
- Preserve valid chord identities and show explicit reduced-voicing or unavailable-shape information instead of rejecting an entire progression.
- Keep guitar/piano behavior and production unchanged; the separate Discovery change replaces the third workspace. Tour changes remain deferred until user approval.

## Capabilities

### New Capabilities
- `ukulele`: Standard-tuning chord voicings, diagrams, variant selection and playback.

### Modified Capabilities
- `theory-workspace`: Fret Finder becomes the first collapsible tool with tidy optional controls.
- `guitar-fretboard`: Add standard ukulele mapping and controls.

## Impact

Instrument types, shared playback, chord cards, instrument selection, fretboard theory helpers, toolbox layout, localization and regression tests. No new dependencies or provider API changes; no production deployment or tour rewrite.
