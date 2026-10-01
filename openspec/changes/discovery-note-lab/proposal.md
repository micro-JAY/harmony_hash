## Why

Musicians need to identify a chord from notes they already know or play, including ambiguous inversions, without first selecting a named chord or a saved diagram. Harmony Hash v4 gives this activity its own DISCOVERY workspace after Fret Finder moves into Tune Toolbox.

## What Changes

- Add a multi-octave interactive piano and standard guitar fretboard with persistent pointer selections and glowing live input.
- Identify common triads, suspended, sixth, seventh, added-tone, extended, and altered chords from pitch classes, retaining the actual bass register for inversion and slash alternatives.
- Add opt-in computer keyboard and Web MIDI input, audible live notes, and full release/cleanup behavior.
- Add read-only looping playback of the current Hasher progression with a local tempo control. No recording or timeline editing is added.
- Refine the Discovery learning HUD with compact family-colored chord names, the shared interval-color ledger, aligned detail content, collision-free piano labels, and a compact computer-key octave hint.
- Let musicians choose one MIDI input when several are connected and pin a dictionary-backed discovered chord into the existing visual-only Hasher card layer.
- Add per-chord and whole-progression octave controls to Hasher Piano cards and carry those exact shifted voicings into Hasher playback, MIDI export, and the Discovery loop.
- Include chore PR #112's Wrangler 4.144.0 dependency graph, including the `sharp` 0.35.4 security update, in this integration branch.
- Provide English/Japanese copy, accessible controls, responsive layouts, and regression coverage.

## Capabilities

### New Capabilities

- `discovery`: Note-first chord identification, playable instruments, and read-only accompaniment.

### Modified Capabilities

- `chord-card-display`: Add bounded octave controls for one Piano chord or the complete progression and keep every voicing consumer synchronized.

Shell navigation is integrated separately with the toolbox change; guided-tour behavior remains unchanged in this slice.

## Impact

New Discovery components, pure theory/input/audio helpers, tests, localized copy, and semantic layout tokens. The shell supplies an immutable progression playback request and activation state plus a bounded request into the existing floating-card layer. Hasher owns octave offsets and supplies the resulting MIDI snapshots to every downstream consumer. No backend routes, providers, or recording APIs are added; dependency changes are the reviewed Wrangler 4.144.0 graph and transitive `sharp` 0.35.4 update consolidated from PR #112, plus non-breaking lock-only `nanoid` and `brace-expansion` audit resolutions.
