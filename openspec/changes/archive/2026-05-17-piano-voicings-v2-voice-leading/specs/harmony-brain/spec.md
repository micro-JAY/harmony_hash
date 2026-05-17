## ADDED Requirements

### Requirement: Voice-leading across a progression
When given an ordered list of chord note-sets representing a progression of two or more chords, the system SHALL compute a sequence of voiced chords such that each chord after the first minimizes total voice movement from the prior chord while keeping every note within the existing C3-B5 MIDI range invariant.

#### Scenario: Empty progression
- **WHEN** the input is an empty list of chord note-sets
- **THEN** the system SHALL return an empty list

#### Scenario: Single-chord progression
- **WHEN** the input is a list with exactly one chord
- **THEN** the system SHALL return a one-element list whose voicing is identical to `computeVoicing(input[0])`

#### Scenario: First-chord equivalence
- **WHEN** the input has two or more chords
- **THEN** `result[0]` SHALL be identical to `computeVoicing(input[0])` — the first chord anchors the progression with the existing default voicing

#### Scenario: ii-V-I voice-leading in C major
- **WHEN** the input is `[["D","F","A","C"], ["G","B","D","F"], ["C","E","G","B"]]`
- **THEN** the system SHALL return voicings: Dm7 = `[D3, F3, A3, C4]`, G7 = `[D3, F3, G3, B3]`, Cmaj7 = `[E3, G3, B3, C4]`
- **AND** the cumulative voicing-distance across the three chords SHALL be strictly less than the cumulative distance produced by calling `computeVoicing` independently on each chord

#### Scenario: Repeated-chord vamp stabilizes
- **WHEN** the input is `[Dm7, G7, Dm7, G7]` (note-set arrays for each chord)
- **THEN** the voicings at positions 0 and 2 SHALL be identical
- **AND** the voicings at positions 1 and 3 SHALL be identical

#### Scenario: MIDI range invariant preserved
- **WHEN** the input is any valid progression
- **THEN** every note in every returned voicing SHALL have MIDI in the inclusive range [48, 83]

#### Scenario: Common tones preferred
- **WHEN** two chords share one or more pitch classes (e.g. C major to A minor, sharing C and E)
- **THEN** the chosen voicing of the second chord SHALL retain shared pitches at the same MIDI position as the first chord wherever the MIDI range invariant allows

#### Scenario: Voicing candidate set generalizes existing behavior
- **WHEN** the candidate set is enumerated for any chord
- **THEN** the output of `computeVoicing(noteNames)` SHALL be one of the candidates, ensuring the worst-case voice-leading choice is no worse than the existing default

### Requirement: Voicing-distance metric
The system SHALL define a deterministic voicing-distance metric that scores how smoothly one voicing transitions to another. Lower scores indicate smoother voice leading.

#### Scenario: Identical voicings
- **WHEN** the prior and candidate voicings contain the same MIDI notes
- **THEN** the distance SHALL be 0

#### Scenario: Common-tone retention
- **WHEN** a candidate note shares a MIDI position with any prior note
- **THEN** that candidate note SHALL contribute 0 to the total distance

#### Scenario: Semitone steps
- **WHEN** a candidate note's nearest prior note is exactly one semitone away
- **THEN** that candidate note SHALL contribute 1 to the total distance

#### Scenario: Empty prior or candidate
- **WHEN** either the prior or candidate voicing is empty
- **THEN** the distance SHALL be 0
