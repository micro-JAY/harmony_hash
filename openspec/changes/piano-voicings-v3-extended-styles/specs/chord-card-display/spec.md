## ADDED Requirements

### Requirement: Piano voicing-style selector
Every piano chord card SHALL render a style toggle row above the keyboard with five options: Auto, Drop 2, Drop 3, Rootless, Shell. The active style SHALL be visually distinguished; styles not applicable to the chord SHALL be rendered disabled.

#### Scenario: Default style is Auto
- **WHEN** a chord card first renders in piano mode
- **THEN** the active style SHALL be "Auto"

#### Scenario: Selecting an applicable style re-voices the keyboard
- **WHEN** the user clicks "Shell" on a Cmaj7 card
- **THEN** the keyboard SHALL re-render with the shell voicing (E3, B3)
- **AND** the voicing-type pill below the keyboard SHALL show "Shell"

#### Scenario: Non-applicable styles are disabled
- **WHEN** a chord is a triad (3 notes)
- **THEN** the "Drop 2", "Drop 3", "Rootless", and "Shell" buttons SHALL be rendered disabled
- **AND** only "Auto" SHALL remain interactive

#### Scenario: Style toggle hidden in guitar mode
- **WHEN** the instrument is set to "Guitar"
- **THEN** the piano style toggle SHALL NOT be rendered

## MODIFIED Requirements

### Requirement: Piano chord card rendering
The system SHALL display piano chord cards as a procedurally rendered 3-octave HTML/CSS keyboard with highlighted active notes, and SHALL support switchable note-label and fingering-label display modes.

#### Scenario: Keyboard layout
- **WHEN** a piano chord card is rendered
- **THEN** the system SHALL display a 3-octave keyboard (C3 to B5) with white and black keys in standard piano layout

#### Scenario: Active notes highlighted
- **WHEN** the voicing engine computes note positions for a chord
- **THEN** the corresponding keys on the keyboard SHALL be visually highlighted using the design system's glow accent color

#### Scenario: Voicing-type pill
- **WHEN** the engine produces a non-root voicing (drop2 / drop3 / rootless / shell)
- **THEN** a labeled pill below the keyboard SHALL display the voicing-type name (e.g. "Drop 2", "Drop 3", "Rootless", "Shell")
- **WHEN** the engine produces a closed root voicing
- **THEN** no voicing-type pill SHALL be displayed

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
