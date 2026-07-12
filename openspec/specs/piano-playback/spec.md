## Purpose
Define piano playback controls, scheduling, and visual highlighting for chord progressions.

## Requirements

### Requirement: Playback schedule builder
The system SHALL build a deterministic playback schedule from an ordered list of voiced chords. Each chord becomes a `PlaybackEvent` carrying its absolute start time, duration, the MIDI numbers of its active notes, and its position in the source progression.

#### Scenario: Empty progression
- **WHEN** the input is an empty list of voicings
- **THEN** the schedule SHALL be an empty list

#### Scenario: 3-chord progression at 120 BPM with 2 beats per chord
- **WHEN** the input is three voicings at 120 BPM and 2 beats per chord
- **THEN** the schedule SHALL contain three events with `startTime` 0 / 1 / 2 (seconds), `duration` 1 (second each), the MIDI lists from each voicing, and `chordIndex` 0 / 1 / 2

#### Scenario: Custom beats-per-chord
- **WHEN** the input is two voicings at 60 BPM and 4 beats per chord
- **THEN** the schedule SHALL contain two events each lasting 4 seconds (`startTime` 0 and 4)

#### Scenario: Non-positive BPM rejected
- **WHEN** the BPM is zero or negative or non-finite
- **THEN** the builder SHALL throw with a clear message; no schedule is returned

#### Scenario: Non-positive beats-per-chord rejected
- **WHEN** the beats-per-chord value is zero or negative or non-finite
- **THEN** the builder SHALL throw

### Requirement: MIDI-to-frequency mapping
The system SHALL provide a pure conversion from MIDI note numbers to frequency in Hz using equal temperament.

#### Scenario: A4 anchor
- **WHEN** the input is MIDI 69
- **THEN** the output SHALL be 440 Hz

#### Scenario: Middle C
- **WHEN** the input is MIDI 60
- **THEN** the output SHALL be approximately 261.63 Hz

#### Scenario: Octave doubling
- **WHEN** comparing MIDI 81 to MIDI 69
- **THEN** the ratio of their frequencies SHALL be 2.0

### Requirement: Audio playback handle
The system SHALL provide a side-effecting playback function that, given a schedule and an `AudioContext`, plays each chord as a layered triangle-wave voicing through a soft ADSR envelope. The function SHALL return a handle with a `stop()` method.

#### Scenario: Stop cancels playback
- **WHEN** the caller invokes `stop()` on the returned handle
- **THEN** every scheduled oscillator SHALL be silenced and any pending UI callbacks SHALL be cleared

#### Scenario: Active-chord callback
- **WHEN** `playSchedule` is called with an `onChordChange` callback
- **THEN** the callback SHALL fire with the chord index at each chord's `startTime`
- **AND** the callback SHALL fire with `null` after the last chord ends

#### Scenario: Caller owns the AudioContext lifecycle
- **WHEN** `playSchedule` is called
- **THEN** the function SHALL NOT create or close the `AudioContext` — that responsibility belongs to the caller
