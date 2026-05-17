## 1. Engine: candidate enumeration

- [ ] 1.1 Add private helper `enumerateVoicingCandidates(noteNames: string[]): VoicedChord[]` to `src/lib/harmonyBrain.ts`. Iterate over all N cyclic rotations (inversions) of `noteNames` × starting octaves {3, 4} × {closed, Drop 2 if N >= 4}. Filter to candidates whose every note has MIDI in [48, 83].
- [ ] 1.2 Ensure the first candidate emitted matches the output of `computeVoicing(noteNames)` exactly, so the function generalizes the existing behavior.
- [ ] 1.3 Order candidates deterministically (lowest starting octave first, then inversion index ascending, then voicing-type stable) so tie-breaks are predictable across runs.

## 2. Engine: voice-leading distance metric

- [ ] 2.1 Add private helper `voicingDistance(priorNotes: VoicedNote[], candidateNotes: VoicedNote[]): number`. For each candidate note, compute the minimum semitone distance to any prior note (`Math.abs(c.midi - p.midi)`) and sum. Empty prior or empty candidate → return 0. Common tones contribute 0.
- [ ] 2.2 Add private helper `pickBestCandidate(priorNotes: VoicedNote[], candidates: VoicedChord[]): VoicedChord`. Return the candidate with minimum `voicingDistance`. On tie, prefer the candidate with the lowest average MIDI (stays in the lower register, matching `computeVoicing`'s existing preference).

## 3. Engine: public voice-leading function

- [ ] 3.1 Add public function `computeVoiceLedProgression(progressionNotes: string[][]): VoicedChord[]` to `src/lib/harmonyBrain.ts`. Empty input → return `[]`. Single chord → return `[computeVoicing(progressionNotes[0])]`. Multi-chord → first chord uses `computeVoicing`, each subsequent chord is `pickBestCandidate(prior, enumerateVoicingCandidates(notes))`.
- [ ] 3.2 Export `computeVoiceLedProgression` from the module's public surface.

## 4. Engine tests

- [ ] 4.1 In `src/lib/harmonyBrain.test.ts`, add a `describe("computeVoiceLedProgression", ...)` block.
- [ ] 4.2 Test: empty progression returns `[]`.
- [ ] 4.3 Test: single-chord input returns `[computeVoicing(input[0])]` (deep equal).
- [ ] 4.4 Test: ii-V-I in C (Dm7 → G7 → Cmaj7) produces the hand-traced smoothed voicings: Dm7=[D3,F3,A3,C4]; G7=[D3,F3,G3,B3]; Cmaj7=[E3,G3,B3,C4]. Cumulative voicingDistance < cumulative distance with naive `computeVoicing` per chord.
- [ ] 4.5 Test: I-vi-IV-V in C major (triads) — each chord stays within smooth-motion budget (manually-set threshold).
- [ ] 4.6 Test: ii°-V-i in A harmonic minor (Bdim → E → Am) produces musically-plausible smoothed voicings; assert specific note sets.
- [ ] 4.7 Test: repeated-chord vamp (Dm7-G7-Dm7-G7) — chords at positions 0/2 produce identical voicings; positions 1/3 identical. (Voice leading should stabilize on a cycle.)
- [ ] 4.8 Test: every voicing in every progression result stays in MIDI 48-83.
- [ ] 4.9 Test: `result[0]` is deep-equal to `computeVoicing(progressionNotes[0])` (first-chord-equivalence).
- [ ] 4.10 Existing `computeVoicing` test block remains untouched and green.

## 5. UI rendering: lift voicing to App

- [ ] 5.1 In `src/components/ChordCard.tsx`, add a required `voicing: VoicedChord` prop. Remove the internal `const voicing = computeVoicing(noteNames)` call and the `computeVoicing` import. Keep the `Drop 2` pill label keyed off `voicing.voicingType === "drop2"`. The `noteNames` displayed in the secondary pill are still derived locally from `chord.entry`.
- [ ] 5.2 In `src/App.tsx`, compute `pianoVoicings` from `chords.map(c => parseNotes(c.chord.entry))` via `computeVoiceLedProgression(progressionNotes)` whenever `chords` changes (memoized via `useMemo`). Thread each voicing into its `ChordCard` by index. Empty `chords` → empty `pianoVoicings`.
- [ ] 5.3 Verify Free Input tab + Progressions tab + agent-generated progressions all flow through the same code path (App.tsx is the single host).
- [ ] 5.4 Manual smoke check via `npm run dev`: type "Dm7 G7 Cmaj7" → switch to Piano → confirm the rendered keys are the hand-traced voice-led set (not the old default).

## 6. Spec delta

- [ ] 6.1 Write `openspec/changes/piano-voicings-v2-voice-leading/specs/harmony-brain/spec.md` with `## ADDED Requirements` for "Voice-leading across a progression" — scenario-level acceptance from §4 tests.
- [ ] 6.2 No modifications to existing requirements in `openspec/specs/harmony-brain/spec.md` — the change is strictly additive.

## 7. Verification gates

- [ ] 7.1 `npm run lint` exits 0.
- [ ] 7.2 `npm run build` clean — no new TypeScript errors or warnings.
- [ ] 7.3 `npm run test` green (existing 48 + new voice-leading tests).
- [ ] 7.4 `npx vitest run src/lib/harmonyBrain.test.ts` green (single-file regression).
- [ ] 7.5 Worker smoke not required — worker code untouched.

## 8. PR

- [ ] 8.1 Commit per logical unit (engine + tests in one commit; UI wire-up in a second; spec delta + tasks in a third if substantial).
- [ ] 8.2 Push `feat/piano-voicings-v2-voice-leading`.
- [ ] 8.3 Open PR with the standard template (What / Why / Music-theory references / Screenshots / Test summary / Risks / Follow-ups). Include screenshots of ii-V-I before and after voice-leading.
- [ ] 8.4 Self-merge when CI is green.

## 9. Archive

- [ ] 9.1 After merge: `git mv openspec/changes/piano-voicings-v2-voice-leading openspec/changes/archive/$(date +%Y-%m-%d)-piano-voicings-v2-voice-leading` and apply the spec delta to `openspec/specs/harmony-brain/spec.md` in the same commit. Direct commit on `main` via a follow-up PR (`chore/archive-piano-voicings-v2`) or fold into the next milestone's branch.
- [ ] 9.2 Update `docs/long_horizon_plan.md` to mark milestone 1.1 Done with PR link.
- [ ] 9.3 Add dated entry to `docs/long_horizon_log.md`.
