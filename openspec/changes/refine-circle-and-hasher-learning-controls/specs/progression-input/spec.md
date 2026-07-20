## ADDED Requirements

### Requirement: HASHER output learning toolbar
HASHER SHALL place its Browse chords disclosure, applicable Undo action, global Guitar/Piano selector, and compact chord-degree color legend in one responsive control region immediately before progression actions and chord-card output.

#### Scenario: Control order
- **WHEN** HASHER renders
- **THEN** the output control region SHALL follow Browse chords, Undo when applicable, Guitar/Piano, then note-color legend reading order

#### Scenario: Instrument operation
- **WHEN** the user selects Guitar or Piano from the output control region
- **THEN** every chord card SHALL switch through the existing global instrument state without changing the progression, variants, locks, or compatible voicing state

#### Scenario: Degree legend
- **WHEN** the output control region renders
- **THEN** a compact legend SHALL show the chromatic chord-degree abbreviations `1`, `b2`, `2`, `b3`, `3`, `4`, `#4/b5`, `5`, `b6`, `6`, `b7`, and `7` with their shared interval colors
- **AND** visible text SHALL make the legend understandable without color

#### Scenario: Empty output
- **WHEN** HASHER has no rendered chords
- **THEN** the instrument selector and note-color legend SHALL remain available near Browse chords without creating a card-sized gap

#### Scenario: Responsive wrapping
- **WHEN** the output control region renders at 1500, 820, or 375px width in English or Japanese
- **THEN** its groups SHALL wrap in logical order, remain aligned with the progression surface, retain 44px interactive targets, and cause no horizontal document overflow

#### Scenario: Guided-tour continuity
- **WHEN** the guided tour targets instrument selection
- **THEN** it SHALL locate and focus the relocated instrument selector without changing the tour sequence or seeded progression behavior
