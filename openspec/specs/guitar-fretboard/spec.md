# guitar-fretboard Specification

## Purpose
Define the fretboard explorer's scale mapping, tunings, handedness, learning patterns, chord overlays, accessibility, and responsive behavior.
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
The Fretboard workspace SHALL provide independent controls for instrument, tuning, handedness, root, mode, label display, pattern family, pattern sub-selection, and chord overlay without mutating progression-builder state.

#### Scenario: Default explorer state
- **WHEN** the Fretboard workspace opens for the first time
- **THEN** Guitar, Standard tuning, Right-handed, C, Major, Intervals, All pattern, and no chord overlay SHALL be selected

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

#### Scenario: Remembered pattern choices
- **WHEN** the user selects CAGED E form, switches to 3NPS degree 4, then returns to CAGED
- **THEN** E form SHALL be restored
- **AND** returning to 3NPS SHALL restore degree 4

#### Scenario: Compatibility recovery
- **WHEN** a remembered CAGED or 3NPS selection becomes incompatible and later Standard guitar is restored
- **THEN** the prior family and sub-selection SHALL become effective again without additional input

#### Scenario: Keyboard overlay selection
- **WHEN** a keyboard user opens the overlay picker, searches `G7#9`, and activates the dictionary result
- **THEN** `G7#9` SHALL become active, the picker SHALL close, and focus SHALL return to the surviving overlay trigger

#### Scenario: Escape closes without selection
- **WHEN** the overlay picker is open and the user presses Escape
- **THEN** it SHALL close, restore trigger focus, and leave the active overlay unchanged

#### Scenario: Builder independence
- **WHEN** pattern or overlay controls change
- **THEN** builder chords, locks, variants, instrument, playback cursor, and agent-result invalidation state SHALL remain unchanged

### Requirement: Horizontal fretboard rendering
The explorer SHALL render open strings and frets 1 through 15 horizontally, with conventional high-to-low visual string order, selected tuning labels, fret numbers, position markers, a pattern-filtered scale map, and the selected chord-tone union.

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
- **WHEN** a pattern and chord overlay are active
- **THEN** focusable positions SHALL equal the visible pattern scale tones plus visible chord tones exactly
- **AND** hidden non-pattern scale tones SHALL NOT remain focusable

#### Scenario: Exact position semantics
- **WHEN** a highlighted note receives focus
- **THEN** its accessible name SHALL include handedness, instrument string, selected tuning, fret, note name, scale interval when present, pattern membership, chord degree when present, and scale-fit status

#### Scenario: Exact orientation semantics
- **WHEN** a highlighted note receives focus
- **THEN** its accessible name SHALL include handedness, instrument string, selected tuning, fret, note name, and interval label

### Requirement: Keyboard and reduced-motion behavior
The explorer SHALL support visual-direction keyboard navigation across the visible pattern/chord union and SHALL not require animation to understand tuning, handedness, pattern, or overlay changes.

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
- **THEN** focus SHALL remain on the current position and native page/scroller movement SHALL be prevented

#### Scenario: Filtered focus recovery
- **WHEN** a pattern, overlay, key, or mode change removes the current roving-focus position
- **THEN** exactly one surviving visible position SHALL receive `tabIndex=0`
- **AND** focus SHALL move there only when the removed position previously owned DOM focus

#### Scenario: Left-handed mobile edge
- **WHEN** Left-handed is selected in a horizontally overflowing viewport
- **THEN** the board SHALL reveal the open-string edge without requiring manual scrolling

#### Scenario: Visible focus
- **WHEN** a pattern control, overlay control, picker result, or highlighted position receives keyboard focus
- **THEN** a visible Tonari focus ring SHALL be rendered

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** tuning, orientation, workspace, pattern, overlay, picker, and note-state transitions SHALL complete without animation

### Requirement: Responsive containment and performance
The explorer SHALL preserve document-width containment across desktop, tablet, and 375px mobile viewports while keeping tuning, orientation, pattern, and overlay updates responsive.

#### Scenario: Desktop board
- **WHEN** the viewport is at least 1024px wide
- **THEN** the board SHALL fit its content region or scroll only within the labeled board container

#### Scenario: Mobile board
- **WHEN** the viewport is 375px wide
- **THEN** controls SHALL wrap without overlap and the board SHALL scroll horizontally inside its own container
- **AND** the document SHALL not overflow horizontally

