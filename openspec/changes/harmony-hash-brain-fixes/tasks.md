## 1. Stage 1 - Harmony Brain Chord Resolution Fixes

- [x] 1.1 Baseline Stage 1 with `npm run build` and `npx vitest run`.
- [x] 1.2 Fix minor numeral suffix normalization to prevent duplicated `m` quality output.
- [x] 1.3 Handle slash-numeral progression tokens by resolving the primary numeral segment without parser errors.
- [x] 1.4 Re-run build/tests, verify Stage 1 acceptance cases, and commit `fix: roman numeral parser double-m and slash chord bugs`.

## 2. Stage 2 - Note Display Formatting Consistency

- [x] 2.1 Run pre-stage build/tests and add note display helpers in `src/lib/chordData.ts` (`formatNoteForDisplay`, `prefersFlatNotation`).
- [x] 2.2 Update chord note-row rendering in `src/components/ChordCard.tsx` to use formatted note labels aligned with chord-root notation.
- [x] 2.3 Add piano-key display formatting guard/comment in `src/components/PianoKeyboard.tsx` for internal note encoding.
- [x] 2.4 Re-run build/tests, verify Stage 2 display acceptance cases, and commit `fix: note display format and chord name consistency`.

## 3. Stage 3 - Piano Range and Smart Voicing Placement

- [x] 3.1 Run pre-stage build/tests and expand piano keyboard rendering range from C3-B4 to C3-B5.
- [x] 3.2 Implement smart voicing start-octave selection in `computeVoicing` to prefer the lowest fully visible voicing in MIDI 48-83.
- [x] 3.3 Guard Drop 2 application to avoid underflow below C3 and preserve complete visible chord tones.
- [x] 3.4 Re-run build/tests, verify Stage 3 piano acceptance cases, and commit `fix: piano 3-octave range and smart voicing start octave`.

## 4. Stage 4 - Variant Override Handoff and Guitar Card Locking

- [x] 4.1 Run pre-stage build/tests and refactor variant override flow so card arrows remain functional after Randomize All.
- [x] 4.2 Add parent-managed per-card lock state and lock-toggle UI in guitar cards using `lucide-react` `Lock`/`Unlock` icons.
- [x] 4.3 Update randomize-all behavior to skip locked cards while keeping unlocked cards randomizable.
- [x] 4.4 Re-run build/tests, verify Stage 4 acceptance cases, and commit `feat: chord card lock and fix randomize variant arrows`.

## 5. Final Verification and Spec Closure

- [ ] 5.1 Run final `npm run build` and `npx vitest run` with all stages applied.
- [ ] 5.2 Confirm no internal note encoding appears in UI-facing rendering paths.
- [ ] 5.3 Mark all OpenSpec tasks complete or blocked with rationale.
