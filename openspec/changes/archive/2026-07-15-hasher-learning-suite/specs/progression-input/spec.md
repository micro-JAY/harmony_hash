## MODIFIED Requirements

### Requirement: Input mode switching
The system SHALL allow users to switch between Free Input and Progressions without losing either mode's state. Both modes SHALL share the same visible Browse Chords placement, leading harmony-context rail, compact prompt/direct-entry separator, and progression action availability. The Progressions mode SHALL host the natural-language Progression Agent as its primary prompt surface and preserve the preset browser as a secondary disclosure. Optional voice controls SHALL remain compact and SHALL NOT insert an expanded idle panel between active controls and chord output.

#### Scenario: Mode toggle
- **WHEN** the user switches from Free Input to Progressions or back
- **THEN** each mode's text, prompt feedback, and compatible context selection SHALL be preserved and the newly selected mode SHALL be displayed

#### Scenario: Shared leading controls
- **WHEN** either mode is active
- **THEN** Browse Chords SHALL appear immediately below the mode controls and the mode's Key/Mode context SHALL appear above its builder or chord-selection surface

#### Scenario: Progression Agent is the primary prompt surface
- **WHEN** the user opens Progressions
- **THEN** the agent's prompt textarea and `Build progression` button SHALL be visible by default before the compact centered `or` separator

#### Scenario: Preset browser preserved as fallback
- **WHEN** the user opens Progressions
- **THEN** the existing preset browser, supported key/mode selectors, subgroups, and minor blend help SHALL remain available as the direct-selection path after the separator

#### Scenario: Agent result overrides display
- **WHEN** the user submits an agent prompt and the Worker returns a valid progression
- **THEN** the chord cards SHALL display the agent's chords, replacing any previous result from Free Input or presets

#### Scenario: Preset selection overrides display
- **WHEN** the user selects a preset progression from the fallback section
- **THEN** the chord cards SHALL display the preset's chords, replacing any previous result from Free Input or the agent

#### Scenario: Superseded agent response is ignored
- **WHEN** an agent request remains in flight and the user switches to Free Input, selects a newer manual or preset result, reorders the timeline, or the Harmony Companion changes the timeline
- **THEN** the pending request SHALL be aborted where possible
- **AND** any late agent response SHALL NOT replace the newer chord cards

#### Scenario: Mode-only changes preserve agent feedback
- **WHEN** the user switches input modes or changes preset tonality without applying a newer progression
- **THEN** any completed agent rationale or retryable error SHALL remain available when Progressions is shown again

#### Scenario: Companion does not break reading order
- **WHEN** the companion is idle or unavailable in either input mode
- **THEN** only its compact action SHALL appear in the shared action rail before chord output

### Requirement: Free Input harmony context
The system SHALL provide independent Key and Mode selectors in Free Input above its chord-entry/browser surface and SHALL use that context for chord-grid and quick-modifier suggestions without changing Progressions-mode transposition state.

#### Scenario: Default context
- **WHEN** Free Input first renders
- **THEN** its harmony context SHALL be C major and SHALL be visible before the chord input

#### Scenario: Supported modes
- **WHEN** the user opens the Free Input Mode selector
- **THEN** Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Lydian, and Phrygian SHALL be available

#### Scenario: Tab state independence
- **WHEN** the user changes Free Input to D Dorian, changes Progressions to another key or mode, and returns to Free Input
- **THEN** D Dorian SHALL remain selected and Progressions SHALL retain its own selection

#### Scenario: Equal responsive controls
- **WHEN** Key, Mode, and other selected context parameters render together
- **THEN** they SHALL occupy one aligned row when space permits or equal-width responsive columns without irregular one-off sizing

### Requirement: Persistent Free Input chord browser
The system SHALL keep one visible, secondary-surface Browse Chords control directly below the Free Input/Progressions mode controls in both modes, including after chord cards render.

#### Scenario: Browser in both modes
- **WHEN** Free Input or Progressions is active
- **THEN** the same easy-to-spot Browse Chords control SHALL remain available in the shared leading position and SHALL not use the former low-contrast dark treatment

#### Scenario: Browser after Run
- **WHEN** the user submits a valid progression and chord cards render
- **THEN** Browse Chords SHALL remain in the shared leading position

