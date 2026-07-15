## MODIFIED Requirements

### Requirement: First-class explorer controls
The Fretboard workspace SHALL provide independent controls for instrument, tuning, handedness, root, mode, label display, pattern family, pattern sub-selection, and chord overlay without mutating progression-builder state. The selected tuning SHALL remain available through its labeled control and board semantics without a duplicate standalone header badge.

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
- **WHEN** a keyboard user opens the overlay picker, searches `G7#9`, and activates the dictionary result
- **THEN** `G7#9` SHALL become active, the picker SHALL close, and focus SHALL return to the surviving overlay trigger

#### Scenario: Escape closes without selection
- **WHEN** the overlay picker is open and the user presses Escape
- **THEN** it SHALL close, restore trigger focus, and leave the active overlay unchanged

#### Scenario: Builder independence
- **WHEN** pattern or overlay controls change
- **THEN** builder chords, locks, variants, instrument, playback cursor, and agent-result invalidation state SHALL remain unchanged

