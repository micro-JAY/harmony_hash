## ADDED Requirements

### Requirement: Metered Scale Synthesia arpeggio practice
Scale Synthesia SHALL offer Triad, Seventh, Sixth, Sus2, and Sus4 arpeggio patterns and SHALL schedule each pattern at selectable `1/16`, `1/8`, `1/4`, `1/2`, and whole-note lengths against an internal 120 BPM, 4/4 clock. Tempo and time signature SHALL NOT be shown or editable.

#### Scenario: Arpeggio inventory
- **WHEN** Arpeggio material is active for a compatible scale
- **THEN** the arpeggio selector SHALL offer Triad (`1 3 5`), Seventh (`1 3 5 7`), Sixth (`1 3 5 6`), Sus2 (`1 2 5`), and Sus4 (`1 4 5`)

#### Scenario: Note-length inventory
- **WHEN** Arpeggio material is active
- **THEN** a Note length selector SHALL offer `1/16`, `1/8`, `1/4`, `1/2`, and `1`
- **AND** no tempo or time-signature control or readout SHALL render

#### Scenario: Locked musical timing
- **WHEN** an arpeggio is played at 120 BPM
- **THEN** successive onsets for `1/16`, `1/8`, `1/4`, `1/2`, and `1` SHALL be separated by `0.125s`, `0.25s`, `0.5s`, `1s`, and `2s` respectively

#### Scenario: Material-neutral transport
- **WHEN** Scale or Arpeggio material is ready to play
- **THEN** the visible transport SHALL read `PLAY` with the existing play symbol
- **AND** it SHALL read `STOP` while playback is active

#### Scenario: Collapse cleanup
- **WHEN** Scale Synthesia collapses during any note length
- **THEN** playback and its visible cursor SHALL stop immediately

### Requirement: Concise expanded-only Toolbox actions
Circle of Fifths and Scale Synthesia SHALL expose their handoff actions only inside their expanded content, using the concise labels `HASH it` and `IMPROV INSIGHT`.

#### Scenario: Collapsed tools
- **WHEN** Circle of Fifths or Scale Synthesia is collapsed
- **THEN** its header SHALL NOT render a HASHER or IMPROV handoff action

#### Scenario: Expanded Scale Synthesia
- **WHEN** Scale Synthesia is expanded
- **THEN** exactly one `HASH it` action SHALL be present in its expanded controls

#### Scenario: Expanded Circle of Fifths
- **WHEN** Circle of Fifths is expanded
- **THEN** exactly one `HASH it` action and exactly one `IMPROV INSIGHT` action SHALL be present inside the expanded tool

## MODIFIED Requirements

### Requirement: Unified collapsible Tune Toolbox workspace
The application SHALL present Circle of Fifths, Scale Synthesia, and Note Neural Network as three named, collapsible tools within one top-level `Tune Toolbox` workspace rather than separate top-level workspaces. The familiar `Circle of Fifths` tool name SHALL remain unchanged inside the toolbox.

#### Scenario: Tune Toolbox opens
- **WHEN** the user activates Tune Toolbox in the application header
- **THEN** all three tool headers SHALL be present in one document and at least the default primary tool SHALL be expanded

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
- **THEN** shared controls and all tool headers/bodies SHALL remain within the document width and expanded tools SHALL stack in reading order

### Requirement: Scale-to-Hasher handoff
Scale Synthesia SHALL provide a visible `HASH it` action inside its expanded content that transfers the selected root and an honest compatible context into Hasher without fabricating unsupported preset behavior.

#### Scenario: Supported scale handoff
- **WHEN** the selected scale maps to Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Lydian, or Phrygian and the user activates `HASH it`
- **THEN** Hasher SHALL open with the same root and supported mode selected and focus SHALL move to the Hasher context or primary input

#### Scenario: Unsupported formula handoff
- **WHEN** the selected Scale Synthesia formula has no corresponding Hasher preset scale type
- **THEN** the handoff SHALL preserve the selected root and a truthful validated free-input/context suggestion
- **AND** SHALL NOT label or transpose that formula as a supported Hasher preset mode

