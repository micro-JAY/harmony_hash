## ADDED Requirements

### Requirement: Geometrically centered workspace navigation
The application header SHALL keep the Hasher, Tune Toolbox, and Fret Finder workspace navigation geometrically centered in the viewport at desktop widths while preserving usable brand, locale, Help/About, and instrument controls.

#### Scenario: Desktop center invariant
- **WHEN** the header renders at a viewport width of at least 1024 pixels
- **THEN** the workspace navigation's horizontal center SHALL match the viewport center within the tested geometry tolerance
- **AND** changing instrument or locale SHALL NOT shift that center

#### Scenario: Responsive wrapped navigation
- **WHEN** the header renders at tablet or mobile width
- **THEN** the workspace navigation SHALL occupy a centered responsive row without clipping any workspace, locale, Help/About, or instrument control

#### Scenario: Keyboard behavior preserved
- **WHEN** a keyboard user focuses and activates a centered workspace tab
- **THEN** visible focus, pressed state, and workspace selection SHALL behave identically to the existing navigation contract

#### Scenario: FRET FINDER naming remains canonical
- **WHEN** the fretboard workspace appears in the header or as its workspace title
- **THEN** the English visible label SHALL be `FRET FINDER`
- **AND** Japanese SHALL use the localized FRET FINDER name rather than the legacy Fretboard Explorer title
