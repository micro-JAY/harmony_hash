## 1. Types

- [x] 1.1 Extend `VoicingStyle` in `src/lib/types.ts` with `"spread"` and `"two-hand"`.
- [x] 1.2 Extend `VoicingType` with the same two new values.

## 2. Engine

- [x] 2.1 Add `buildSpreadVoicing(noteNames, pitchClasses, startOctave)`. Root in LH at `startOctave`; remaining chord tones in RH starting at least one octave above. Returns `null` on overflow.
- [x] 2.2 Add `buildTwoHandVoicing(noteNames, pitchClasses, startOctave)`. LH = root + 5th (root only for triads). RH = remaining tones one octave above LH root, ascending.
- [x] 2.3 Add `enumerateRootBassCandidates(noteNames, builder)` — generic enumerator. Inversions don't apply (root in bass); only varies the starting octave (3, 4). Filters to C3-B5 and dedupes by signature.
- [x] 2.4 Extend `isStyleApplicable` — spread and two-hand both require 3+ notes.
- [x] 2.5 Extend `enumerateVoicingCandidatesForStyle` to dispatch to the new builders.

## 3. Engine tests

- [x] 3.1 Spread canonical voicings hand-verified: Cmaj7 = [48, 64, 67, 71]; Dm7 = [50, 65, 69, 72]; G7 = [55, 71, 74, 77]; C triad = [48, 64, 67]; Bmaj7 = [59, 75, 78, 82] (RH pushed to oct 5); Cmaj9 = [48, 64, 67, 71, 74].
- [x] 3.2 LH / RH hand assignment verified on Spread.
- [x] 3.3 Two-hand canonical voicings hand-verified: Cmaj7 = [48, 55, 64, 71]; Dm7 = [50, 57, 65, 72]; G7 = [55, 62, 71, 77]; C triad = [48, 64, 67] (LH = root only); Cmaj9 = [48, 55, 64, 71, 74].
- [x] 3.4 LH / RH hand assignment verified on Two-hand.
- [x] 3.5 `isStyleApplicable` accepts spread + two-hand for 3+ notes, rejects empty.
- [x] 3.6 Voice-leading with all-spread across ii-V-I: every chord stays spread, all notes in C3-B5.
- [x] 3.7 Voice-leading with all-two-hand across ii-V-I: every chord retains LH/RH split.

## 4. UI

- [x] 4.1 Extend `PIANO_STYLE_OPTIONS` with `{ value: "spread", label: "Spread" }` and `{ value: "two-hand", label: "Two-Hand" }`. The `flex flex-wrap` row handles seven pills naturally.
- [x] 4.2 Extend `VOICING_TYPE_LABEL` so the pill below the keyboard reflects "Spread" or "Two-Hand".

## 5. Playwright (before / during / after)

- [x] 5.1 **Before**: existing v3 baseline captured from milestone 1.3.
- [x] 5.2 **During**: re-ran focused e2e after the engine + UI commits. DOM-decoded MIDI assertions for the existing tests still pass; the visual diff against the v3 baseline lands within the 10% pixel-ratio tolerance, so no baseline regeneration needed.
- [x] 5.3 **After**: added one new e2e test that clicks "Spread" on every card and asserts the voice-led spread chain (Dm7=[50,65,69,72], G7=[55,71,74,77], Cmaj7=[60,76,79,83] — engine bumps the I chord to oct 4 to stay close to V's upper register). All 3 Playwright tests green locally.

## 6. Spec delta

- [x] 6.1 Write `openspec/changes/piano-voicings-v4-spread/specs/harmony-brain/spec.md` — `## ADDED Requirements` for "Spread voicing" and "Two-hand voicing" with hand-verified scenarios.
- [x] 6.2 Write `openspec/changes/piano-voicings-v4-spread/specs/chord-card-display/spec.md` — `## MODIFIED Requirements` for the style selector (now seven options).

## 7. Verification gates

- [x] 7.1 `npm run lint` exit 0.
- [x] 7.2 `npm run build` clean (~+1 KB raw / +0.3 KB gzip).
- [x] 7.3 `npm run test` green (79 → 94; +15 new v4 tests).
- [x] 7.4 `npm run test:e2e` green (2 → 3; +1 new spread-toggle test).
- [x] 7.5 Worker smoke not required.

## 8. PR

- [ ] 8.1 Commit per logical unit (1: archive previous + plan/log; 2: engine + tests + types; 3: UI + e2e + spec deltas).
- [ ] 8.2 Push `feat/piano-voicings-v4-spread`.
- [ ] 8.3 Open PR with template noting the UST deferral.
- [ ] 8.4 Self-merge when both CI jobs green.

## 9. Archive

- [ ] 9.1 Bundle into v5's branch as the first commit per the established bundled-archive pattern.
- [ ] 9.2 Update `docs/long_horizon_plan.md` milestone 1.4 → Done with PR link.
- [ ] 9.3 Add dated entry to `docs/long_horizon_log.md`.

## 10. UST follow-up

- [ ] 10.1 File `openspec/changes/piano-voicings-ust/` after v5 lands. Pick one of the two design options laid out in the v4 proposal (new chord type vs extension hint mechanism).
