## Purpose

Turn the current Hasher progression into focused, playable scale guidance on either Discovery instrument without obscuring direct note input or chord-identification feedback.

## ADDED Requirements

### Requirement: Progression-aware scale recommendations
Discovery SHALL derive an ordered, bounded set of compatible scale recommendations from the current Hasher progression by reusing the application's canonical Improv Insight analysis.

#### Scenario: Progression has recommendations
- **WHEN** Hasher contains one or more dictionary-backed chords and Discovery is active
- **THEN** the highest-ranked compatible scale SHALL be selected initially
- **AND** the control SHALL offer the other bounded recommendations with their scale names and match quality

#### Scenario: Progression changes
- **WHEN** the Hasher progression changes while Discovery is mounted
- **THEN** the recommendations SHALL recompute from the new progression
- **AND** a still-valid selected recommendation SHALL remain selected, otherwise the new highest-ranked recommendation SHALL be selected

#### Scenario: No analyzable progression
- **WHEN** Hasher has no analyzable chords
- **THEN** Discovery SHALL explain that a Hasher progression is required
- **AND** scale selection and highlighting SHALL be unavailable without an error

### Requirement: Compact Improv Insight control
Discovery SHALL present a compact Improv Insight control adjacent to the playable instrument with a labeled recommendation selector and an explicit Highlight on/off control.

#### Scenario: Select another recommendation
- **WHEN** the user chooses a different recommended scale
- **THEN** the selected scale label and any active instrument overlay SHALL update without changing the Hasher progression or the notes held in Discovery

#### Scenario: Highlight is off
- **WHEN** Highlight is off
- **THEN** the piano and guitar SHALL retain their normal interactive rendering without scale-tone marks

#### Scenario: Instrument switch
- **WHEN** the user switches between piano and guitar
- **THEN** the selected recommendation and Highlight setting SHALL remain unchanged

### Requirement: Low-priority scale-tone overlay
When Highlight is on, Discovery SHALL mark every visible occurrence of a pitch class in the selected recommended scale using a soft translucent treatment beneath selected, held, and sounding-note states.

#### Scenario: Piano scale overlay
- **WHEN** a recommended scale is selected, Highlight is on, and Piano is active
- **THEN** every visible piano key whose pitch class belongs to that scale SHALL receive the scale-tone treatment across all displayed octaves

#### Scenario: Guitar scale overlay
- **WHEN** a recommended scale is selected, Highlight is on, and Guitar is active
- **THEN** every visible guitar position whose pitch class belongs to that scale SHALL receive the scale-tone treatment across all displayed strings and frets

#### Scenario: Direct interaction remains dominant
- **WHEN** a highlighted scale position is selected, held, sounded, or part of the identified chord feedback
- **THEN** the direct interaction state SHALL remain visually and semantically dominant over the scale overlay

#### Scenario: Non-color semantics
- **WHEN** a scale-highlighted key or fret position is exposed to assistive technology
- **THEN** its accessible name SHALL identify it as a tone of the selected scale without relying on color alone

### Requirement: Legible Discovery guitar presentation
The Discovery guitar SHALL expose a recognizably proportioned fretboard with a visible nut, graduated fret spacing, differentiated string weights, fret guides, and note targets that remain legible in either appearance theme.

#### Scenario: Desktop guitar overlay
- **WHEN** Guitar is active at desktop width with Highlight on
- **THEN** note names, root identity, strings, frets, position guides, and direct interaction states SHALL remain distinguishable at a glance

#### Scenario: Responsive guitar overlay
- **WHEN** Guitar is active at 375px width
- **THEN** the fretboard SHALL use one labeled internal horizontal scroller without causing document overflow

#### Scenario: Keyboard navigation
- **WHEN** a keyboard user moves among guitar positions
- **THEN** every interactive position SHALL expose visible focus and a complete string, fret, note, and selected-scale semantic label

#### Scenario: Reduced motion
- **WHEN** the user prefers reduced motion
- **THEN** overlay, instrument, and note-state changes SHALL remain understandable without animation
