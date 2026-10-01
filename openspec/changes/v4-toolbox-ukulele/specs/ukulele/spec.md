## Purpose

Allow musicians to build and play progressions on standard high-G ukulele while preserving chord identity and explaining the limits of four-string voicings.

## ADDED Requirements

### Requirement: Standard ukulele instrument
Hasher SHALL offer Ukulele alongside Guitar and Piano, using G4 C4 E4 A4 tuning. Changing instrument SHALL preserve chord order and identity, and SHALL NOT reuse guitar SVG shapes as ukulele shapes.

#### Scenario: Switch a built progression
- **WHEN** a musician builds C, Am, F, G7 and selects Ukulele
- **THEN** all four chords remain and show four-string ukulele diagrams with valid fingering variants
- **AND** playback and MIDI export use the displayed ukulele pitches

### Requirement: Honest bounded voicings
The system SHALL prefer playable complete voicings, retain the requested chord name when reducing extended chords, disclose omitted tones, and provide a per-card unavailable state when no supported shape exists.

#### Scenario: Extended chord
- **WHEN** a chord has more than four unique chord tones
- **THEN** a reduced voicing SHALL identify any omitted tones without failing the rest of the progression

#### Scenario: Slash bass
- **WHEN** a slash chord is voiced
- **THEN** the system SHALL either place its requested bass as the lowest sounding pitch or explicitly report the bass limitation

#### Scenario: Variants and locks
- **WHEN** a musician randomizes a ukulele progression with a locked card
- **THEN** the locked shape SHALL remain unchanged and unlocked cards SHALL use only available ukulele variants

#### Scenario: Guitar and piano preservation
- **WHEN** the musician switches back to Guitar or Piano
- **THEN** existing diagram, voicing, playback and export behavior SHALL remain available
