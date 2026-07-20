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

### Requirement: Fluid interactive Note Neural Network
Note Neural Network SHALL render a true-black native-canvas relationship graph centered on the active scale, with lightweight force physics, protected labels, progressive expert-level relationship expansion, persistent user pins, actionable theory evidence, fluid desktop pointer navigation, deliberate context activation, and an equivalent semantic list/detail path. The adjacent desktop scale information and the information panel below the graph SHALL retain their current placement.

#### Scenario: High-DPI responsive canvas
- **WHEN** the desktop graph mounts or its parent size or device pixel ratio changes
- **THEN** one native canvas SHALL fill the measured graph area
- **AND** its backing resolution SHALL match the CSS size multiplied by the active device pixel ratio while drawing in CSS-pixel coordinates

#### Scenario: Force-directed settling
- **WHEN** a desktop graph context renders or changes without reduced motion
- **THEN** related nodes SHALL spread from the centered active scale through pairwise repulsion, edge springs, and gentle center gravity in a request-animation-frame loop
- **AND** velocity damping between `0.85` and `0.9` SHALL let the graph settle without perpetual visible jitter

#### Scenario: Centered active scale
- **WHEN** the desktop graph is not actively dragging its main node
- **THEN** the active scale SHALL occupy the exact world center while related scale/key and chord nodes settle around it

#### Scenario: Fluid node dragging
- **WHEN** a desktop pointer user drags any graph node
- **THEN** that node SHALL follow the world-space pointer with zero drag velocity while all other nodes continue responding through live forces
- **AND** release SHALL return an unpinned node to normal physics while a pinned node SHALL remain at its released coordinates
- **AND** the active context scale SHALL restore its separate center anchor

#### Scenario: Empty-canvas pan and cursor zoom
- **WHEN** a desktop pointer user drags empty canvas space or wheels over the graph
- **THEN** the camera SHALL pan or zoom smoothly without moving simulation coordinates
- **AND** wheel zoom SHALL preserve the world point under the cursor and SHALL NOT scroll the document

#### Scenario: Hover neighborhood emphasis
- **WHEN** a desktop pointer hovers a node
- **THEN** that node plus its first-degree edges and neighbors SHALL brighten
- **AND** unrelated nodes and edges SHALL dim without disappearing or changing selected details

#### Scenario: Connection-weighted circular nodes
- **WHEN** the desktop graph draws nodes
- **THEN** they SHALL be filled circles with Tonari/Harmony token colors, bounded glow, and radius based on connection count
- **AND** edges SHALL render behind nodes and labels

#### Scenario: Scale inspection, expansion, and centering
- **WHEN** a user single-clicks a related scale/key node
- **THEN** an explicit Selected Scale detail SHALL display without changing the shared Root or Scale/Mode
- **AND WHEN** the user double-clicks that node or activates `Expand connections`
- **THEN** its bounded related scale, chord, note, and interval neighborhood SHALL append without removing the existing graph or changing the shared context
- **AND WHEN** the user activates `Make center`
- **THEN** that scale SHALL become the centered shared context and prior exploration branches SHALL clear deliberately

#### Scenario: Chord inspection and expansion
- **WHEN** a user clicks a related chord node
- **THEN** the detail panel SHALL identify it as the selected Chord and show tones, roles, function, compatible scale fits, shared-tone evidence, and available resolution targets
- **AND WHEN** the user double-clicks it or activates `Expand connections`
- **THEN** its bounded note, scale, and chord neighborhood SHALL append while the active graph center and shared Root/Scale remain unchanged

#### Scenario: Unsupported chord spelling remains inspection-only
- **WHEN** a seed chord symbol such as `B#dim` cannot resolve through the shared chord dictionary
- **THEN** the node SHALL remain available for inspection but SHALL NOT expose `Expand connections`
- **AND** attempting to expand that node programmatically SHALL leave the exploration state unchanged

#### Scenario: Progressive graph reconciliation
- **WHEN** a user expands a node in an existing exploration
- **THEN** all retained node and edge IDs SHALL remain present with their current positions, camera, inspection, and pin state
- **AND** only new nodes SHALL seed near the expanded parent
- **AND** repeating the same expansion SHALL be idempotent

