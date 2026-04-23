## MODIFIED Requirements

### Requirement: Input mode switching
The system SHALL allow users to switch between free-text input and the Progressions tab without losing the other mode's state. The Progressions tab SHALL host the natural-language Progression Agent as its primary surface and SHALL preserve the preset browser as a secondary "Or pick a preset" section.

#### Scenario: Mode toggle
- **WHEN** the user switches from free-text to the Progressions tab
- **THEN** the free-text input content SHALL be preserved and the Progressions tab SHALL be displayed

#### Scenario: Progression Agent is the primary surface
- **WHEN** the user opens the Progressions tab
- **THEN** the agent's prompt textarea and "Build progression" button SHALL be visible by default at the top of the tab

#### Scenario: Preset browser preserved as fallback
- **WHEN** the user opens the Progressions tab
- **THEN** the existing preset browser (key selector, tonality selector, subgroups, minor blend help) SHALL remain available under an "Or pick a preset" disclosure below the agent controls

#### Scenario: Agent result overrides display
- **WHEN** the user submits an agent prompt and the Worker returns a valid progression
- **THEN** the chord cards SHALL display the agent's chords, replacing any previous result (free-text or preset)

#### Scenario: Preset selection overrides display
- **WHEN** the user selects a preset progression from the fallback section
- **THEN** the chord cards SHALL display the preset's chords, replacing any previous result (free-text or agent)
