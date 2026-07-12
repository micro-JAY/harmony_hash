## ADDED Requirements

### Requirement: Pure fretted-instrument mapping
The system SHALL expose deterministic, side-effect-free helpers that map a root and supported scale type across standard six-string guitar and four-string bass tunings from open string through fret 15.

#### Scenario: Standard guitar placement
- **WHEN** C major is mapped on standard guitar
- **THEN** the low E string SHALL expose E at fret 0, F at fret 1, G at fret 3, and C at fret 8 as scale positions
- **AND** non-scale F-sharp at fret 2 SHALL not be marked as a scale position

#### Scenario: Standard bass placement
- **WHEN** G mixolydian is mapped on standard bass
- **THEN** the E string SHALL expose G at fret 3 with interval label `1`
- **AND** the four returned strings SHALL correspond to E, A, D, and G tuning

#### Scenario: Enharmonic display preference
- **WHEN** an E-flat root is selected
- **THEN** matching display notes SHALL prefer flat spellings while pitch-class placement remains enharmonically correct

### Requirement: First-class explorer controls
The Fretboard workspace SHALL provide independent controls for instrument, root, mode, and label display without mutating progression-builder state.

#### Scenario: Default explorer state
- **WHEN** the Fretboard workspace opens for the first time
- **THEN** Guitar, C, Major, and Intervals SHALL be selected

#### Scenario: Guitar and bass selection
- **WHEN** the user selects Bass
- **THEN** the board SHALL render four standard bass strings instead of six guitar strings
- **AND** the builder's guitar/piano instrument selection SHALL remain unchanged

#### Scenario: Supported modes
- **WHEN** the mode control is opened
- **THEN** Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Lydian, and Phrygian SHALL be available

#### Scenario: Label mode selection
- **WHEN** the user changes from Intervals to Notes
- **THEN** every highlighted position SHALL show its note name while retaining the same interval-role color

### Requirement: Horizontal fretboard rendering
The explorer SHALL render open strings and frets 1 through 15 horizontally, with conventional high-to-low visual string order, fret numbers, and position markers.

#### Scenario: Guitar anatomy
- **WHEN** Guitar is active
- **THEN** six string rows, sixteen fret lanes including open strings, and markers at frets 3, 5, 7, 9, 12, and 15 SHALL be visible
- **AND** fret 12 SHALL use a double marker

#### Scenario: Root and interval roles
- **WHEN** any scale is displayed
- **THEN** every root position SHALL use the Tonari accent treatment and label `1` in Intervals mode
- **AND** non-root scale positions SHALL remain distinguishable without relying on color alone

#### Scenario: Exact position semantics
- **WHEN** a highlighted note receives focus
- **THEN** its accessible name SHALL include instrument string, fret, note name, and interval label

### Requirement: Keyboard and reduced-motion behavior
The explorer SHALL support keyboard navigation and SHALL not require animation to understand state changes.

#### Scenario: Spatial keyboard navigation
- **WHEN** a highlighted position has focus and the user presses an arrow key
- **THEN** focus SHALL move to the nearest highlighted position in that spatial direction when one exists
- **AND** the focused position SHALL scroll into view inside the board region

#### Scenario: Visible focus
- **WHEN** a control or highlighted position receives keyboard focus
- **THEN** a visible Tonari focus ring SHALL be rendered

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** workspace and note-state transitions SHALL complete without animation

### Requirement: Responsive containment and performance
The explorer SHALL preserve document-width containment across desktop, tablet, and 375px mobile viewports while keeping instrument mapping responsive.

#### Scenario: Desktop board
- **WHEN** the viewport is at least 1024px wide
- **THEN** the board SHALL fit its content region or scroll only within the labeled board container

#### Scenario: Mobile board
- **WHEN** the viewport is 375px wide
- **THEN** controls SHALL wrap without overlap and the board SHALL scroll horizontally inside its own container
- **AND** the document SHALL not overflow horizontally

#### Scenario: Interaction latency
- **WHEN** instrument, root, mode, or label state changes after initial render
- **THEN** the representative rendered board state SHALL update within 500 milliseconds
