## ADDED Requirements

### Requirement: Guitar chord card rendering
The system SHALL display guitar chord cards by rendering the corresponding SVG image from the asset library.

#### Scenario: Default variant displayed
- **WHEN** a guitar chord card is rendered for a chord with Variation Count >= 1
- **THEN** the system SHALL display var_1.svg by default

#### Scenario: Variant cycling with arrows
- **WHEN** a chord has Variation Count > 1
- **THEN** the card SHALL display prev/next arrows that cycle through var_1.svg to var_N.svg, wrapping around at boundaries

#### Scenario: Single variant chord
- **WHEN** a chord has Variation Count of 1
- **THEN** no variant cycling arrows SHALL be displayed

#### Scenario: Variant indicator
- **WHEN** a chord has multiple variants
- **THEN** the card SHALL display a label showing the current variant number and total (e.g. "2 / 5")

### Requirement: Randomize All button
The system SHALL provide a "Randomize All" button that simultaneously selects a random valid variant for every guitar chord card in the current progression.

#### Scenario: Random variants applied
- **WHEN** the user clicks "Randomize All"
- **THEN** each chord card SHALL display a randomly selected variant (between 1 and its Variation Count)

#### Scenario: Button only visible in guitar mode
- **WHEN** the instrument is set to Piano
- **THEN** the "Randomize All" button SHALL NOT be displayed

### Requirement: Piano chord card rendering
The system SHALL display piano chord cards as a procedurally rendered 2-octave HTML/CSS keyboard with highlighted active notes.

#### Scenario: Keyboard layout
- **WHEN** a piano chord card is rendered
- **THEN** the system SHALL display a 2-octave keyboard (C3 to B4) with white and black keys in standard piano layout

#### Scenario: Active notes highlighted
- **WHEN** the voicing engine computes note positions for a chord
- **THEN** the corresponding keys on the keyboard SHALL be visually highlighted using the design system's glow accent color

#### Scenario: Left hand / right hand split
- **WHEN** a Drop 2 voicing is rendered (the lowest note is dropped down an octave)
- **THEN** the keyboard SHALL visually distinguish left-hand notes (lower octave) from right-hand notes (upper octave) using different highlight colors or labels

#### Scenario: Triad rendering
- **WHEN** a triad (3 notes) is rendered in root position
- **THEN** all notes SHALL be highlighted in the same color (single-hand voicing)

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
