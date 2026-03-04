## ADDED Requirements

### Requirement: User-facing note-name formatting
The system SHALL convert internal catalog note encoding (`s` for sharp, `f` for flat) into user-facing musical notation before any note text is shown in the UI.

#### Scenario: Sharp encoding conversion
- **WHEN** an internal note name is "Cs", "Ds", "Fs", "Gs", or "As"
- **THEN** the displayed note SHALL be "C#", "D#", "F#", "G#", or "A#" respectively

#### Scenario: Flat encoding conversion
- **WHEN** an internal note name is "Ef", "Af", "Bf", "Cf", "Df", or "Gf"
- **THEN** the displayed note SHALL be "Eb", "Ab", "Bb", "Cb", "Db", or "Gb" respectively

#### Scenario: Natural note passthrough
- **WHEN** an internal note name is a natural note (e.g. "C", "D", "E")
- **THEN** the displayed note SHALL remain unchanged

#### Scenario: Flat-context enharmonic preference
- **WHEN** a chord display root indicates flat notation preference (e.g. Bb, Eb, Ab, Db, Gb)
- **THEN** enharmonic display conversion SHALL prefer flat spellings for note labels in that chord context

#### Scenario: Sharp-context enharmonic preference
- **WHEN** a chord display root indicates sharp or natural notation preference (e.g. F#, C, G)
- **THEN** enharmonic display conversion SHALL prefer sharp spellings for note labels in that chord context
