## 1. Note identification

- [x] 1.1 Implement pitch-class formula and slash-chord identification; verify triads, extensions, octave duplicates, inversions, user examples, and unsupported inputs with Vitest.

## 2. Input and audio

- [x] 2.1 Implement source-aware held notes, Ableton-style computer input and optional MIDI with cleanup; verify mapping, sustain, zero-velocity release, independent sources, and disconnect tests.
- [x] 2.2 Implement independent live-note sound and immutable looping accompaniment; verify stop, repetition, cancellation, and audio failures with tests.

## 3. Discovery workspace

- [x] 3.1 Build responsive selectable piano/fretboard, chord HUD and accompaniment controls with localization; verify accessible rendered markup and English/Japanese coverage.
- [ ] 3.2 Integrate the delivered shell contract and run the focused end-to-end tests in the v4 integration worktree; verify desktop/mobile interactions with no runtime errors. The integration owner also forwards allowRests to the updated audio scheduling API.

## 4. Handoff

- [x] 4.1 Validate OpenSpec and regression tests, record exact outcomes and commit the isolated feature for integration without deploying.
