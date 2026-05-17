## Why

Today, Harmony Hash's piano view computes each chord's voicing independently via `computeVoicing(noteNames)` in `src/lib/harmonyBrain.ts`. That returns a single voicing — root position for triads, Drop 2 for 7ths and above — chosen to maximize visibility in the C3-B5 keyboard window. There is no awareness of the *previous* chord in the progression.

For a single chord, this is fine. For a *progression*, it produces jumpy, unmusical hand motion. A pianist playing ii-V-I in C with Harmony Hash's current output would move 13 semitones cumulative between consecutive voicings; a human pianist playing the same progression with smooth voice-leading moves 5. The current behavior is what separates "the right notes" from "the right voicing."

This change adds **voice-leading** as the engine's default behavior whenever the chord row has ≥2 chords: each chord after the first is rendered in whichever inversion / octave placement produces the smoothest motion from the prior chord, while keeping all notes inside the existing C3-B5 invariant.

v2 is intentionally a *pure-engine-plus-rendering-wire-up* change. No new selector, no toggle, no UI affordance. The piano view simply looks like a real pianist would voice the progression.

## What Changes

### Engine (`src/lib/harmonyBrain.ts`)

- **Add** pure function `computeVoiceLedProgression(progressionNotes: string[][]): VoicedChord[]` — given an ordered list of note-name arrays (one per chord in a progression), return the voiced sequence where each subsequent chord is chosen for minimum voice movement from the prior.
- **Add** internal helper `enumerateVoicingCandidates(noteNames: string[]): VoicedChord[]` — generate all C3-B5-visible voicing candidates for one chord (inversions × octave starts × {root, Drop 2 if ≥4 notes}). Returned in deterministic order; the first candidate is always the same as `computeVoicing`'s output, so the function generalizes the existing behavior without overriding it.
- **Add** internal helper `voicingDistance(prior: VoicedNote[], candidate: VoicedNote[]): number` — for each candidate note, find the minimum semitone distance to any prior note and sum. Used to score candidates. Lower is smoother. Common tones cost 0.
- `computeVoicing` and the existing Drop 2 logic remain unchanged and continue to work for single-chord callers (chord reference grid, individual card previews).

### Rendering (`src/components/ChordCard.tsx`, `src/App.tsx`)

- **Lift** voicing computation out of `ChordCard.tsx`. `ChordCard` accepts a new prop `voicing: VoicedChord` instead of calling `computeVoicing(noteNames)` itself.
- **App.tsx** computes the whole progression's voicings once via `computeVoiceLedProgression(progressionNotes)` and threads each chord's voicing into its `ChordCard`. For a one-chord input this still calls `computeVoicing` on the single chord (via the engine's degenerate-case branch), so behavior is unchanged.
- No new UI controls, no new pill labels, no selector for "voice leading on/off" — v2 is the new default behavior.

### Tests (`src/lib/harmonyBrain.test.ts`)

- New `describe("computeVoiceLedProgression", ...)` block with hand-verified note-set assertions for:
  - Empty progression → empty result.
  - Single chord → identical to `computeVoicing`.
  - ii-V-I in C major (Dm7 → G7 → Cmaj7) producing the expected smoothed voicings.
  - I-vi-IV-V in C (triads).
  - ii-V-i in A harmonic minor.
  - Dorian vamp (Dm7 - G7 - Dm7 - G7) — repeated chords should return to the *same* voicing, not drift.
  - All voicings stay within MIDI 48-83.
  - First-chord-equivalence: result\[0\] === computeVoicing(progressionNotes\[0\]).
- All existing tests stay green (no changes to `computeVoicing`, `parseChordInput`, or `transposeProgression`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`harmony-brain`** — adds a "Voice-leading across a progression" requirement to the canonical spec. Existing Drop 2 / root-position / MIDI-range invariants remain unmodified.
- **`chord-card-display`** — no behavioral requirement change, but the rendering contract gains a note that piano voicings come from upstream (progression-level) computation when the input has ≥2 chords. Single-chord input continues to use `computeVoicing` directly.

## Impact

- **Affected paths:** `src/lib/harmonyBrain.ts` (new function + helpers), `src/lib/harmonyBrain.test.ts` (new tests), `src/components/ChordCard.tsx` (signature change: `voicing` prop), `src/App.tsx` (compute and thread voicings), `openspec/specs/harmony-brain/spec.md` (apply spec delta on merge).
- **Worker impact:** none. `worker/index.ts` imports `lookupChordForAgent` only; voicing is purely a client-side concern.
- **Bundle impact:** negligible (pure functions, ~80 lines of code).
- **Runtime cost:** for a 4-chord progression of 4-note chords, generating candidates is ~16 per chord × 24 distance comparisons ≈ 384 cheap arithmetic ops per chord. Imperceptible.
- **Backward compatibility:** `computeVoicing` API is unchanged. Any external caller (currently only `ChordCard.tsx`, which is being updated; and tests, which stay green) is unaffected.
- **Test gates:** `npm run lint` clean, `npm run test` green (existing 48 + new voice-leading tests), `npm run build` clean. Playwright harness lands separately in milestone 1.2 — this PR is engine-first and uses screenshots-via-browser for the manual smoke step until the harness exists.
- **Risk:** **Low.** The function is pure, exhaustively tested, and only triggers when the chord row has ≥2 chords. Single-chord views are byte-for-byte identical. If voice-leading produces a worse result for an edge case, the candidate list always contains `computeVoicing`'s default output, so the worst case is "no improvement over current behavior."
- **Rollback:** revert the PR; no schema, secret, or external-state change.