#### Scenario: Branch cleanup
- **WHEN** a user activates Collapse branch or Clear exploration
- **THEN** only no-longer-shared descendants or all added exploration nodes respectively SHALL be removed
- **AND** the centered seed catalog SHALL remain available

#### Scenario: Long-press pinning
- **WHEN** a pointer remains on a non-center node for at least 550ms without crossing the drag threshold
- **THEN** the node SHALL toggle pinned state with a visible non-color pin cue and live announcement
- **AND** dragging a pinned node SHALL update its fixed position while the rest of the physics graph reacts
- **AND** pointer movement or cancellation before the threshold SHALL NOT toggle the pin

#### Scenario: Accessible pin operation
- **WHEN** a keyboard or screen-reader user inspects a pinnable node
- **THEN** an explicit Pin node or Unpin node action SHALL provide the same behavior without requiring a long press

#### Scenario: Actionable relationship evidence
- **WHEN** any node is selected
- **THEN** every listed relationship SHALL name the connected concept and concrete evidence such as shared notes, changed tones, scale-degree role, tone-fit count, common-tone voice leading, or resolution target
- **AND** the panel SHALL NOT repeat only generic relationship kind and strength rows

#### Scenario: Distinct node kinds and states
- **WHEN** scale, chord, note, and interval nodes render
- **THEN** type-specific glyphs/shapes and visible labels SHALL distinguish them without relying only on color
- **AND** context, inspected, expanded, and pinned states SHALL remain mutually perceivable

#### Scenario: Accurate relationship strength and direction
- **WHEN** Strong, Medium, Weak, or outbound edges render
- **THEN** Strong SHALL be bright heavy solid, Medium SHALL be visibly thinner solid, Weak SHALL be thin long-dash, and outbound SHALL include an arrowhead
- **AND** the visible legend SHALL use the exact rendered stroke treatments

#### Scenario: Network help
- **WHEN** the user opens the Note Neural Network `?` help action
- **THEN** a localized accessible dialog SHALL explain node kinds, inspect/expand/center/clear, drag/pin/unpin, pan/zoom, strength/direction, Relative versus Parallel, and mobile limitations
- **AND** Escape, backdrop, or Close SHALL restore focus to the help trigger

#### Scenario: Long labels
- **WHEN** a scale or mode name exceeds a single-line node width
- **THEN** it SHALL wrap or truncate within a bounded two-line treatment while its full name remains available to assistive technology and through title/detail content

#### Scenario: Edge termination and layering
- **WHEN** graph edges connect labeled nodes
- **THEN** each visible edge SHALL render behind nodes, terminate at circular node boundaries, and SHALL NOT visually obscure a node label

#### Scenario: Bounded settled layout
- **WHEN** the same graph context reaches its low-energy threshold
- **THEN** the active scale SHALL remain centered, all nodes SHALL remain within the world bounds, and the solver SHALL sleep until an interaction, resize, or context change wakes it

#### Scenario: Pointer graph controls
- **WHEN** a desktop pointer user pans, zooms, resets, inspects, drags, hovers, or double-clicks a scale node
- **THEN** the bounded graph viewport SHALL update without causing document-level horizontal overflow

#### Scenario: Keyboard semantic path
- **WHEN** a keyboard or screen-reader user explores the network
- **THEN** every catalog node and relationship SHALL remain reachable through a logical list/detail path without requiring spatial pointer navigation
- **AND** Inspect, Expand, Make center, Collapse, Pin/Unpin, and Clear actions SHALL be operable with explicit accessible names

#### Scenario: Reduced motion
- **WHEN** reduced motion is requested on desktop
- **THEN** the graph SHALL advance to a deterministic settled state without visible animated travel while retaining inspection, camera, and semantic-list operation

#### Scenario: Static mobile graph
- **WHEN** the graph is viewed at 375px width
- **THEN** it SHALL render a bounded static projection with one centered active scale, up to six related scale/key nodes, and up to four representative chord nodes
- **AND** it SHALL not mount the desktop canvas or physics loop
- **AND** it SHALL omit graph pan, zoom, reset, drag, long-press, double-click, and animated behavior while retaining the full semantic list/detail and explicit expansion/pin-information path below
