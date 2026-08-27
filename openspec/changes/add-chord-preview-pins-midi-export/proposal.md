## Why

Hasher currently requires musicians to add and run a chord before they can inspect its Guitar or Piano card, which makes dictionary exploration unnecessarily slow. The Share panel also stops at a browser link, leaving the selected chord voicings disconnected from DAW workflows, while the current input order gives secondary preset controls more visual weight than the primary describe-and-build paths.

## What Changes

- Show a full Guitar or Piano chord-card preview near the pointer after a chord-grid cell is hovered for 1.5 seconds.
- Pin a preview when the user clicks into it, keep pinned cards across Hasher, Tune Toolbox, and Fret Finder navigation, and let the user drag or dismiss each visual-only card without changing the progression or producing audio.
- Preserve chord variation, Piano voicing-style, display-mode, and Modify controls on preview/pinned cards while omitting timeline lock behavior.
- Add Standard MIDI File export to the existing Share panel using the currently selected Guitar variations or Piano voicings, with one bar per progression chord and no explicit tempo event.
- Reorder Hasher so the natural-language prompt appears first, the direct composer follows, the compact Key/Mode controls sit with Browse Chords, and presets appear last.
- Hide the preset section while the chord browser is expanded and keep the revised controls responsive and aligned.

## Capabilities

### New Capabilities
- `chord-preview-pins`: Delayed chord-grid previews, pinning, constrained dragging, cross-workspace persistence, and visual-only card editing.
- `midi-export`: Deterministic Standard MIDI File generation and download from the active progression's selected instrument voicings.

### Modified Capabilities
- `progression-input`: Change the unified Hasher reading order, colocate Key/Mode with Browse Chords, and hide preset selection while the browser is open.

## Impact

- Affects `ProgressionInput`, `ChordReferenceGrid`, `ChordCard`/`ChordCardFrame`, the application root, and the existing Share panel.
- Adds a pure browser-side MIDI encoder plus unit/component coverage; no Worker route, provider, persistence, or external dependency is required.
- Reuses the shared chord dictionary, existing Guitar diagram MIDI derivation, Piano voicing engine, design tokens, localization flow, and Motion drag primitives.
- URL sharing, progression playback, Run/Modify behavior, timeline locks, Hanz, and all non-Hasher workspace state remain unchanged.
