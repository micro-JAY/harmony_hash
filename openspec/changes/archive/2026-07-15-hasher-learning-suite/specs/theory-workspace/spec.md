## ADDED Requirements

### Requirement: Unified collapsible Tune Toolbox workspace
The application SHALL present Circle of Fifths, Scale Synthesia, and Note Neural Network as three named, collapsible tools within one top-level `Tune Toolbox` workspace rather than separate top-level workspaces. The familiar `Circle of Fifths` tool name SHALL remain unchanged inside the toolbox.

#### Scenario: Tune Toolbox opens
- **WHEN** the user activates Tune Toolbox in the application header
- **THEN** all three tool headers SHALL be present in one document and at least the default primary tool SHALL be expanded

#### Scenario: Disclosure operation
- **WHEN** a user activates a tool header with pointer or keyboard input
- **THEN** only that tool body SHALL toggle while its header, context summary, and applicable handoff action remain available

#### Scenario: Collapsed state preservation
- **WHEN** a tool is collapsed and expanded again during the session
- **THEN** its compatible selection, detail, and viewport state SHALL be preserved

#### Scenario: Scale audio on collapse
- **WHEN** Scale Synthesia collapses while scale audio is active
- **THEN** its audio SHALL stop and no hidden playback cursor SHALL continue

#### Scenario: Responsive stacking
- **WHEN** Tune Toolbox renders at 375px width
- **THEN** shared controls and all tool headers/bodies SHALL remain within the document width and expanded tools SHALL stack in reading order

### Requirement: Shared explicit theory context
The Tune Toolbox workspace SHALL own one shared Root, Scale/Mode, and Mood context consumed by all three tools. Mood SHALL always have a defined value and SHALL default to `Any`.

#### Scenario: Initial context
- **WHEN** Tune Toolbox first renders without a transferred selection
- **THEN** Root SHALL be C, Scale/Mode SHALL use the product default, and Mood SHALL visibly be Any

#### Scenario: Cross-tool update
- **WHEN** a user selects D Dorian in any Theory tool
- **THEN** the shared context rail and the compatible Circle, Scale, and Network selections SHALL update to D Dorian without remounting the workspace

#### Scenario: Mood remains explicit
- **WHEN** the user has not selected a specific mood
- **THEN** the Mood control SHALL continue to show Any and theory results SHALL use the unfiltered set

#### Scenario: Hasher isolation
- **WHEN** Tune Toolbox mood changes and the user returns to Hasher
- **THEN** Hasher input, chord-browser ranking, and preset selection SHALL NOT be filtered by the Theory mood

### Requirement: Scale-to-Hasher handoff
Scale Synthesia SHALL provide a visible `Use this in Hasher` action that transfers the selected root and an honest compatible context into Hasher without fabricating unsupported preset behavior.

#### Scenario: Supported scale handoff
- **WHEN** the selected scale maps to Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Lydian, or Phrygian and the user activates `Use this in Hasher`
- **THEN** Hasher SHALL open with the same root and supported mode selected and focus SHALL move to the Hasher context or primary input

#### Scenario: Unsupported formula handoff
- **WHEN** the selected Scale Synthesia formula has no corresponding Hasher preset scale type
- **THEN** the handoff SHALL preserve the selected root and a truthful validated free-input/context suggestion
- **AND** SHALL NOT label or transpose that formula as a supported Hasher preset mode

#### Scenario: Mood is not transferred to Hasher
- **WHEN** the user hands a specific Theory mood to Hasher
- **THEN** the root/mode or validated chord context SHALL transfer but no hidden Hasher mood filter SHALL be created

### Requirement: Shared relationship model and strength communication
Circle of Fifths and Note Neural Network SHALL consume a deterministic relationship model that names relationship kind and ordinal strength for keys, relative modes, scale families, and relevant chords.

#### Scenario: Circle selection
- **WHEN** C or C Dorian is selected in Circle of Fifths
- **THEN** the view SHALL identify close fifths, relative relationships, modal relationships, and relevant chord/function information from the shared model

#### Scenario: Strong and weak cues
- **WHEN** relationships of different strength are rendered
- **THEN** strength SHALL be distinguished by semantic color plus line weight or pattern and SHALL be explained by a visible legend or text

#### Scenario: Non-color access
- **WHEN** a user cannot perceive relationship colors
- **THEN** labels, line style/weight, selected state, and accessible descriptions SHALL communicate the relationship kind and strength

#### Scenario: Deterministic results
- **WHEN** the same root, scale, mood, and relationship catalog are evaluated repeatedly
- **THEN** nodes, edges, strengths, labels, and explanations SHALL be identical

### Requirement: Circle-to-Improv handoff
Circle of Fifths SHALL expose an `Open Improv Insight` action for the current valid context and SHALL open the shared Improv Insight experience without changing instrument or timeline.

#### Scenario: Open from Circle
- **WHEN** the user selects a valid Circle context and activates `Open Improv Insight`
- **THEN** Improv Insight SHALL open with that context available and the current progression/instrument SHALL remain unchanged

#### Scenario: Keyboard return
- **WHEN** a keyboard user closes Improv Insight after opening it from Circle
- **THEN** focus SHALL return to the surviving Circle trigger

### Requirement: Legible interactive Note Neural Network
Note Neural Network SHALL render a stable Obsidian-like relationship graph with protected label space, bounded navigation controls, and an equivalent semantic list/detail interaction path.

#### Scenario: Readable selected area
- **WHEN** a node is selected
- **THEN** its label SHALL not be obscured by another node, edge, or center label and its details SHALL be available in the adjacent or following detail panel

#### Scenario: Long labels
- **WHEN** a scale or mode name exceeds a single-line node width
- **THEN** it SHALL wrap or truncate within a bounded two-line treatment while its full name remains available to assistive technology and through title/detail content

#### Scenario: Edge termination
- **WHEN** graph edges connect labeled nodes
- **THEN** each visible edge SHALL terminate at the node boundary and SHALL NOT run through the node label

#### Scenario: Stable clustered layout
- **WHEN** the same graph context renders repeatedly
- **THEN** node positions SHALL be stable, related nodes SHALL form understandable clusters, and no free-running simulation SHALL cause continuing layout drift

#### Scenario: Pointer graph controls
- **WHEN** a pointer user pans, zooms, resets, or selects a node
- **THEN** the bounded graph viewport SHALL update without causing document-level horizontal overflow

#### Scenario: Keyboard semantic path
- **WHEN** a keyboard or screen-reader user explores the network
- **THEN** every selectable graph node and its relationships SHALL be reachable through a logical list/tree and detail path without requiring spatial pointer navigation

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested
- **THEN** the graph SHALL render directly at deterministic final positions without animated settling

#### Scenario: Mobile containment
- **WHEN** the graph is viewed at 375px width
- **THEN** it SHALL use a bounded internal viewport and semantic details without forcing a fixed wide canvas or horizontal document scroll

### Requirement: Tune Toolbox localization and state continuity
All new Tune Toolbox labels, summaries, relationship explanations, actions, and accessibility text SHALL be localized in every supported locale and SHALL preserve compatible state when users move between Hasher, Tune Toolbox, and Fret Finder.

#### Scenario: Locale switch
- **WHEN** the user changes locale while Tune Toolbox is open
- **THEN** visible and assistive Theory text SHALL update while musical selections and disclosure state remain unchanged

#### Scenario: Workspace round trip
- **WHEN** the user configures Tune Toolbox, visits Hasher or Fret Finder, and returns
- **THEN** the shared root, scale, mood, selected node, and disclosure state SHALL remain available for the session
