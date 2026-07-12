## MODIFIED Requirements

### Requirement: Pure fretted-instrument mapping
The system SHALL expose deterministic, side-effect-free helpers that map a root and supported scale type across a selected immutable guitar or bass tuning from open string through fret 15.

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

#### Scenario: Per-instrument tuning memory
- **WHEN** the user selects DADGAD for guitar, selects Bass and BEAD, then returns to Guitar
- **THEN** DADGAD SHALL still be selected for guitar
- **AND** returning to Bass SHALL restore BEAD

#### Scenario: Tuning readout
- **WHEN** a tuning is selected
- **THEN** the explorer SHALL show its name and compact open-string pitch sequence

### Requirement: Horizontal fretboard rendering
The explorer SHALL render open strings and frets 1 through 15 horizontally, with conventional high-to-low visual string order, selected tuning labels, fret numbers, and position markers.

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

#### Scenario: Mobile controls
- **WHEN** the viewport is 375px wide
- **THEN** instrument, tuning, handedness, root, mode, and label controls SHALL wrap without overlap
- **AND** the document SHALL not overflow horizontally

#### Scenario: Interaction latency
- **WHEN** instrument, tuning, handedness, root, mode, or label state changes after initial render
- **THEN** the representative rendered board state SHALL update within 500 milliseconds
