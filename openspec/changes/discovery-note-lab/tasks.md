## 1. Note identification

- [x] 1.1 Implement pitch-class formula and slash-chord identification; verify triads, extensions, octave duplicates, inversions, user examples, and unsupported inputs with Vitest.

## 2. Input and audio

- [x] 2.1 Implement source-aware held notes, Ableton-style computer input and optional MIDI with cleanup; verify mapping, sustain, zero-velocity release, independent sources, and disconnect tests.
- [x] 2.2 Implement independent live-note sound and immutable looping accompaniment; verify stop, repetition, cancellation, and audio failures with tests.

## 3. Discovery workspace

- [x] 3.1 Build responsive selectable piano/fretboard, chord HUD and accompaniment controls with localization; verify accessible rendered markup and English/Japanese coverage.
- [x] 3.2 Integrate the delivered shell contract and run the focused end-to-end tests in the v4 integration worktree; verify desktop/mobile interactions with no runtime errors. The integration owner also forwards allowRests to the updated audio scheduling API.

## 4. Handoff

- [x] 4.1 Validate OpenSpec and regression tests, record exact outcomes and commit the isolated feature for integration without deploying.

## 5. Review refinements

- [x] 5.1 Refine the Discovery HUD, interval ledger, family color, piano note/shortcut typography, and compact octave hint; add component and browser coverage for long names, C2/D2 alignment, and key-label containment.
- [x] 5.2 Add single-device MIDI selection over enumerated inputs with hotplug, switching, note release, port cleanup, localized UI, and unit/browser regressions.
- [x] 5.3 Add stable per-card and atomic whole-progression Piano octave controls, a shifted three-octave keyboard window, and tests proving Hasher playback/MIDI/voice and Discovery loop consume the transformed voicings.
- [x] 5.4 Add the dictionary-gated Discovery pin action through the existing silent floating-card layer and verify cross-workspace persistence without timeline or audio mutation.
- [x] 5.5 Apply PR #112's Wrangler 4.144.0 lockfile graph with `sharp` 0.35.4 and the fresh audit's non-breaking transitive resolutions; run build, lint, unit, focused/full browser, dependency, and strict OpenSpec validation; refresh visual evidence and PR #110 notes without deploying.