#### Scenario: Explicit Free Input timeline update
- **WHEN** the user inserts a suggested chord from the browser while Free Input is active
- **THEN** the text input SHALL update and receive focus while the rendered timeline SHALL change only after the user submits Run

#### Scenario: Progressions insertion
- **WHEN** the user inserts a dictionary-valid chord from the browser while Progressions is active
- **THEN** it SHALL enter the visible direct-selection composer at the chosen insertion boundary without corrupting agent prompt or feedback state

## ADDED Requirements

### Requirement: Hasher prompt-or-direct hierarchy
Both Hasher modes SHALL visibly distinguish prompt-based progression generation from direct chord entry or selection with a compact centered localized `or` separator, and SHALL NOT render or consume a Hasher Mood Lens.

#### Scenario: Free Input hierarchy
- **WHEN** Free Input renders
- **THEN** any prompt/assistive generation surface and direct chord input/selection surface SHALL be separated by the centered `or` without a Hasher mood control

#### Scenario: Progressions hierarchy
- **WHEN** Progressions renders
- **THEN** the Progression Agent prompt and direct preset/composer path SHALL be separated by the centered `or` without a Hasher mood control

#### Scenario: No hidden mood filter
- **WHEN** a user previously selected a mood in another workspace or an older Hasher session
- **THEN** Hasher chord suggestions, agent prompts, preset results, and modifiers SHALL NOT silently filter by that value

#### Scenario: Compact separator
- **WHEN** the separator renders on desktop or 375px mobile
- **THEN** it SHALL remain centered, localized, visually distinct, and compact without reserving a card-sized gap

### Requirement: Shared progression actions
Share Progression and Improv Insight SHALL be reachable from the compact Hasher action rail in Free Input and Progressions for Piano and Guitar whenever their underlying action is valid.

#### Scenario: Free Input actions
- **WHEN** Free Input has a rendered progression
- **THEN** Share Progression and Improv Insight SHALL be available without switching to Progressions

#### Scenario: Progressions actions
- **WHEN** Progressions has a rendered progression
- **THEN** Share Progression and Improv Insight SHALL be available in the same action rail

#### Scenario: Instrument parity
- **WHEN** the user switches between Piano and Guitar
- **THEN** Share Progression and Improv Insight SHALL remain available and SHALL consume the same harmonic timeline while rendering instrument-appropriate content

#### Scenario: Insight containment
- **WHEN** Improv Insight expands
- **THEN** it SHALL remain within the Hasher workspace bounds and SHALL NOT cover or widen adjacent chord cards

### Requirement: Accessible timeline reordering and insertion
The direct-selection composer SHALL let users insert a chord at every timeline boundary and move existing chords by pointer drag/drop or equivalent keyboard actions while preserving one atomic application-owned timeline.

#### Scenario: Pointer insertion
- **WHEN** a pointer user drags a dictionary-valid chord to the boundary before, between, or after existing chords
- **THEN** a visible insertion indicator SHALL identify the target and the chord SHALL be inserted at that exact index

#### Scenario: Pointer reorder
- **WHEN** a pointer user drags an existing chord from index 3 to the boundary before index 1
- **THEN** the chord SHALL move to that position exactly once and the remaining relative order SHALL be preserved

#### Scenario: Keyboard reorder
- **WHEN** a keyboard user activates Move before or Move after for a selected timeline chord
- **THEN** the same atomic move SHALL occur, focus SHALL follow the moved item, and a polite live region SHALL announce its new position

#### Scenario: Boundary operation
- **WHEN** a move action would pass the beginning or end of the timeline
- **THEN** the unavailable action SHALL be disabled or leave the timeline unchanged with truthful semantics

#### Scenario: Parallel state preservation
- **WHEN** a chord moves
- **THEN** its stable identity, valid guitar variant, lock, piano style, and compatible card state SHALL move with it while playback and Hanz indexes remap or clear safely

#### Scenario: Mutation invalidates stale work
- **WHEN** insert or reorder commits while playback or an agent request is active
- **THEN** playback SHALL stop, stale highlights SHALL clear or remap, and a late agent response SHALL NOT overwrite the reordered timeline

#### Scenario: Mobile operation
- **WHEN** the composer renders at 375px width
- **THEN** insertion controls, drag handles, keyboard actions, and chord chips SHALL remain usable without horizontal document overflow

