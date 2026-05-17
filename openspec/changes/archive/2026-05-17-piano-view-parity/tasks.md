## 1. Lock toggle on piano cards

- [x] 1.1 In `src/components/ChordCard.tsx`, remove the `instrument === "guitar"` gate around the lock button. Show on both instruments; same state (`lockedCards: Set<number>` in App.tsx) drives both.
- [x] 1.2 Verify visual layering — lock button (top-right with surface-highlight background) does not conflict with the v5 active-chord glow (box-shadow on the card wrapper).

## 2. Randomize All — piano semantics

- [x] 2.1 In `src/App.tsx`, define `RANDOM_PIANO_STYLES: ReadonlyArray<VoicingStyle>` = the six explicit styles (auto excluded).
- [x] 2.2 Branch `randomizeAll()` by instrument:
  - Guitar: existing behavior (random variant 1..variationCount per unlocked card).
  - Piano: for each unlocked card, filter `RANDOM_PIANO_STYLES` by `isStyleApplicable(notes, style)`, pick one uniformly at random. If no style applies, default to "auto".
- [x] 2.3 Show the Randomize All button for both instruments. Label adapts: "Randomize All Variants" (guitar) vs "Randomize All Voicings" (piano).

## 3. Notes / Fingering display toggle

- [x] 3.1 In `ChordCard.tsx`, add `const [pianoDisplay, setPianoDisplay] = useState<PianoDisplayMode>("notes")`.
- [x] 3.2 Render a pill toggle (Notes / Fingering) next to the existing voicing-type pill below the keyboard. Use `--interactive-accent-bg` for active, transparent for inactive — same visual pattern as the existing style toggle.
- [x] 3.3 Pass `displayMode={pianoDisplay}` to `PianoKeyboard` (was hardcoded `"notes"`).
- [x] 3.4 Verify fingering mode renders the existing `PianoKeyboard` fingering behavior (ascending finger numbers + root-key accent already in the keyboard component).

## 4. Playwright (before / during / after)

- [x] 4.1 Before: v5 baseline.
- [x] 4.2 During: re-ran e2e after the UI commits. Visual diff blew past tolerance (added lock button + Notes/Fingering toggle to piano cards, plus the Randomize button on piano view). DOM assertions still green.
- [x] 4.3 After: regenerated baseline; all 4 e2e tests green. No new e2e test added — existing tests cover the auto / spread / shell / playback flows; lock + randomize are exercised by the unit tests + manual smoke.

## 5. Spec delta

- [x] 5.1 Write `openspec/changes/piano-view-parity/specs/chord-card-display/spec.md` — modify the existing "Guitar lock toggle visibility" and "Randomize All button" requirements to cover both instruments; ADD a "Piano randomization picks an applicable style per card" requirement.

## 6. Verification gates

- [x] 6.1 `npm run lint` exit 0.
- [x] 6.2 `npm run build` clean (~+200 bytes raw / +100 bytes gzip).
- [x] 6.3 `npm run test` green (105/105 — no engine changes).
- [x] 6.4 `npm run test:e2e` green (4/4 with updated baseline).

## 7. PR

- [ ] 7.1 Commit per logical unit (1: archive previous; 2: lock + randomize + display toggle; 3: spec delta).
- [ ] 7.2 Push `feat/piano-view-parity`.
- [ ] 7.3 Open PR.
- [ ] 7.4 Self-merge when both CI jobs green.

## 8. Archive

- [ ] 8.1 Bundle into the next Phase 2 milestone's branch as the first commit.
- [ ] 8.2 Update `docs/long_horizon_plan.md` milestone 2.1 → Done with PR link.
- [ ] 8.3 Add dated entry to `docs/long_horizon_log.md`.
