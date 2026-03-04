## Why

Harmony Hash has several regressions that break progression resolution and visual correctness: roman numerals with minor extensions can resolve to invalid chord symbols, slash numerals can throw parse errors, internal note encodings leak into UI text, and some piano voicings render incomplete because they fall outside the visible keyboard range. Randomize interactions also currently desynchronize card variant controls.

## What Changes

- Fix roman numeral parsing/transposition so lowercase minor numerals do not duplicate the `m` quality and slash numerals resolve without parser errors.
- Add explicit note-name display formatting so internal `s/f` encodings are converted to user-facing `#`/`b` notation consistently with chord root spelling.
- Extend piano rendering from 2 octaves (C3-B4) to 3 octaves (C3-B5) and update voicing start-octave/drop-2 logic to maximize on-screen note visibility.
- Fix guitar-card variant override behavior so per-card arrows continue working after Randomize All.
- Add per-card guitar lock controls so Randomize All skips locked cards while preserving current variant.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `harmony-brain`: Roman numeral transposition and voicing behavior change to handle minor-suffix normalization, slash numerals, and keyboard-range-aware voicings.
- `chord-data`: Note formatting behavior changes to provide user-facing notation conversion from internal note encodings.
- `chord-card-display`: Chord card output behavior changes for formatted note labels, 3-octave piano rendering, robust randomize/variant interaction, and guitar-card locking.

## Impact

- Affected code: `src/lib/harmonyBrain.ts`, `src/lib/chordData.ts`, `src/components/PianoKeyboard.tsx`, `src/components/ChordCard.tsx`, `src/App.tsx`.
- API surface: shared utility additions for note display formatting and flat/sharp preference detection.
- UX impact: removes parse errors on valid progression presets, improves notation consistency, ensures full-note piano visibility, and adds lock affordance in guitar mode.
