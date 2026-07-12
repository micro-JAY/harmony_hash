## MODIFIED Requirements

### Requirement: Suggestion-mode toggle
The chord reference grid SHALL render a mode toggle that lets the user switch suggestions between "Off" (default), "Key", and "Next" while preserving dictionary-valid cell insertion.

#### Scenario: Default is Off
- **WHEN** the grid is opened for the first time
- **THEN** the mode SHALL be "Off" and the grid SHALL preserve its baseline root colors and interactions without fit badges or fit styling

#### Scenario: Scored modes require key context
- **WHEN** the grid has no `keyContext` prop
- **THEN** the "Key" and "Next" toggle buttons SHALL be disabled while "Off" remains available

#### Scenario: Key mode scores individual cells
- **WHEN** "Key" is active with a valid key and mode context
- **THEN** every visible dictionary-valid chord cell SHALL display its integer key-fit score and stable tier instead of dimming an entire root row

#### Scenario: Next mode uses the last valid chord
- **WHEN** "Next" is active and the input contains a dictionary-valid chord
- **THEN** every visible chord cell SHALL combine key fit, voice leading, and root motion relative to the last valid chord token

#### Scenario: Next mode without a previous chord
- **WHEN** "Next" is active and no input token resolves to a dictionary chord
- **THEN** cells SHALL fall back to key-fit scores and the grid SHALL state that a chord is needed for transition ranking

#### Scenario: Active context visible
- **WHEN** "Key" or "Next" is active
- **THEN** the grid SHALL display the active key and mode plus the transition anchor when one exists

## ADDED Requirements

### Requirement: Full-contrast fit cues
The chord reference grid SHALL preserve readable chord names and numeric scores in every fit tier while using token-based background, border, and glow strength as supplementary cues.

#### Scenario: Outside-tier readability
- **WHEN** a chord receives an `outside` fit tier
- **THEN** its chord name and numeric percentage SHALL remain at full element opacity and SHALL remain distinguishable without relying on color

### Requirement: Reduced-motion behavior
The chord reference grid SHALL honor the user's reduced-motion preference without removing content or interaction affordances.

#### Scenario: Reduced motion requested
- **WHEN** `prefers-reduced-motion: reduce` is active and the user opens, closes, filters, focuses, or inserts from the grid
- **THEN** panel and cell transitions SHALL complete without animation while scores, focus, insertion, and layout remain equivalent
