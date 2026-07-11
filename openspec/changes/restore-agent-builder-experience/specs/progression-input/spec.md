## ADDED Requirements

### Requirement: Responsive input controls
The Free Input and Progression Agent control rows SHALL reflow without horizontal document overflow at mobile widths.

#### Scenario: Free Input on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** the chord input and Run button SHALL stack or size fluidly within the viewport

#### Scenario: Progression Agent on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** the prompt textarea and Build progression button SHALL stack with full-width usable controls

#### Scenario: No horizontal overflow
- **WHEN** either input mode is viewed at 375px width
- **THEN** `document.scrollWidth` SHALL NOT exceed `window.innerWidth`

## MODIFIED Requirements

### Requirement: Input mode switching
The system SHALL allow users to switch between free-text input and the Progressions tab without losing the other mode's state. The Progressions tab SHALL host the natural-language Progression Agent as its primary surface and preserve the preset browser as a secondary disclosure. Optional voice controls SHALL remain compact and SHALL NOT insert an expanded idle panel between active controls and chord output.

#### Scenario: Mode toggle
- **WHEN** the user switches from free-text to the Progressions tab
- **THEN** the free-text input content SHALL be preserved and the Progressions tab SHALL be displayed

#### Scenario: Progression Agent is the primary surface
- **WHEN** the user opens the Progressions tab
- **THEN** the agent's prompt textarea and `Build progression` button SHALL be visible by default at the top of the tab

#### Scenario: Preset browser preserved as fallback
- **WHEN** the user opens the Progressions tab
- **THEN** the existing preset browser (key selector, tonality selector, subgroups, minor blend help) SHALL remain available under an `Or pick a preset` disclosure below the agent controls

#### Scenario: Agent result overrides display
- **WHEN** the user submits an agent prompt and the Worker returns a valid progression
- **THEN** the chord cards SHALL display the agent's chords, replacing any previous result from free-text or presets

#### Scenario: Preset selection overrides display
- **WHEN** the user selects a preset progression from the fallback section
- **THEN** the chord cards SHALL display the preset's chords, replacing any previous result from free-text or the agent

#### Scenario: Companion does not break reading order
- **WHEN** the companion is idle or unavailable in either input mode
- **THEN** only its compact control SHALL appear between input controls and chord output
