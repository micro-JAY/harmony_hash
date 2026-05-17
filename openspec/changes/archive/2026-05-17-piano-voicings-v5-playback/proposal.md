## Why

`docs/inspiration/README.md` "Piano Voicing — Roadmap" v5:
> Hear the progression. A lightweight synth renders the voiced chords in sequence so you can audition how the voice leading actually sounds before sitting down at the keys.

Through v2-v4 the engine has gotten progressively richer: voice-leading, seven voicing styles, the wide R&B/gospel sound. v5 closes the loop — the user can finally **hear** the progression they're looking at. The bottleneck for "does this voicing actually work?" stops being "go to a keyboard"; it becomes the click of a play button.

## What Changes

### New module (`src/lib/audioEngine.ts`)

- **Add** `buildPlaybackSchedule(voicings, bpm, beatsPerChord = 2): PlaybackEvent[]` — pure function. Each chord becomes a `PlaybackEvent` with `startTime` (seconds from playback start), `duration` (chord length in seconds), `notes` (MIDI numbers from the voicing), and `chordIndex` (position in the progression, used for UI highlighting). Throws on invalid BPM / beatsPerChord. Empty input → `[]`.
- **Add** `midiToFrequency(midi): number` — standard MIDI-to-Hz (A4=440, equal temperament).
- **Add** `playSchedule(schedule, audioContext, onChordChange?): PlaybackHandle` — side-effecting browser function. For each event, creates one `OscillatorNode` per MIDI note with a `triangle` waveform and a soft ADSR gain envelope (attack 20ms, decay to 70% peak, release to 0 over the last 50ms before the chord ends). Schedules `onChordChange(chordIndex)` callbacks via `setTimeout` so the UI can highlight the currently-sounding chord. Returns a handle with a `stop()` function that cancels every queued oscillator and timeout. Caller owns the `AudioContext` lifecycle.

The triangle waveform + ADSR keeps the synth recognizably non-piano (we're not trying to fake a Steinway) while still being warm enough to layer 4-5 chord tones without harsh beating. Bundle delta is essentially zero — WebAudio is browser-native.

### Rendering (`src/App.tsx`, `src/components/ChordCard.tsx`)

- **Add** `activeChordIndex: number | null` state in `App.tsx`. Drives both the play/stop toggle and the per-card glow.
- **Add** `audioContextRef` (lazily initialized on first play; AudioContext can't be created at module load without a user gesture in modern browsers) and `playbackHandleRef` (the current `PlaybackHandle`).
- **Add** a "Play progression" button that appears when `chords.length > 0 && instrument === "piano"`. Toggles between Play (warm pill) and Stop (accent pill) based on `isPlaying = activeChordIndex !== null`. Uses lucide `Play` / `Square` icons. Aria-label flips with state.
- **Stop playback automatically** when the chord list changes — a `useEffect` cleanup on `[chords, pianoVoicings]` calls `playbackHandleRef.current?.stop()` so the user can't accidentally hear the previous progression as new chords stream in.
- **Add** an `isPlaying` prop to `ChordCard`. When `true`, swap the card border to `--border-accent` and add `box-shadow: var(--glow-accent)` for the currently-sounding chord. Also set `data-playing="true"` for e2e assertion. Other cards remain unchanged.

### Tests

- **11 new vitest assertions** in `src/lib/audioEngine.test.ts`:
  - `buildPlaybackSchedule` returns `[]` for empty input.
  - 3-chord progression at 120 BPM with `beatsPerChord = 2` schedules each chord at a 1-second interval with 1-second duration; events carry the correct MIDI sets and indices.
  - Custom `beatsPerChord` honored.
  - Invalid BPM / `beatsPerChord` throws.
  - `midiToFrequency`: A4 = 440Hz, C4 ≈ 261.63Hz, octave doubling/halving, A2 = 110Hz.

- **1 new Playwright e2e test** in `e2e/smoke.spec.ts`:
  - Type "Dm7 G7 Cmaj7", switch to Piano, click "Play progression".
  - Assert no card has `data-playing="true"` *before* the click.
  - Assert at least one card flips to `data-playing="true"` within 2 seconds of the click.
  - Assert the "Stop playback" control becomes visible while playing.

E2E intentionally does not assert *audible output* — that requires a working audio sink in headless Chromium and is fragile. The DOM-decoded visual contract is the layer with test value.

## Capabilities

### New Capabilities

- **`piano-playback`** — audio playback of the rendered voiced progression. Schedule builder + WebAudio synth + UI controls + active-chord visual indicator.

### Modified Capabilities

- **`chord-card-display`** — adds the "Active-chord playback indicator" requirement (border + glow when playing). No existing requirement modified.

## Impact

- **New files:** `src/lib/audioEngine.ts`, `src/lib/audioEngine.test.ts`, `openspec/changes/piano-voicings-v5-playback/` (proposal, tasks, spec deltas).
- **Modified files:** `src/App.tsx` (play state + toggle + cleanup effect), `src/components/ChordCard.tsx` (isPlaying prop + glow), `e2e/smoke.spec.ts` (+1 test), baseline screenshot regenerated for the added Play button.
- **Worker impact:** none.
- **Bundle delta:** ~+1.5 KB raw / +0.5 KB gzip — engine module + lucide Play/Square icons (already bundled, just re-exported).
- **Runtime cost:** N×M oscillator nodes per playback where N = chord count and M = notes per chord. For a typical 4-chord ii-V-I-vi at 4 notes each: 16 oscillators. Trivial for WebAudio.
- **Browser support:** `AudioContext` and `webkitAudioContext` are checked at runtime; `createAudioContext()` returns `null` in non-browser contexts so the import is safe in tests.
- **Accessibility:** the play button carries a context-sensitive `aria-label` ("Play progression" vs "Stop playback"). The active-chord glow uses `--glow-accent`, which is a soft 20-60px box-shadow — not a flashing animation, so it does not violate WCAG SC 2.3.1 (Three Flashes).
- **prefers-reduced-motion:** not addressed in this PR — the glow is a static box-shadow (no flashing or animation), so reduced-motion has no behavior to alter here. If a beat-flash animation is added later, that change should gate behind `useReducedMotion`.
- **Risk:** **Low-to-medium.** WebAudio quirks across browsers (Safari's AudioContext requires user gesture; some old iOS versions need `webkitAudioContext`). The handle-based stop pattern + lazy context creation should cover both. Worst case: play button does nothing on an unsupported environment — no crash.
- **Rollback:** revert the PR. AudioContext leaks no global state.
