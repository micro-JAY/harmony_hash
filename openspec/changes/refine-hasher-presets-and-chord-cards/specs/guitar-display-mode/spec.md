## MODIFIED Requirements

### Requirement: Three-way guitar display mode toggle
The guitar chord card SHALL display a centered 3-way segmented control with modes `Fingering` (default), `Intervals`, and `Notes`. The control SHALL remain geometrically centered independently of the modifier trigger's width and SHALL wrap to its own centered row when a card cannot fit both controls safely.

#### Scenario: Default state
- **WHEN** a guitar chord card renders
- **THEN** the toggle SHALL show `Fingering` as the active mode and the chord diagram SHALL appear as the standard SVG

#### Scenario: Switch to Intervals mode
- **WHEN** the user activates `Intervals`
- **THEN** finger dots SHALL display interval labels such as 1, b3, 3, 5, and b7 centered inside each dot

#### Scenario: Switch to Notes mode
- **WHEN** the user activates `Notes`
- **THEN** finger dots SHALL display note names centered inside each dot while respecting the chord's flat or sharp preference

#### Scenario: Symmetric desktop alignment
- **WHEN** the modifier trigger and display-mode control share a guitar-card toolbar
- **THEN** the center of the display-mode control SHALL align with the center of the card rather than the remaining space beside the modifier

#### Scenario: Narrow card alignment
- **WHEN** the card cannot fit the modifier and three labels on one row
- **THEN** the controls SHALL form separate contained rows and the display-mode control SHALL remain centered without clipping or horizontal document overflow
