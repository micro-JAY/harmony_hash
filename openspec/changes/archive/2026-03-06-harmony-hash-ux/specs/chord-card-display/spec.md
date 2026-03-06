## MODIFIED Requirements

### Requirement: Piano chord card rendering
The system SHALL display piano chord cards as a procedurally rendered 3-octave HTML/CSS keyboard with highlighted active notes, and SHALL support switchable note-label and fingering-label display modes.

#### Scenario: Keyboard layout
- **WHEN** a piano chord card is rendered
- **THEN** the system SHALL display a 3-octave keyboard (C3 to B5) with white and black keys in standard piano layout

#### Scenario: Active notes highlighted
- **WHEN** the voicing engine computes note positions for a chord
- **THEN** the corresponding keys on the keyboard SHALL be visually highlighted using the design system's glow accent color

#### Scenario: Notes display mode preserves note labels
- **WHEN** piano display mode is set to `notes`
- **THEN** active keys SHALL render note-name labels and existing note-label behavior SHALL remain unchanged

#### Scenario: Fingering mode shows ascending finger numbers
- **WHEN** piano display mode is set to `fingering`
- **THEN** active keys SHALL render finger numbers assigned by ascending MIDI order (1-5)

#### Scenario: Fingering mode root emphasis
- **WHEN** piano display mode is `fingering`
- **THEN** the root key SHALL use accent background styling and a contrasting dark label color distinct from other active keys

#### Scenario: Fingering mode over-five-note handling
- **WHEN** a chord has more than 5 active notes
- **THEN** only the lowest 5 active notes SHALL receive finger-number labels and remaining notes SHALL be unlabeled or marked as overflow

#### Scenario: Triad rendering
- **WHEN** a triad (3 notes) is rendered in root position
- **THEN** all notes SHALL be highlighted in the same color (single-hand voicing)

## ADDED Requirements

### Requirement: Piano display mode toggle
The system SHALL provide a per-card display toggle for piano cards to switch between note labels and fingering labels.

#### Scenario: Toggle visible only in piano mode
- **WHEN** instrument mode is `piano`
- **THEN** each chord card SHALL render a `Notes`/`Fingering` toggle control near the keyboard

#### Scenario: Toggle hidden in guitar mode
- **WHEN** instrument mode is `guitar`
- **THEN** the piano display toggle SHALL NOT be rendered

#### Scenario: Default display mode
- **WHEN** a piano card first renders
- **THEN** display mode SHALL default to `notes`
