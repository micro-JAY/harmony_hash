## ADDED Requirements

### Requirement: Collapsible Fret Finder
Tune Toolbox SHALL contain Fret Finder before Scale Synthesia, The Circle and Note Neural Network. Every tool SHALL be collapsible and retain settings across disclosure and workspace changes.

#### Scenario: Shared scale context
- **WHEN** the toolbox root or scale changes and Fret Finder is expanded
- **THEN** its map SHALL use that root and scale without duplicate root/scale dropdowns inside the panel

#### Scenario: Clean optional controls
- **WHEN** Fret Finder opens
- **THEN** instrument choice and the map SHALL be immediately available while optional tuning, orientation, labels, patterns and overlay controls are grouped in a labeled settings disclosure
- **AND** controls SHALL align and stay within a 375px-wide document

#### Scenario: State continuity
- **WHEN** a user changes the fretboard instrument or handedness, collapses it and returns
- **THEN** those settings SHALL persist without changing Hasher chords or its instrument