#### Scenario: Mood is not transferred to Hasher
- **WHEN** the user hands a specific Theory mood to Hasher
- **THEN** the root/mode or validated chord context SHALL transfer but no hidden Hasher mood filter SHALL be created

### Requirement: Circle-to-Improv handoff
Circle of Fifths SHALL expose an `IMPROV INSIGHT` action inside its expanded content for the current valid context and SHALL open the shared Improv Insight experience without changing instrument or timeline.

#### Scenario: Open from Circle
- **WHEN** the user selects a valid Circle context and activates `IMPROV INSIGHT`
- **THEN** Improv Insight SHALL open with that context available and the current progression/instrument SHALL remain unchanged

#### Scenario: Keyboard return
- **WHEN** a keyboard user closes Improv Insight after opening it from Circle
- **THEN** focus SHALL return to the surviving Circle trigger

### Requirement: Legible interactive Note Neural Network
Note Neural Network SHALL render a true-black, deterministic relationship graph centered on the active scale, with protected label space, bounded desktop navigation, deliberate scale activation, chord-only inspection, and an equivalent semantic list/detail path. The adjacent desktop scale information and the information panel below the graph SHALL retain their current placement.

#### Scenario: Centered active scale
- **WHEN** a desktop graph context renders or changes
- **THEN** the active scale SHALL occupy the exact visual center and related scale/key and chord nodes SHALL radiate outward on stable rings

#### Scenario: Animated radial entry
- **WHEN** a desktop context changes without reduced motion
- **THEN** related nodes and connectors SHALL animate outward from the center once and SHALL stop at deterministic final positions

#### Scenario: Scale inspection versus activation
- **WHEN** a user single-clicks a related scale/key node
- **THEN** its details SHALL display without changing the shared Root or Scale/Mode
- **AND WHEN** the user double-clicks that node or activates its semantic-list keyboard equivalent
- **THEN** it SHALL become the centered active scale and its related scales/chords SHALL repopulate

#### Scenario: Chord inspection only
- **WHEN** a user clicks a related chord node
- **THEN** the existing detail panel SHALL show that chord's label, function, and relationships
- **AND** the active graph center and shared Root/Scale SHALL remain unchanged

#### Scenario: Long labels
- **WHEN** a scale or mode name exceeds a single-line node width
- **THEN** it SHALL wrap or truncate within a bounded two-line treatment while its full name remains available to assistive technology and through title/detail content

#### Scenario: Edge termination and layering
- **WHEN** graph edges connect labeled nodes
- **THEN** each visible edge SHALL render behind nodes, terminate at node boundaries, and SHALL NOT run through a node label

#### Scenario: Stable radial layout
- **WHEN** the same graph context renders repeatedly
- **THEN** node positions SHALL be stable, the active scale SHALL remain centered, and no free-running simulation SHALL cause continuing layout drift

#### Scenario: Pointer graph controls
- **WHEN** a desktop pointer user pans, zooms, resets, inspects, or double-clicks a scale node
- **THEN** the bounded graph viewport SHALL update without causing document-level horizontal overflow

#### Scenario: Keyboard semantic path
- **WHEN** a keyboard or screen-reader user explores the network
- **THEN** every catalog node and relationship SHALL remain reachable through a logical list/detail path without requiring spatial pointer navigation
- **AND** Enter on a scale/key list item SHALL provide the deliberate centering equivalent to graph double click

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested on desktop
- **THEN** the graph SHALL render directly at deterministic final positions without animated settling

#### Scenario: Static mobile graph
- **WHEN** the graph is viewed at 375px width
- **THEN** it SHALL render a bounded static projection with one centered active scale, up to six related scale/key nodes, and up to four representative chord nodes
- **AND** it SHALL omit graph pan, zoom, reset, drag, double-click, and animated-entry behavior while retaining the full semantic list/detail path below

