# guitar-fretboard Specification

## Purpose
Define Fret Finder's scale mapping, tunings, handedness, learning patterns, accessibility, and responsive behavior.

## Requirements

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
The Fret Finder workspace SHALL provide independent controls for instrument, tuning, handedness, root, mode, label display, pattern family, and pattern sub-selection without mutating progression-builder state. The selected tuning SHALL remain available through its labeled control and board semantics without a duplicate standalone header badge.

#### Scenario: Default explorer state
- **WHEN** Fret Finder opens for the first time
- **THEN** Guitar, Standard tuning, Right-handed, C, Major, Intervals, and All pattern SHALL be selected

#### Scenario: Guitar and bass selection
- **WHEN** the user selects Bass
- **THEN** the board SHALL render four strings in the selected bass tuning instead of six guitar strings
- **AND** the builder's guitar, ukulele, or piano instrument selection SHALL remain unchanged

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

#### Scenario: Tuning information without duplicate badge
- **WHEN** a tuning is selected
- **THEN** its name and open-string pitch sequence SHALL remain available in the labeled tuning control and board accessibility text
- **AND** the former standalone header tuning badge SHALL NOT be rendered

#### Scenario: Remembered pattern choices
- **WHEN** the user selects CAGED E form, switches to 3NPS degree 4, then returns to CAGED
- **THEN** E form SHALL be restored
- **AND** returning to 3NPS SHALL restore degree 4

#### Scenario: Compatibility recovery
- **WHEN** a remembered CAGED or 3NPS selection becomes incompatible and later Standard guitar is restored
- **THEN** the prior family and sub-selection SHALL become effective again without additional input

#### Scenario: Keyboard overlay selection
- **WHEN** a keyboard user navigates the Fret Finder learning controls
- **THEN** no overlay picker or overlay-search control SHALL be present in the focus order

#### Scenario: Escape closes without selection
- **WHEN** a keyboard user presses Escape while a Fret Finder control has focus
- **THEN** no overlay selection modal or hidden overlay state SHALL be opened or changed

#### Scenario: Builder independence
- **WHEN** scale, tuning, handedness, or pattern controls change
- **THEN** builder chords, locks, variants, instrument, playback cursor, and agent-result invalidation state SHALL remain unchanged

#### Scenario: Overlay settings are absent
- **WHEN** Fret Finder renders at any supported viewport
- **THEN** no chord overlay trigger, picker, search, legend, or clear-overlay action SHALL be present

### Requirement: Horizontal fretboard rendering
The explorer SHALL render open strings and frets 1 through 15 horizontally, with conventional high-to-low visual string order, selected tuning labels, fret numbers, position markers, and a pattern-filtered scale map.

#### Scenario: Guitar anatomy
- **WHEN** Guitar is active
- **THEN** six string rows, sixteen fret lanes including open strings, and markers at frets 3, 5, 7, 9, 12, and 15 SHALL be visible
- **AND** fret 12 SHALL use a double marker

#### Scenario: Root and interval roles
- **WHEN** any scale is displayed
- **THEN** every root position SHALL use the Tonari accent treatment and label `1` in Intervals mode
- **AND** non-root scale positions SHALL remain distinguishable without relying on color alone

#### Scenario: Right-handed fret axis
- **WHEN** Right-handed is active
- **THEN** the visible fret columns SHALL run from open strings at the left edge to fret 15 at the right edge

#### Scenario: Left-handed fret axis
- **WHEN** Left-handed is active
- **THEN** the visible fret columns SHALL run from fret 15 at the left edge to open strings at the right edge
- **AND** high-to-low string row order and string numbers SHALL remain unchanged

#### Scenario: Visible position union
- **WHEN** a pattern is active
- **THEN** focusable positions SHALL equal the visible pattern scale tones exactly
- **AND** hidden non-pattern scale tones SHALL NOT remain focusable

#### Scenario: Exact position semantics
- **WHEN** a highlighted note receives focus
- **THEN** its accessible name SHALL include handedness, instrument string, selected tuning, fret, note name, scale interval, and pattern membership

#### Scenario: Exact orientation semantics
- **WHEN** a highlighted note receives focus
- **THEN** its accessible name SHALL include handedness, instrument string, selected tuning, fret, note name, and interval label

### Requirement: Keyboard and reduced-motion behavior
The explorer SHALL support visual-direction keyboard navigation across the visible pattern scale tones and SHALL not require animation to understand tuning, handedness, or pattern changes.

#### Scenario: Spatial keyboard navigation
- **WHEN** a highlighted position has focus and the user presses an arrow key
- **THEN** focus SHALL move to the nearest highlighted position in that visual direction when one exists
- **AND** the focused position SHALL scroll into view inside the board region

#### Scenario: Right-handed horizontal navigation
- **WHEN** Right-handed is active and a visible position receives ArrowRight
- **THEN** focus SHALL move to the next visible position visually to the right, which has a higher fret number

