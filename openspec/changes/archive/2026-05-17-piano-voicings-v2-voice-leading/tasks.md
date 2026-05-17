## 1. Engine: candidate enumeration

- [x] 1.1 Add private helper `enumerateVoicingCandidates(noteNames: string[]): VoicedChord[]` to `src/lib/harmonyBrain.ts`. Iterate over all N cyclic rotations (inversions) of `noteNames` × starting octaves {3, 4} × {closed, Drop 2 if N >= 4}. Filter to candidates whose every note has MIDI in [48, 83].
- [x] 1.2 Ensure the first candidate emitted matches the output of `computeVoicing(noteNames)` exactly, so the function generalizes the existing behavior.
- [x] 1.3 Order candidates deterministically (lowest starting octave first, then inversion index ascending, then voicing-type stable) so tie-breaks are predictable across runs.

## 2. Engine: voice-leading distance metric

- [x] 2.1 Add private helper `voicingDistance(priorNotes: VoicedNote[], candidateNotes: VoicedNote[]): number`. For each candidate note, compute the minimum semitone distance to any prior note (`Math.abs(c.midi - p.midi)`) and sum. Empty prior or empty candidate → return 0. Common tones contribute 0.
- [x] 2.2 Add private helper `pickBestCandidate(priorNotes: VoicedNote[], candidates: VoicedChord[]): VoicedChord`. Return the candidate with minimum `voicingDistance`. On tie, prefer the candidate with the lowest average MIDI (stays in the lower register, matching `computeVoicing`'s existing preference).

## 3. Engine: public voice-leading function

- [x] 3.1 Add public function `computeVoiceLedProgression(progressionNotes: string[][]): VoicedChord[]` to `src/lib/harmonyBrain.ts`. Empty input → return `[]`. Single chord → return `[computeVoicing(progressionNotes[0])]`. Multi-chord → first chord uses `computeVoicing`, each subsequent chord is `pickBestCandidate(prior, enumerateVoicingCandidates(notes))`.
- [x] 3.2 Export `computeVoiceLedProgression` from the module's public surface.

## 4. Engine tests

- [x] 4.1 In `src/lib/harmonyBrain.test.ts`, add a `describe("computeVoiceLedProgression", ...)` block.
- [x] 4.2 Test: empty progression returns `[]`.
- [x] 4.3 Test: single-chord input returns `[computeVoicing(input[0])]` (deep equal).
- [x] 4.4 Test: ii-V-I in C (Dm7 → G7 → Cmaj7) produces the hand-traced smoothed voicings: Dm7=[D3,F3,A3,C4]; G7=[D3,F3,G3,B3]; Cmaj7=[E3,G3,B3,C4]. Cumulative voicingDistance < cumulative distance with naive `computeVoicing` per chord.
- [x] 4.5 Test: I-vi-IV-V in C major (triads) — each chord stays within smooth-motion budget, beats naive cumulative motion.
- [x] 4.6 Test: ii°-V-i in A harmonic minor (Bdim → E → Am) produces musically-plausible smoothed voicings; assert specific note sets and beat naive on cumulative motion.
- [x] 4.7 Test: repeated-chord vamp (Dm7-G7-Dm7-G7) — chords at positions 0/2 produce identical voicings; positions 1/3 identical. (Voice leading stabilizes on a cycle.)
- [x] 4.8 Test: every voicing in every progression result stays in MIDI 48-83 across 6 progressions including 5-note chords (Cmaj9 → Fmaj9), high-root triads (Bb→B→F#), and a Dm9-G13 vamp.
- [x] 4.9 Test: `result[0]` is deep-equal to `computeVoicing(progressionNotes[0])` (first-chord-equivalence).
- [x] 4.10 Existing `computeVoicing` test block remains untouched and green. Also added a common-tone retention test (C major → Am keeps C3 and E3 at the same MIDI). Total: 9 new tests, 48 → 57 in the harmonyBrain suite.

## 5. UI rendering: lift voicing to App

- [x] 5.1 In `src/components/ChordCard.tsx`, add a required `voicing: VoicedChord` prop. Remove the internal `const voicing = computeVoicing(noteNames)` call and the `computeVoicing` import. Keep the `Drop 2` pill label keyed off `voicing.voicingType === "drop2"`. The `noteNames` displayed in the secondary pill are still derived locally from `chord.entry`.
- [x] 5.2 In `src/App.tsx`, compute `pianoVoicings` from `chords.map(c => parseNotes(c.chord.entry))` via `computeVoiceLedProgression(progressionNotes)` whenever `chords` changes (memoized via `useMemo`). Thread each voicing into its `ChordCard` by index. Empty `chords` → empty `pianoVoicings`.
- [x] 5.3 Verify Free Input tab + Progressions tab + agent-generated progressions all flow through the same code path (App.tsx is the single host).
- [x] 5.4 Manual smoke check via `npm run dev` + Playwright MCP: typing "Dm7 G7 Cmaj7" → switching to Piano → the rendered active piano keys decoded back to [50,53,57,60] / [50,53,55,59] / [52,55,59,60] — exactly the engine's hand-traced voice-led set.

## 6. Spec delta

- [x] 6.1 Wrote `openspec/changes/piano-voicings-v2-voice-leading/specs/harmony-brain/spec.md` with `## ADDED Requirements` for "Voice-leading across a progression" and "Voicing-distance metric".
- [x] 6.2 No modifications to existing requirements in `openspec/specs/harmony-brain/spec.md` — the change is strictly additive.

## 7. Verification gates

- [x] 7.1 `npm run lint` exits 0.
- [x] 7.2 `npm run build` clean — no new TypeScript errors or warnings. Bundle: 510 KB / 133 KB gzip (+1.3 KB raw / +0.2 KB gzip vs main).
- [x] 7.3 `npm run test` green (57/57, including 9 new voice-leading tests).
- [x] 7.4 `npx vitest run src/lib/harmonyBrain.test.ts` green (single-file regression).
- [x] 7.5 Worker smoke not required — worker code untouched.

## 8. PR

- [x] 8.1 Committed in two logical units: `feat(harmony-brain): voice-leading across a progression` (engine + tests + openspec change + .gitignore) and `feat(piano): thread voice-led voicings from App to ChordCard` (UI wire-up).
- [x] 8.2 Pushed `feat/piano-voicings-v2-voice-leading`.
- [x] 8.3 Opened PR #16 with the standard template. No committed screenshots (Playwright baselines arrive with the harness in milestone 1.2); manual-smoke MIDI verification documented in the PR body.
- [x] 8.4 Self-merged when CI green — landed as squash commit `04aa233` on 2026-05-17.

## 9. Archive

- [x] 9.1 Move and apply spec delta in this PR (`chore/archive-piano-voicings-v2`).
- [x] 9.2 Update `docs/long_horizon_plan.md` to mark milestone 1.1 Done with PR link.
- [x] 9.3 Add dated entry to `docs/long_horizon_log.md`.