#### Scenario: Desktop learning layer
- **WHEN** the viewport is at least 1024px wide
- **THEN** pattern and overlay controls SHALL fit in a separate deterministic learning-layer surface without destabilizing the primary control rail

#### Scenario: Mobile controls
- **WHEN** the viewport is 375px wide
- **THEN** primary controls, pattern controls, overlay trigger, picker search, results, summary, and clear action SHALL wrap without overlap
- **AND** the document SHALL not overflow horizontally
- **AND** the fretboard SHALL retain one internal horizontal scroller

#### Scenario: Interaction latency
- **WHEN** instrument, tuning, handedness, root, mode, label, pattern, pattern sub-selection, overlay selection, or overlay clear state changes after initial render
- **THEN** the representative rendered board state SHALL update within 500 milliseconds

#### Scenario: Workspace continuity
- **WHEN** the user changes pattern or overlay state, visits Builder, and returns to Fretboard
- **THEN** progression content, locks, playback/highlight state, and the mounted Harmony Companion provider/panel SHALL remain unchanged

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

### Requirement: Dictionary-valid chord overlays
The explorer SHALL let musicians select one shared-dictionary chord and SHALL derive immutable chord-tone pitch classes, degree labels, scale-fit status, and optional slash-bass identity without using a second chord parser.

#### Scenario: Unique dictionary search
- **WHEN** the overlay picker searches chord names, long names, or aliases
- **THEN** it SHALL return at most 24 unique catalog-entry results
- **AND** every selectable result SHALL re-resolve through the shared chord lookup before becoming active

#### Scenario: Invalid chord input
- **WHEN** submitted overlay text does not resolve through the shared chord lookup
- **THEN** the picker SHALL show an inline error, retain the prior overlay, and SHALL NOT create a best-effort chord

#### Scenario: Cmaj7 over C Major
- **WHEN** `Cmaj7` is overlaid on C Major
- **THEN** C, E, G, and B SHALL all be classified as in-scale chord tones with degrees `1`, `3`, `5`, and `7`

#### Scenario: Altered dominant over C Major
- **WHEN** `G7#9` is overlaid on C Major
- **THEN** G, B, D, and F SHALL be classified as in-scale chord tones
- **AND** A-sharp/B-flat SHALL remain visible as an outside-scale chord tone with degree `#9`

#### Scenario: Slash bass identity
- **WHEN** a valid slash chord adds a bass pitch absent from the upper structure
- **THEN** that pitch SHALL be included once with a `bass` role while existing chord tones remain deduplicated

#### Scenario: Overlay under All
- **WHEN** a chord overlay is active with `All`
- **THEN** every matching chord pitch class SHALL be rendered across open strings through fret 15

#### Scenario: Overlay under a focused pattern
- **WHEN** a chord overlay is active with CAGED or 3NPS
- **THEN** in-scale chord tones SHALL appear only at selected pattern positions
- **AND** outside-scale chord tones SHALL appear inside the pattern's per-string fret envelopes without repopulating the rest of the neck

#### Scenario: Overlay persistence
- **WHEN** root, mode, tuning, handedness, labels, instrument, pattern family, or pattern sub-selection changes
- **THEN** the same selected chord identity and display spelling SHALL remain active while its scale-fit classification recomputes

#### Scenario: Clear overlay
- **WHEN** the active overlay is cleared
- **THEN** the board SHALL restore the exact scale/pattern marker set, labels, accessible names, and roving focus behavior produced without an overlay

### Requirement: Non-color-only chord-tone rendering
The fretboard SHALL render scale membership, pattern membership, chord membership, chord degree, and outside-scale status with visible and accessible cues that do not rely on color alone.

#### Scenario: In-scale chord-tone treatment
- **WHEN** a visible scale position is also a selected chord tone
- **THEN** it SHALL retain its existing scale-degree fill and label
- **AND** it SHALL gain a distinct outer ring plus `chord tone <degree>, in scale` semantics

#### Scenario: Outside-scale chord-tone treatment
- **WHEN** a visible selected chord tone is outside the selected scale
- **THEN** it SHALL use a dashed outline and distinct shape/surface treatment
- **AND** it SHALL show its note name even in Intervals mode
- **AND** its accessible name SHALL include chord degree and `outside <root> <mode>`

#### Scenario: Overlay legend
- **WHEN** a chord overlay is active
- **THEN** visible legend text SHALL explain that a ring means chord tone and a dashed marker means outside the selected scale
