## 1. Types

- [x] 1.1 Add `VoicingStyle = "auto" | "drop2" | "drop3" | "rootless" | "shell"` to `src/lib/types.ts`.
- [x] 1.2 Extend `VoicedChord.voicingType` to include `"drop3" | "rootless" | "shell"`.

## 2. Engine

- [x] 2.1 Add `isStyleApplicable(noteNames, style): boolean`. Triads → only "auto". 4+ notes → drop2/drop3/rootless. Shell additionally requires `hasSeventh(noteNames)` (10 or 11 semitones from root to index-3 note).
- [x] 2.2 Add `enumerateClosedCandidates(noteNames, voicingType)` — inversions × octave starts × closed voicing. Used for rootless and shell.
- [x] 2.3 Add `buildDropNVoicing(noteNames, pitchClasses, startOctave, dropDistance)` — generic 2-or-3 drop helper. Returns null on underflow.
- [x] 2.4 Add `enumerateDropCandidates(noteNames, dropDistance)` — inversions × octaves × Drop N.
- [x] 2.5 Add `enumerateVoicingCandidatesForStyle(noteNames, style)` — dispatches to the right enumerator based on style. Returns [] for inapplicable styles.
- [x] 2.6 Add `computeVoicingForStyle(noteNames, style)` — returns candidates[0] (the canonical voicing), falls back to `computeVoicing` for inapplicable cases.
- [x] 2.7 Extend `computeVoiceLedProgression(progressionNotes, styles?)` — per-chord style threading. `auto` per chord = v2 behavior.

## 3. Engine tests

- [x] 3.1 `isStyleApplicable` correctness across (triad / 7th / 9th / 6th) × all styles.
- [x] 3.2 `computeVoicingForStyle` canonical voicings hand-verified for Cmaj7 / Dm7 / G7 across drop2/drop3/rootless/shell + Cmaj9 rootless.
- [x] 3.3 Fallback to `computeVoicing` for non-applicable (triad + drop2, C6 + shell).
- [x] 3.4 `enumerateVoicingCandidatesForStyle` returns canonical as candidate 0; empty for non-applicable; every candidate in MIDI 48-83.
- [x] 3.5 `computeVoiceLedProgression` with all-shell on ii-V-I → 2-note voice-led chain.
- [x] 3.6 Mixed-style progressions thread through correctly.
- [x] 3.7 Fallback graceful when a style is not applicable mid-progression.
- [x] 3.8 `["auto", "auto", "auto"]` reproduces v2 behavior exactly.

## 4. UI

- [x] 4.1 Add `pianoStyle: VoicingStyle` + `onPianoStyleChange: (style) => void` props to `ChordCard`.
- [x] 4.2 Render style pill toggle (Auto / Drop 2 / Drop 3 / Rootless / Shell) above the piano keyboard, only when `instrument === "piano"`. Match the visual pattern of the existing guitar Fingering/Intervals/Notes toggle. Disable non-applicable styles per chord via `isStyleApplicable`.
- [x] 4.3 Generalize the existing "Drop 2" pill below the keyboard to surface any non-root voicingType via `VOICING_TYPE_LABEL`.
- [x] 4.4 Add `pianoStyles: Record<number, VoicingStyle>` state to `App.tsx`. Reset on `handleResult`.
- [x] 4.5 Memoized `computeVoiceLedProgression(noteSets, styles)` re-runs when chords or styles change.
- [x] 4.6 Thread `pianoStyle` + `onPianoStyleChange` through each `ChordCard`.

## 5. Playwright (before / during / after)

- [x] 5.1 **Before**: baseline already committed in milestone 1.2.
- [x] 5.2 **During**: re-ran `npm run test:e2e` after the UI commit. Existing visual baseline failed (expected — added style toggle row). DOM-decoded MIDI assertion still green.
- [x] 5.3 **After**: regenerated baseline (`npm run test:e2e:update`) capturing the new style-toggle UI; added a second e2e test that clicks "Shell" on every card and asserts the shell voice-led MIDI chain. Both Playwright tests green locally.

## 6. Spec delta

- [x] 6.1 Write `openspec/changes/piano-voicings-v3-extended-styles/specs/harmony-brain/spec.md` — `## ADDED Requirements` for "Voicing style applicability", "Style-constrained voicing", "Voice-leading honors per-chord styles".
- [x] 6.2 Write `openspec/changes/piano-voicings-v3-extended-styles/specs/chord-card-display/spec.md` — `## ADDED Requirements` for "Piano voicing-style selector"; `## MODIFIED Requirements` for the voicing-type pill label.

## 7. Verification gates

- [x] 7.1 `npm run lint` exit 0.
- [x] 7.2 `npm run build` clean (~+2 KB raw / +0.5 KB gzip).
- [x] 7.3 `npm run test` green (57 → 79; +22 new v3 tests).
- [x] 7.4 `npm run test:e2e` green (1 → 2; +1 new shell-toggle test; updated baseline).
- [x] 7.5 Worker smoke not required.

## 8. PR

- [x] 8.1 Commit per logical unit (4 commits on the branch: archive previous, engine, UI, e2e).
- [x] 8.2 Pushed `feat/piano-voicings-v3-extended-styles`.
- [x] 8.3 Opened PR #19 with template + describe-as-text baseline (image attachment not viable via gh CLI).
- [x] 8.4 Self-merged when both `build-and-test` and `playwright` CI jobs green — landed as squash commit `54203da` on 2026-05-17.

## 9. Archive

- [x] 9.1 Bundled into the v4 branch (`feat/piano-voicings-v4-spread`) as the first commit per the bundled-archive pattern.
- [x] 9.2 Update `docs/long_horizon_plan.md` milestone 1.3 → Done with PR link.
- [x] 9.3 Add dated entry to `docs/long_horizon_log.md`.
