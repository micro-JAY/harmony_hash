## Why

Musicians need to identify a chord from notes they already know or play, including ambiguous inversions, without first selecting a named chord or a saved diagram. Harmony Hash v4 gives this activity its own DISCOVERY workspace after Fret Finder moves into Tune Toolbox.

## What Changes

- Add a multi-octave interactive piano and standard guitar fretboard with persistent pointer selections and glowing live input.
- Identify common triads, suspended, sixth, seventh, added-tone, extended, and altered chords from pitch classes, retaining the actual bass register for inversion and slash alternatives.
- Add opt-in computer keyboard and Web MIDI input, audible live notes, and full release/cleanup behavior.
- Add read-only looping playback of the current Hasher progression with a local tempo control. No recording or timeline editing is added.
- Provide English/Japanese copy, accessible controls, responsive layouts, and regression coverage.

## Capabilities

### New Capabilities

- `discovery`: Note-first chord identification, playable instruments, and read-only accompaniment.

### Modified Capabilities

None. Shell navigation is integrated separately with the toolbox change; the existing Hasher playback and guided tour remain unchanged in this slice.

## Impact

New Discovery components, pure theory/input/audio helpers, tests, localized copy, and semantic layout tokens. The shell supplies an immutable progression playback request and activation state. No backend routes, providers, recording APIs, or dependencies are added.
