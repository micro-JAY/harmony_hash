## ADDED Requirements

### Requirement: Contextual chord-note role tooltip
Every highlighted Guitar position and Piano key in a HASHER chord card SHALL expose a compact tooltip containing the displayed note name, chord degree, and full harmonic-role name derived from the chord root. The fixed twelve-degree HASHER legend SHALL NOT be rendered.

#### Scenario: Guitar played position hovered
- **WHEN** the user hovers a played open-string, fretted, or per-string barre marker
- **THEN** a tooltip SHALL show that marker's displayed note, degree, and harmonic role without obscuring the marker

#### Scenario: Piano highlighted key hovered
- **WHEN** the user hovers an active Piano key
- **THEN** the same tooltip format SHALL identify the voiced note and its role in the chord

#### Scenario: Keyboard discovery
- **WHEN** a keyboard user focuses a played Guitar marker or active Piano key
- **THEN** the tooltip SHALL appear and the focused target SHALL have an accessible name containing the same note and harmonic-role information

#### Scenario: Inactive positions remain quiet
- **WHEN** a Guitar mark is not played or a Piano key is inactive
- **THEN** it SHALL NOT trigger a chord-note role tooltip

## MODIFIED Requirements

### Requirement: Global instrument toggle
The system SHALL provide an icon-only Guitar/Piano toggle that switches ALL chord cards to the selected instrument view simultaneously. Each option SHALL retain a translated accessible name and a minimum 44-pixel target; its selected icon SHALL use the dark-on-light primary treatment and its unselected icon SHALL use the muted grey treatment.

#### Scenario: Toggle to piano
- **WHEN** the user activates the keyboard icon
- **THEN** all chord cards SHALL re-render as piano keyboard visualizations

#### Scenario: Toggle to guitar
- **WHEN** the user activates the guitar icon
- **THEN** all chord cards SHALL re-render as guitar SVG chord diagrams

#### Scenario: Default instrument
- **WHEN** the application loads
- **THEN** the default instrument SHALL be Guitar

#### Scenario: Selected presentation
- **WHEN** an instrument option is selected
- **THEN** its icon SHALL render with the primary dark-on-light selected treatment while the other icon remains muted grey
