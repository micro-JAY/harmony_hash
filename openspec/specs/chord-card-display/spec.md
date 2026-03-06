## ADDED Requirements

### Requirement: Guitar chord card rendering
The system SHALL display guitar chord cards by rendering the corresponding SVG image from the asset library, with variant controls that remain interactive after randomization and a lock toggle per card.

#### Scenario: Default variant displayed
- **WHEN** a guitar chord card is rendered for a chord with Variation Count >= 1
- **THEN** the system SHALL display var_1.svg by default

#### Scenario: Variant cycling with arrows
- **WHEN** a chord has Variation Count > 1
- **THEN** the card SHALL display prev/next arrows that cycle through var_1.svg to var_N.svg, wrapping around at boundaries

#### Scenario: Variant arrows remain functional after randomize
- **WHEN** the user clicks "Randomize All" and then clicks a card's prev/next arrow
- **THEN** the card SHALL update to the selected adjacent variant instead of remaining pinned to the randomized override value

#### Scenario: Single variant chord
- **WHEN** a chord has Variation Count of 1
- **THEN** no variant cycling arrows SHALL be displayed

#### Scenario: Variant indicator
- **WHEN** a chord has multiple variants
- **THEN** the card SHALL display a label showing the current variant number and total (e.g. "2 / 5")

#### Scenario: Guitar lock toggle visibility
- **WHEN** a guitar chord card is rendered
- **THEN** a lock toggle control SHALL be shown in the top-right card area and SHALL indicate locked vs unlocked state

#### Scenario: Piano cards omit lock toggle
- **WHEN** instrument mode is Piano
- **THEN** the lock toggle control SHALL NOT be shown on chord cards

### Requirement: Randomize All button
The system SHALL provide a "Randomize All" button that simultaneously selects a random valid variant for every unlocked guitar chord card in the current progression.

#### Scenario: Random variants applied
- **WHEN** the user clicks "Randomize All"
- **THEN** each unlocked guitar chord card SHALL display a randomly selected variant (between 1 and its Variation Count)

#### Scenario: Locked cards are preserved
- **WHEN** the user clicks "Randomize All" while one or more guitar cards are locked
- **THEN** locked cards SHALL keep their current variant values unchanged

#### Scenario: Button only visible in guitar mode
- **WHEN** the instrument is set to Piano
- **THEN** the "Randomize All" button SHALL NOT be displayed

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

### Requirement: Chord note row display formatting
The system SHALL display chord note labels using user-facing musical notation that matches the chord root spelling convention.

#### Scenario: Flat-root chord note row
- **WHEN** a chord card root is displayed with flat naming (e.g. "Bb")
- **THEN** the note row SHALL use flat note labels (e.g. "Bb - D - F") and SHALL NOT show internal encoded labels (e.g. "As")

#### Scenario: Sharp-root chord note row
- **WHEN** a chord card root is displayed with sharp naming (e.g. "F#")
- **THEN** the note row SHALL use sharp note labels (e.g. "F# - A# - C#") and SHALL NOT show internal encoded labels (e.g. "Fs")

#### Scenario: Internal encoding hidden from UI
- **WHEN** any chord card note labels are rendered
- **THEN** raw internal encoding tokens (`Cs`, `As`, `Ef`, etc.) SHALL NOT be visible in the user interface

### Requirement: Chord card name display
Each chord card SHALL display the chord name prominently above the chart/keyboard visualization.

#### Scenario: Name shown
- **WHEN** a chord card is rendered
- **THEN** the full chord name (e.g. "Cmaj7") SHALL be displayed as a heading above the visualization

### Requirement: Global instrument toggle
The system SHALL provide a Guitar/Piano toggle that switches ALL chord cards to the selected instrument view simultaneously.

#### Scenario: Toggle to piano
- **WHEN** the user switches from Guitar to Piano
- **THEN** all chord cards SHALL re-render as piano keyboard visualizations

#### Scenario: Toggle to guitar
- **WHEN** the user switches from Piano to Guitar
- **THEN** all chord cards SHALL re-render as guitar SVG chord diagrams

#### Scenario: Default instrument
- **WHEN** the application loads
- **THEN** the default instrument SHALL be Guitar
