## 1. Audio engine module

- [x] 1.1 Create `src/lib/audioEngine.ts` exporting `PlaybackEvent`, `PlaybackHandle`, `buildPlaybackSchedule`, `midiToFrequency`, and `playSchedule`.
- [x] 1.2 `buildPlaybackSchedule(voicings, bpm, beatsPerChord = 2)` — pure. Each chord becomes a `PlaybackEvent` with `{ startTime, duration, notes: MIDI[], chordIndex }`. Throws on non-positive/non-finite bpm or beatsPerChord. Empty input returns `[]`.
- [x] 1.3 `midiToFrequency(midi)` — equal temperament, A4 (MIDI 69) = 440 Hz.
- [x] 1.4 `playSchedule(schedule, audioContext, onChordChange?)` — side-effecting. For each event, create one OscillatorNode per MIDI note (triangle wave) connected through a GainNode with an ADSR envelope. Schedule `onChordChange(chordIndex)` callbacks via setTimeout for UI highlighting. Returns `PlaybackHandle` with `stop()` that cancels every oscillator + timeout and signals null to the callback.

## 2. Engine tests (`src/lib/audioEngine.test.ts`)

- [x] 2.1 Empty input returns `[]`.
- [x] 2.2 3-chord progression at 120 BPM (`beatsPerChord = 2`) schedules each chord at startTime [0, 1, 2] with duration 1, MIDI notes intact, indices [0, 1, 2].
- [x] 2.3 Custom `beatsPerChord = 4` at 60 BPM → 4-second-long chords.
- [x] 2.4 Chord indices preserved across a 4-chord progression.
- [x] 2.5 Non-positive BPM / `beatsPerChord` throws with a clear message.
- [x] 2.6 `midiToFrequency` checks: A4 = 440 Hz, C4 ≈ 261.63 Hz, octave doubling, octave halving, A2 = 110 Hz.

## 3. UI — App.tsx

- [x] 3.1 Add `activeChordIndex` state + `audioContextRef` + `playbackHandleRef`.
- [x] 3.2 Add a `createAudioContext()` helper that returns null in non-browser contexts so module load stays safe in node.
- [x] 3.3 Render a "Play progression" / "Stop playback" toggle button between the action bar and the chord cards when `chords.length > 0 && instrument === "piano"`.
- [x] 3.4 Toggle behavior: if `isPlaying`, call `playbackHandleRef.current?.stop()`. Otherwise lazily create the AudioContext (resuming if suspended), build the schedule for the current `pianoVoicings`, call `playSchedule`, and capture the handle in the ref.
- [x] 3.5 `useEffect` cleanup on `[chords, pianoVoicings]` calls `stop()` so changing chords or styles mid-playback doesn't leave a stale schedule playing.
- [x] 3.6 Reset playback in `handleResult` when a new progression lands.

## 4. UI — ChordCard.tsx

- [x] 4.1 Add `isPlaying?: boolean` prop (default `false`).
- [x] 4.2 When `isPlaying`, swap the card's border to `--border-accent` and add `box-shadow: var(--glow-accent)`.
- [x] 4.3 Set `data-playing="true"` on the card wrapper for e2e assertion.
- [x] 4.4 No other UI changes (no per-card play button — keeping v5 scope narrow; per-card click can land later if useful).

## 5. Playwright (before / during / after)

- [x] 5.1 **Before**: existing v4 baseline.
- [x] 5.2 **During**: re-ran e2e after the engine + UI commits. Visual diff blew past the 10% tolerance (added "Play progression" button to the page) — expected. DOM-decoded MIDI assertions on existing tests still passed.
- [x] 5.3 **After**: regenerated the visual baseline. Added a new e2e test that clicks "Play progression" and asserts a card flips to `data-playing="true"` within 2 seconds + the "Stop playback" button becomes visible. All 4 e2e tests green.

## 6. Spec delta

- [x] 6.1 Create `openspec/changes/piano-voicings-v5-playback/specs/piano-playback/spec.md` — `## ADDED Requirements` introducing the new `piano-playback` capability with three requirements (schedule building, MIDI-to-frequency, audio playback handle).
- [x] 6.2 Create `openspec/changes/piano-voicings-v5-playback/specs/chord-card-display/spec.md` — `## ADDED Requirements` for the "Active-chord playback indicator".

## 7. Verification gates

- [x] 7.1 `npm run lint` exit 0.
- [x] 7.2 `npm run build` clean (~+1.5 KB raw / +0.5 KB gzip).
- [x] 7.3 `npm run test` green (94 → 105; +11 audioEngine tests).
- [x] 7.4 `npm run test:e2e` green (3 → 4; +1 new playback test).
- [x] 7.5 Worker smoke not required.

## 8. PR

- [ ] 8.1 Commit per logical unit (1: archive previous + plan/log; 2: log fixup; 3: engine + tests; 4: UI + e2e + spec deltas).
- [ ] 8.2 Push `feat/piano-voicings-v5-playback`.
- [ ] 8.3 Open PR.
- [ ] 8.4 Self-merge when CI green.

## 9. Archive

- [ ] 9.1 v5 is the last Phase 1 milestone — Phase 2 begins after. The bundled-archive pattern applies: v5 archive moves into the first Phase 2 branch.
- [ ] 9.2 Update `docs/long_horizon_plan.md` milestone 1.5 → Done with PR link.
- [ ] 9.3 Add dated entry to `docs/long_horizon_log.md` marking Phase 1 complete.
