## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Dictionary-valid chord overlays
**Reason**: Progression-aware scale highlighting is moving to Discovery, while an unrelated chord picker made Fret Finder's scale-learning controls and board semantics unnecessarily dense.

**Migration**: Build or select a progression in Hasher, then use the recommended-scale selector and optional instrument highlight in Discovery.

### Requirement: Non-color-only chord-tone rendering
**Reason**: Fret Finder no longer renders chord overlays, so chord-tone rings, outside-scale shapes, and the overlay legend have no remaining user-facing state.

**Migration**: Discovery represents the selected recommended scale as a low-priority, non-color-only overlay while direct note states remain dominant.
