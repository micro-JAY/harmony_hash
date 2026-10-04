## MODIFIED Requirements

### Requirement: First-visit onboarding
The application SHALL show a concise Tonari-styled onboarding dialog on a user's first visit and SHALL defer dismissal persistence until the user explicitly dismisses it.

#### Scenario: New visitor
- **WHEN** the application loads without the current versioned dismissal record
- **THEN** onboarding SHALL open and SHALL explain Hasher, Tune Toolbox and its Fret Finder, Discovery, instrument switching, playback, and cross-tool handoff

#### Scenario: Explicit dismissal
- **WHEN** the user activates the close or `Start hashing` action
- **THEN** onboarding SHALL close and the current versioned dismissal record SHALL be stored

#### Scenario: Returning visitor
- **WHEN** the application loads with the current versioned dismissal record
- **THEN** onboarding SHALL remain closed and Hasher SHALL be immediately usable

#### Scenario: Storage unavailable
- **WHEN** reading or writing local storage throws or is unavailable
- **THEN** the application SHALL remain usable, onboarding SHALL be dismissible for the session, and no uncaught error SHALL be logged

## ADDED Requirements

### Requirement: Current guided-tour coverage
The guided tour SHALL describe the current Hasher, Tune Toolbox, and Discovery interface in its visual order, including Harmony Voice and Harmony Type input, Fret Finder inside Tune Toolbox, and Discovery's note input, Improv Insight, and progression loop.

#### Scenario: Tour starts in Hasher
- **WHEN** the user starts the guided tour
- **THEN** the tour SHALL begin with the top-level workspace navigation and continue through the current Hasher controls before requesting another workspace

#### Scenario: Current destination copy
- **WHEN** onboarding or the guided tour describes the application's destinations
- **THEN** it SHALL name Hasher, Tune Toolbox, and Discovery as the three top-level workspaces
- **AND** it SHALL describe Fret Finder as part of Tune Toolbox

#### Scenario: Localized tour
- **WHEN** Japanese is active
- **THEN** the updated tour controls, workspace handoff prompts, tool names, and Discovery guidance SHALL be presented in Japanese

### Requirement: User-driven workspace handoffs
The guided tour SHALL pause at each forward workspace boundary and SHALL continue only after the user activates the specifically requested top-level tab.

#### Scenario: Request Tune Toolbox
- **WHEN** the final Hasher feature step advances
- **THEN** the tour SHALL keep Hasher visible and prompt the user to activate the highlighted Tune Toolbox tab
- **AND** Next and forward-arrow shortcuts SHALL NOT bypass the prompt

#### Scenario: Continue in Tune Toolbox
- **WHEN** the paused user activates the Tune Toolbox tab by pointer or keyboard
- **THEN** the application SHALL perform its normal workspace change
- **AND** the tour SHALL resume at Fret Finder inside Tune Toolbox

#### Scenario: Request Discovery
- **WHEN** the final Tune Toolbox feature step advances
- **THEN** the tour SHALL keep Tune Toolbox visible and prompt the user to activate the highlighted Discovery tab
- **AND** the tour SHALL resume in Discovery only after that activation

#### Scenario: Wrong workspace does not satisfy handoff
- **WHEN** the tour is paused for one destination and another workspace control is activated
- **THEN** the requested handoff SHALL remain pending and SHALL NOT skip a tour step

#### Scenario: Accessible handoff state
- **WHEN** the tour pauses for a tab activation
- **THEN** the requested tab SHALL remain operable, receive programmatic focus, and be named in an announced instruction
- **AND** ordinary modal steps SHALL continue to block background interaction

#### Scenario: Tour closes during a handoff
- **WHEN** the user closes the tour or presses Escape while a handoff is pending
- **THEN** the tour SHALL close cleanly and restore the pre-tour workspace and disclosure state according to the existing tour restoration contract
