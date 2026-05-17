## Why

`docs/inspiration/README.md` "Piano Voicing — Roadmap" v4:
> 9th/10th interval spacing for wide, lush textures common in R&B, gospel, and neo-soul. Upper structure triads for dominant chords. Two-hand spread voicings that reflect how pianists actually use the full range.

v3 widens the engine's vocabulary to four jazz styles (Drop 2, Drop 3, Rootless, Shell) — all close-position techniques. v4 adds the **spread** sound: hands separated by an octave or more, the chord's 3rd sitting a 10th above the root, the open R&B/gospel piano texture.

The inspiration spec lists three things for v4. This change ships two of them — **spread** (10th-interval spacing) and **two-hand spread** — and explicitly defers the third (**upper structure triads**) to a separate openspec change because the UST concept fundamentally implies chromatic tones that aren't part of the input chord's note set. See "Scope deferral" below.

## What Changes

### Engine (`src/lib/harmonyBrain.ts`)

- **Extend** `VoicingStyle` to `"auto" | "drop2" | "drop3" | "rootless" | "shell" | "spread" | "two-hand"`.
- **Extend** `VoicedChord.voicingType` to include `"spread"` and `"two-hand"`.
- **Add** `buildSpreadVoicing(noteNames, pitchClasses, startOctave)`:
  - Root at `startOctave` in the LH.
  - Every subsequent chord tone in the RH, starting at least one octave above the root and ascending. The 3rd lands a 10th above the root (12 + chord's 3rd interval).
  - Returns `null` when any note overflows C3-B5.
- **Add** `buildTwoHandVoicing(noteNames, pitchClasses, startOctave)`:
  - LH = root + 5th (= `noteNames[0]` and `noteNames[2]`) for 4+ note chords; LH = root only for triads.
  - RH = all remaining chord tones (3rd + 7th + 9th + extensions), starting one octave above the LH root.
- **Add** `enumerateRootBassCandidates` — generic enumerator that varies starting octave (3, 4) and uses a passed-in builder. Inversions don't apply to spread / two-hand because the root is by definition in the bass; only octave varies.
- **Extend** `isStyleApplicable`:
  - `spread`: any chord with 3+ notes.
  - `two-hand`: any chord with 3+ notes (triads get LH = root only).
- **Extend** `enumerateVoicingCandidatesForStyle` to dispatch to the new builders.

### Rendering (`src/components/ChordCard.tsx`)

- **Extend** the per-card style toggle to include "Spread" and "Two-Hand" pills (7 total). The pill row is `flex flex-wrap`, so when seven buttons exceed the card width they cleanly wrap to a second line.
- **Extend** `VOICING_TYPE_LABEL` so the pill below the keyboard surfaces the new voicing types.

### Tests

- **15 new vitest assertions** in `src/lib/harmonyBrain.test.ts`:
  - Spread canonical voicings for Cmaj7, Dm7, G7 (4-note chords), C major triad, Bmaj7 (where spread pushes RH up to oct 5 to clear the LH root), and Cmaj9 (5-note chord). LH / RH hand assignment verified.
  - Two-hand canonical voicings across the same set, with LH/RH split for 4+ note chords and the triad-fallback path (LH = root only, 5th joins RH).
  - `isStyleApplicable` correctness for spread + two-hand.
  - Voice-leading with all-spread and all-two-hand across ii-V-I: every chord retains its voicingType, every note in C3-B5.

- **1 new Playwright e2e test** in `e2e/smoke.spec.ts`:
  - Click "Spread" on every chord card, decode the rendered MIDI, assert the voice-led spread chain Dm7=[50,65,69,72] → G7=[55,71,74,77] → Cmaj7=[60,76,79,83]. The engine bumps Cmaj7 to oct 4 to stay close to G7's upper register — locks that down as the expected v4 behavior.
  - Visual baseline unchanged (the two extra style pills land within the existing 10% pixel-ratio tolerance).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- **`harmony-brain`** — adds "Spread voicing" and "Two-hand voicing" requirements alongside the existing v3 style-applicability scenarios.
- **`chord-card-display`** — extends the "Piano voicing-style selector" requirement: seven options instead of five. Style toggle row wraps on narrow viewports.

## Impact

- **Affected paths:** `src/lib/types.ts` (extended `VoicingStyle` + `VoicingType`), `src/lib/harmonyBrain.ts` (three new helpers + dispatcher cases), `src/lib/harmonyBrain.test.ts` (+15 tests), `src/components/ChordCard.tsx` (two extra pill options + label map), `e2e/smoke.spec.ts` (+1 test), `openspec/specs/harmony-brain/spec.md` + `openspec/specs/chord-card-display/spec.md` (applied spec deltas on merge).
- **Worker impact:** none.
- **Bundle delta:** ~+1 KB raw / ~+0.3 KB gzip — pure engine functions.
- **Runtime cost:** unchanged for auto; explicit spread / two-hand each add at most 2 candidates per chord (one per starting octave). Trivial.
- **Backward compat:** existing callers unchanged. `["auto", "auto", ...]` is byte-for-byte v2/v3 behavior.
- **MIDI range invariant:** preserved. Spread can push RH into oct 5; chord candidates that overflow are filtered. No widening of the C3-B5 invariant in this change.
- **Risk:** **Low.** Pure functions, exhaustively tested. The UI change is one more `<button>` in an existing flex row that already wraps.
- **Rollback:** revert the PR.

## Scope deferral — Upper Structure Triads

UST as a piano technique places a major or minor triad from a different harmonic level over a dominant chord's LH (root + b7). The triad pitches (e.g. D major = D-F#-A over G7) routinely fall **outside the input chord's note set**: a plain G7 = `[G, B, D, F]` does not contain F# or A, but a "II UST over G7" voicing requires both.

That breaks the engine's current contract — every key shown on the piano view is derived from the chord's `Notes` field in `src/data/chords_clean.json`. Two ways to honor UST while keeping that contract intact:

1. **Surface a new chord type** (e.g. `G7/D` or `G7+UST`) that the chord dictionary already encodes with the upper-structure pitches. Then UST is just a presentational style of that pre-extended chord.
2. **Introduce an extension hint mechanism** that the voicing engine can pull from. The chord stays `G7`; the engine pulls "9, #11, 13" from a new field and adds them to the voicing only when the user picks UST.

Both are non-trivial design choices that warrant their own openspec change. Filing as `piano-voicings-ust` to be picked up after v5 lands.

This change ships v4 as **spread + two-hand**, with UST deferred. v4 still delivers the canonical "wide, lush R&B/gospel/neo-soul" sound the inspiration spec calls for.
