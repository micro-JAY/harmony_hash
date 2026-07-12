## Purpose

Define the shared music-theory predicates and chord-grid interaction contract for presenting key-aware chord suggestions without changing chord insertion behavior.

## Requirements

### Requirement: Diatonic membership predicate
The system SHALL provide a pure function that determines whether a chord root sits inside a given key's scale.

#### Scenario: C major diatonic roots
- **WHEN** `isRootDiatonic("C", "C", "major")` is called
- **THEN** the result SHALL be `true`
- **WHEN** `isRootDiatonic("F#", "C", "major")` is called
- **THEN** the result SHALL be `false`

#### Scenario: Handles user-facing and internal spellings
- **WHEN** the root is specified as either "Bb" or "Bf" (or any other equivalent pair)
- **THEN** the predicate SHALL resolve to the same pitch class

#### Scenario: Works across modes
- **WHEN** the scale type is `harmonic_minor` and the key is `A`
- **THEN** "G#" SHALL be diatonic (the raised 7th)
- **AND** "G" SHALL NOT be diatonic

### Requirement: Scale-degree lookup
The system SHALL expose a function that returns the 1-indexed scale degree (1..7) of a chord root within a key, or `null` for non-diatonic roots.

#### Scenario: C major degrees
- **WHEN** computing `scaleDegreeOf("F", "C", "major")`
- **THEN** the result SHALL be `4`
- **WHEN** computing `scaleDegreeOf("C#", "C", "major")`
- **THEN** the result SHALL be `null`

### Requirement: Suggestion-mode toggle
The chord reference grid SHALL render a mode toggle that lets the user switch the suggestion overlay between "Off" (default) and "Diatonic".

#### Scenario: Default is Off
- **WHEN** the grid is opened for the first time
- **THEN** the mode SHALL be "Off" and the grid SHALL render every cell at full opacity (no overlay)

#### Scenario: Diatonic mode requires key context
- **WHEN** the grid has no `keyContext` prop
- **THEN** the "Diatonic" toggle button SHALL be disabled

#### Scenario: Active diatonic overlay dims non-diatonic rows
- **WHEN** the mode is "Diatonic" AND a `keyContext` of (`C`, `major`) is provided
- **THEN** rows for non-diatonic roots (`C#`, `Eb`, `F#`, `Ab`, `Bb`) SHALL render at reduced opacity (`0.35`)
- **AND** rows for diatonic roots (`C`, `D`, `E`, `F`, `G`, `A`, `B`) SHALL render at full opacity

#### Scenario: Key + scale label visible during active overlay
- **WHEN** the overlay is active
- **THEN** the grid SHALL render the active key + scale type as a label next to the mode toggle (e.g. "in C major", "in A harmonic minor")