#### Scenario: Left-handed horizontal navigation
- **WHEN** Left-handed is active and a visible position receives ArrowRight
- **THEN** focus SHALL move to the next visible position visually to the right, which has a lower fret number

#### Scenario: Arrow boundary
- **WHEN** an arrow key has no visible destination in its spatial direction
- **THEN** focus SHALL remain on the current position and native page or scroller movement SHALL be prevented

#### Scenario: Filtered focus recovery
- **WHEN** a pattern, key, or mode change removes the current roving-focus position
- **THEN** exactly one surviving visible position SHALL receive `tabIndex=0`
- **AND** focus SHALL move there only when the removed position previously owned DOM focus

#### Scenario: Left-handed mobile edge
- **WHEN** Left-handed is selected in a horizontally overflowing viewport
- **THEN** the board SHALL reveal the open-string edge without requiring manual scrolling

#### Scenario: Visible focus
- **WHEN** a pattern control or highlighted position receives keyboard focus
- **THEN** a visible Tonari focus ring SHALL be rendered

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** tuning, orientation, workspace, pattern, and note-state transitions SHALL complete without animation

### Requirement: Responsive containment and performance
The explorer SHALL preserve document-width containment across desktop, tablet, and 375px mobile viewports while keeping tuning, orientation, and pattern updates responsive.

#### Scenario: Desktop board
- **WHEN** the viewport is at least 1024px wide
- **THEN** the board SHALL fit its content region or scroll only within the labeled board container

#### Scenario: Mobile board
- **WHEN** the viewport is 375px wide
- **THEN** controls SHALL wrap without overlap and the board SHALL scroll horizontally inside its own container
- **AND** the document SHALL not overflow horizontally

#### Scenario: Desktop learning layer
- **WHEN** the viewport is at least 1024px wide
- **THEN** pattern controls SHALL fit in a separate deterministic learning-layer surface without destabilizing the primary control rail

#### Scenario: Mobile controls
- **WHEN** the viewport is 375px wide
- **THEN** primary and pattern controls SHALL wrap without overlap
- **AND** the document SHALL not overflow horizontally
- **AND** the fretboard SHALL retain one internal horizontal scroller

#### Scenario: Interaction latency
- **WHEN** instrument, tuning, handedness, root, mode, label, pattern, or pattern sub-selection changes after initial render
- **THEN** the representative rendered board state SHALL update within 500 milliseconds

#### Scenario: Workspace continuity
- **WHEN** the user changes pattern state, visits another workspace, and returns to Fret Finder
- **THEN** progression content, locks, playback or highlight state, and the mounted Harmony Companion provider or panel SHALL remain unchanged

### Requirement: Pattern-filtered scale mapping
The system SHALL expose deterministic, deeply frozen, orientation-neutral pattern results that filter the selected scale into `All`, five CAGED forms, or seven three-notes-per-string positions without changing the underlying scale rows.

#### Scenario: All is behavior-identical
- **WHEN** `All` is selected for any supported instrument, tuning, root, or mode
- **THEN** the visible scale-position keys SHALL equal the complete existing scale-tone key set exactly
- **AND** no scale position SHALL be added, removed, or relabeled

#### Scenario: CAGED form choices
- **WHEN** CAGED is available on Standard six-string guitar
- **THEN** C, A, G, E, and D form choices SHALL be available with stable ids
- **AND** each form SHALL return scale-tone keys plus per-string fret envelopes from an immutable transposable template

#### Scenario: G Major E-form anchors
- **WHEN** G Major and the CAGED E form are selected on Standard guitar
- **THEN** root anchors SHALL include low string 6 fret 3, string 4 fret 5, and high string 1 fret 3
- **AND** visible scale tones SHALL remain inside the selected E-form envelopes

#### Scenario: Three-notes-per-string choices
- **WHEN** 3NPS is available on Standard six-string guitar
- **THEN** `Starts on degree 1` through `Starts on degree 7` SHALL be available with stable ids
- **AND** every complete result SHALL contain exactly three consecutive scale degrees per physical string with strictly ascending absolute pitches

#### Scenario: C Major degree-one 3NPS position
- **WHEN** C Major and `Starts on degree 1` are selected on Standard guitar
- **THEN** the low-to-high string fret groups SHALL be `6:8,10,12`, `5:8,10,12`, `4:9,10,12`, `3:9,10,12`, `2:10,12,13`, and `1:10,12,13`
- **AND** the result SHALL contain exactly 18 unique positions from fret 0 through fret 15

#### Scenario: Pattern compatibility
- **WHEN** Bass or a non-Standard guitar tuning is selected while CAGED or 3NPS is remembered
- **THEN** the pattern result SHALL be explicitly unavailable with the reason `Patterns currently require Standard six-string guitar`
- **AND** the effective visible map SHALL use `All` without erasing the remembered family or sub-selection

#### Scenario: Handedness invariance
- **WHEN** handedness changes for a CAGED or 3NPS result
- **THEN** the same numeric `stringNumber:fret` keys and envelopes SHALL remain selected
- **AND** only their rendered column order SHALL reverse
