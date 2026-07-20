## MODIFIED Requirements

### Requirement: Unified collapsible Tune Toolbox workspace
The application SHALL present Scale Synthesia, THE CIRCLE, and Note Neural Network as three named, collapsible tools in that exact reading order within one top-level `Tune Toolbox` workspace. Scale Synthesia SHALL be the initially expanded primary tool, and the English product heading SHALL read `THE CIRCLE` while every supported locale retains its translated product name.

#### Scenario: Tune Toolbox opens
- **WHEN** the user activates Tune Toolbox in the application header
- **THEN** Scale Synthesia, THE CIRCLE, and Note Neural Network headers SHALL appear in that order
- **AND** Scale Synthesia SHALL be expanded by default

#### Scenario: Disclosure operation
- **WHEN** a user activates a tool header with pointer or keyboard input
- **THEN** only that tool body SHALL toggle while its header and context summary remain available

#### Scenario: Collapsed state preservation
- **WHEN** a tool is collapsed and expanded again during the session
- **THEN** its compatible selection, detail, and viewport state SHALL be preserved

#### Scenario: Scale audio on collapse
- **WHEN** Scale Synthesia collapses while scale audio is active
- **THEN** its audio SHALL stop and no hidden playback cursor SHALL continue

#### Scenario: Responsive stacking
- **WHEN** Tune Toolbox renders at 375px width
- **THEN** shared controls and all tool headers/bodies SHALL remain within the document width and SHALL retain the defined reading order

#### Scenario: Localized Circle name
- **WHEN** the locale is English
- **THEN** the product header SHALL read `THE CIRCLE`
- **AND WHEN** the locale changes
- **THEN** the localized product name SHALL render without changing generic explanatory uses of “circle of fifths”

### Requirement: Shared relationship model and strength communication
THE CIRCLE and Note Neural Network SHALL consume deterministic theory relationships that name relationship kind and ordinal strength for keys, relative modes, scale families, and relevant chords. THE CIRCLE SHALL communicate Strong, Medium, and Weak with aligned text rather than decorative dot or dash swatches; Note Neural Network MAY retain graphical line encoding in addition to text.

#### Scenario: Circle selection
- **WHEN** C or C Dorian is selected in THE CIRCLE
- **THEN** the view SHALL identify close fifths, relative relationships, modal relationships, and relevant chord/function information from the shared model

#### Scenario: Circle strength text
- **WHEN** THE CIRCLE renders relationships of different strength
- **THEN** each row SHALL show a stable Strong, Medium, or Weak text badge
- **AND** no decorative dotted modulation arc or dot/dash strength swatch SHALL render

#### Scenario: Aligned relationship rows
- **WHEN** relationship labels wrap or the locale changes
- **THEN** names and strength badges SHALL remain aligned and contained without truncating balanced parentheses

#### Scenario: Non-color access
- **WHEN** a user cannot perceive relationship colors
- **THEN** labels, selected state, accessible descriptions, and explicit strength text SHALL communicate the relationship kind and strength

#### Scenario: Deterministic results
- **WHEN** the same root, scale, mood, and relationship catalog are evaluated repeatedly
- **THEN** nodes, edges, strengths, labels, and explanations SHALL be identical

## ADDED Requirements

### Requirement: Practical Circle exploration guidance
THE CIRCLE SHALL supplement its two adjacent keys with a bounded Popular modes section and a bounded Common key changes section derived truthfully from the selected root.

#### Scenario: Popular modes
- **WHEN** a supported root is selected
- **THEN** three popular same-root mode cards SHALL identify the mode, characteristic degree, practical chord target, and a concrete short progression

#### Scenario: Common non-adjacent changes
- **WHEN** a supported root is selected
- **THEN** three common key-change cards SHALL identify the destination, modulation mechanism or pivot, and a concrete short progression

#### Scenario: Insight activation
- **WHEN** the user activates a mode or destination card
- **THEN** the shared Toolbox root/scale context SHALL update truthfully without mutating the HASHER timeline, instrument, playback, or Note Neural Network exploration state

#### Scenario: Enharmonic labels
- **WHEN** a Circle sector has a common enharmonic alias
- **THEN** its visible label SHALL use balanced parenthetical notation such as `F# (Gb)` while preserving its stable ID and canonical selection value

#### Scenario: Enharmonic center signature consistency
- **WHEN** selecting a flat-spelled sector canonicalizes the shared root to an enharmonic sharp spelling
- **THEN** the Circle center label and center signature SHALL describe the same canonical context as the detail panel
- **AND** the selected sector SHALL retain its original flat-spelled accessible identity

#### Scenario: Bounded responsive guidance
- **WHEN** THE CIRCLE renders at desktop, tablet, or 375px mobile width
- **THEN** the insight cards SHALL wrap within the existing detail surface without horizontal document overflow
