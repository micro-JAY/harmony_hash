## 1. Theory module

- [x] 1.1 Create `src/lib/theory/index.ts` with `pitchClassOf`, `scalePitchClasses`, `isRootDiatonic`, `scaleDegreeOf`. Pure functions, no React/DOM imports.
- [x] 1.2 Cover all seven supported scale types (major, natural_minor, harmonic_minor, dorian, mixolydian, lydian, phrygian).

## 2. Theory tests

- [x] 2.1 `pitchClassOf`: canonical naturals, sharps (C#, F#), flats (Bb, Eb), unknowns.
- [x] 2.2 `scalePitchClasses`: C major, A natural minor, D dorian, unknown key.
- [x] 2.3 `isRootDiatonic`: C major (correct in/out), D major transposition, A harmonic minor.
- [x] 2.4 `scaleDegreeOf`: degrees 1..7 in C major, null for non-diatonic, D major, A harmonic minor.

## 3. ChordReferenceGrid — mode toggle + overlay

- [x] 3.1 Add `SuggestionMode = "off" | "diatonic"` + `KeyContext = { key: string; scaleType: ScaleType }` types.
- [x] 3.2 Add `keyContext?: KeyContext` prop.
- [x] 3.3 Add internal `suggestionMode` state, defaults to "off".
- [x] 3.4 Render a mode pill toggle ("Off" / "Diatonic") at the top of the expanded grid panel. Diatonic disabled when no keyContext.
- [x] 3.5 Pre-compute `diatonicByRoot: Map<root, boolean>` per render. When overlay is active, apply `opacity: 0.35` to non-diatonic rows; keep diatonic rows at full opacity.

## 4. Plumbing

- [x] 4.1 In `ProgressionInput.tsx`, pass `keyContext={{ key: selectedKey, scaleType: activeGroup.scaleType }}` to `ChordReferenceGrid`.

## 5. Verification gates

- [x] 5.1 `npm run lint` exit 0.
- [x] 5.2 `npm run build` clean (~+800 bytes raw / +400 bytes gzip).
- [x] 5.3 `npm run test` green (105 → 120; +15 theory tests).
- [x] 5.4 `npm run test:e2e` green (4/4 unchanged — overlay is outside existing test surfaces).

## 6. PR

- [ ] 6.1 Commit per logical unit (1: archive previous + plan/log; 2: theory module + tests; 3: UI + spec delta).
- [ ] 6.2 Push `feat/suggestion-overlay-diatonic`.
- [ ] 6.3 Open PR.
- [ ] 6.4 Self-merge when both CI jobs green.

## 7. Archive

- [ ] 7.1 Bundle into the next Phase 2 milestone's branch as the first commit.
- [ ] 7.2 Update `docs/long_horizon_plan.md` milestone 2.2 → Done with PR link.
- [ ] 7.3 Add dated entry to `docs/long_horizon_log.md`.

## 8. Follow-ups (filed for future changes)

- [ ] 8.1 `suggestion-overlay-jazz` — Jazz mode: voice-leading-aware scoring, tritone-sub awareness, ii-V detection, variable-strength border-glow.
- [ ] 8.2 `suggestion-overlay-modal` — Modal mode: cells colored by parent mode.
- [ ] 8.3 Free Input key inference — guess key from typed chords when the user hasn't picked one in the Progressions tab.
