## MODIFIED Requirements

### Requirement: Pure fretted-instrument mapping
The system SHALL expose deterministic, side-effect-free helpers that map a root and supported scale type across a selected immutable guitar or bass tuning from open string through fret 15.

#### Scenario: Standard guitar placement
- **WHEN** C major is mapped on standard guitar
- **THEN** the low E string SHALL expose E at fret 0, F at fret 1, G at fret 3, and C at fret 8 as scale positions
- **AND** non-scale F-sharp at fret 2 SHALL not be marked as a scale position

#### Scenario: Standard bass placement
- **WHEN** G mixolydian is mapped on standard bass
- **THEN** the E string SHALL expose G at fret 3 with interval label `1`
- **AND** the four returned strings SHALL correspond to E, A, D, and G tuning

#### Scenario: Supported guitar tunings
- **WHEN** guitar tuning options are requested
- **THEN** Standard (`E A D G B E`), Drop D (`D A D G B E`), DADGAD (`D A D G A D`), and Open G (`D G D G B D`) SHALL be returned with stable ids

#### Scenario: Supported bass tunings
- **WHEN** bass tuning options are requested
- **THEN** Standard (`E A D G`), Drop D (`D A D G`), and BEAD (`B E A D`) SHALL be returned with stable ids

#### Scenario: Drop D placement
- **WHEN** C major is mapped on Drop D guitar
- **THEN** the sixth string SHALL expose D at fret 0 with interval `2` and E at fret 2 with interval `3`

#### Scenario: Instrument mismatch fails explicitly
- **WHEN** a bass tuning id is supplied for guitar mapping
- **THEN** the helper SHALL throw a precise incompatible-tuning error rather than silently substituting Standard

#### Scenario: Enharmonic display preference
- **WHEN** an E-flat root is selected in any supported tuning
- **THEN** matching display notes SHALL prefer flat spellings while pitch-class placement remains enharmonically correct

### Requirement: First-class explorer controls
The Fretboard workspace SHALL provide independent controls for instrument, tuning, handedness, root, mode, and label display without mutating progression-builder state.

#### Scenario: Default explorer state
- **WHEN** the Fretboard workspace opens for the first time
- **THEN** Guitar, Standard tuning, Right-handed, C, Major, and Intervals SHALL be selected

#### Scenario: Guitar and bass selection
- **WHEN** the user selects Bass
- **THEN** the board SHALL render four strings in the selected bass tuning instead of six guitar strings
- **AND** the builder's guitar/piano instrument selection SHALL remain unchanged

#### Scenario: Supported modes
- **WHEN** the mode control is opened
- **THEN** Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Lydian, and Phrygian SHALL be available

#### Scenario: Label mode selection
- **WHEN** the user changes from Intervals to Notes
- **THEN** every highlighted position SHALL show its note name while retaining the same interval-role color

#### Scenario: Per-instrument tuning memory
- **WHEN** the user selects DADGAD for guitar, selects Bass and BEAD, then returns to Guitar
- **THEN** DADGAD SHALL still be selected for guitar
- **AND** returning to Bass SHALL restore BEAD

#### Scenario: Tuning readout
- **WHEN** a tuning is selected
- **THEN** the explorer SHALL show its name and compact open-string pitch sequence

### Requirement: Horizontal fretboard rendering
The explorer SHALL render open strings and frets 1 through 15 horizontally, with conventional high-to-low visual string order, selected tuning labels, fret numbers, and position markers.

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

#### Scenario: Right-handed fret axis
- **WHEN** Right-handed is active
- **THEN** the visible fret columns SHALL run from open strings at the left edge to fret 15 at the right edge

#### Scenario: Left-handed fret axis
- **WHEN** Left-handed is active
- **THEN** the visible fret columns SHALL run from fret 15 at the left edge to open strings at the right edge
- **AND** high-to-low string row order and string numbers SHALL remain unchanged

#### Scenario: Exact orientation semantics
- **WHEN** a highlighted note receives focus
- **THEN** its accessible name SHALL include handedness, instrument string, selected tuning, fret, note name, and interval label

### Requirement: Keyboard and reduced-motion behavior
The explorer SHALL support visual-direction keyboard navigation and SHALL not require animation to understand tuning or handedness changes.

#### Scenario: Spatial keyboard navigation
- **WHEN** a highlighted position has focus and the user presses an arrow key
- **THEN** focus SHALL move to the nearest highlighted position in that visual direction when one exists
- **AND** the focused position SHALL scroll into view inside the board region

#### Scenario: Visible focus
- **WHEN** a control or highlighted position receives keyboard focus
- **THEN** a visible Tonari focus ring SHALL be rendered

#### Scenario: Right-handed horizontal navigation
- **WHEN** Right-handed is active and a highlighted position receives ArrowRight
- **THEN** focus SHALL move to the next highlighted position visually to the right, which has a higher fret number

#### Scenario: Left-handed horizontal navigation
- **WHEN** Left-handed is active and a highlighted position receives ArrowRight
- **THEN** focus SHALL move to the next highlighted position visually to the right, which has a lower fret number

#### Scenario: Left-handed mobile edge
- **WHEN** Left-handed is selected in a horizontally overflowing viewport
- **THEN** the board SHALL reveal the open-string edge without requiring manual scrolling

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** tuning, orientation, workspace, and note-state transitions SHALL complete without animation

### Requirement: Responsive containment and performance
The explorer SHALL preserve document-width containment across desktop, tablet, and 375px mobile viewports while keeping tuning and orientation updates responsive.

#### Scenario: Desktop board
- **WHEN** the viewport is at least 1024px wide
- **THEN** the board SHALL fit its content region or scroll only within the labeled board container

#### Scenario: Mobile board
- **WHEN** the viewport is 375px wide
- **THEN** controls SHALL wrap without overlap and the board SHALL scroll horizontally inside its own container
- **AND** the document SHALL not overflow horizontally

#### Scenario: Mobile controls
- **WHEN** the viewport is 375px wide
- **THEN** instrument, tuning, handedness, root, mode, and label controls SHALL wrap without overlap
- **AND** the document SHALL not overflow horizontally

#### Scenario: Interaction latency
- **WHEN** instrument, tuning, handedness, root, mode, or label state changes after initial render
- **THEN** the representative rendered board state SHALL update within 500 milliseconds
