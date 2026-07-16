## ADDED Requirements

### Requirement: Unified HASHER input flow
HASHER SHALL render one shared progression flow without Free Input or Progressions tabs. Below the shared Key and Mode controls, the reading order SHALL be `Choose from a preset`, a centered localized `or`, `Describe a progression or mood`, a centered localized `or`, `Build your own`, and the persistent Browse Chords control.

#### Scenario: No legacy input tabs
- **WHEN** HASHER renders
- **THEN** Free Input and Progressions tab controls SHALL NOT be present
- **AND** presets, agent prompt, composer, and chord browser SHALL be reachable in one continuous flow

#### Scenario: One shared harmony context
- **WHEN** a user changes Key or Mode
- **THEN** preset transposition, chord suggestions, modifiers, and supported analysis SHALL use that same visible context

#### Scenario: One shared timeline
- **WHEN** a preset, agent result, composer Run, chord-grid insertion, modifier, or Hanz mutation is applied
- **THEN** the result SHALL update the same application-owned timeline and SHALL preserve or invalidate parallel state according to the existing timeline transaction rules

#### Scenario: Shared action rail
- **WHEN** a valid progression is rendered in Guitar or Piano
- **THEN** Randomize, Play/Stop, Share, and Improv Insight SHALL remain available in the same compact action rail

#### Scenario: Responsive reading order
- **WHEN** the unified flow renders at 375px
- **THEN** all sections SHALL retain the specified order and remain usable without horizontal document overflow

## MODIFIED Requirements

### Requirement: Free-text chord input
The system SHALL provide one inline chord input inside the Build Your Own chip composer. Submitting one dictionary-valid chord with Enter SHALL create a new chip at the end, and Run SHALL commit the staged chip order to the rendered timeline.

#### Scenario: Enter creates a chip
- **WHEN** the user types `Cmaj7` in the composer input and presses Enter
- **THEN** a `Cmaj7` chip SHALL appear at the right edge of the composer and the text input SHALL clear

#### Scenario: Invalid chord remains editable
- **WHEN** the user submits a symbol that does not resolve through the dictionary
- **THEN** no chip SHALL be created, the input SHALL remain available for correction, and a localized error SHALL be announced

#### Scenario: Chord-grid click appends
- **WHEN** the user activates `Dm7` in Browse Chords without choosing another insertion position
- **THEN** a `Dm7` chip SHALL be appended to the right of the current staged chips

#### Scenario: Run commits staged chips
- **WHEN** the user activates Run after staging valid chips
- **THEN** chord cards SHALL render in the exact staged order and parse errors SHALL be reported without inventing dictionary entries

#### Scenario: Empty Backspace removes the trailing chip
- **WHEN** the composer input is empty and the user presses Backspace with at least one staged chip
- **THEN** the final chip SHALL be removed using the same removal transaction and announcement as its visible `X`

### Requirement: Preset progression picker
The system SHALL render four centered preset category buttons—Major, Minor, Modal, and Advanced—inside one bordered preset surface. Activating a category SHALL open an accessible modal containing every subgroup and progression in that category.

#### Scenario: Four centered categories
- **WHEN** the preset surface renders
- **THEN** exactly four category buttons SHALL be centered within its border and no inline progression carousel SHALL be shown

#### Scenario: Major dialog completeness
- **WHEN** the user opens Major
- **THEN** the dialog SHALL show all 3 Major subgroups and all 23 Major progressions

#### Scenario: Minor dialog completeness
- **WHEN** the user opens Minor
- **THEN** the dialog SHALL show all 4 Minor subgroups and all 21 Minor progressions

#### Scenario: Modal dialog completeness
- **WHEN** the user opens Modal
- **THEN** the dialog SHALL show all 5 Modal subgroups and all 13 Modal progressions

#### Scenario: Advanced dialog completeness
- **WHEN** the user opens Advanced
- **THEN** the dialog SHALL show the Chromatic and Secondary Dominant subgroup and all 5 Advanced progressions

#### Scenario: Preset selection closes and applies
- **WHEN** the user selects any progression in a category dialog
- **THEN** the dialog SHALL close, that progression SHALL be transposed through the active Key and Mode context, and its dictionary-valid chords SHALL replace the rendered timeline

#### Scenario: Dialog dismissal preserves timeline
- **WHEN** the user closes a preset dialog with Escape, outside click, or its close action without choosing a progression
- **THEN** the timeline SHALL remain unchanged and focus SHALL return to the category button that opened it

### Requirement: Responsive input controls
The unified HASHER context, preset buttons/dialog, Progression Agent row, composer, and chord-browser controls SHALL reflow without horizontal document overflow at mobile widths.

#### Scenario: Unified controls on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** Key/Mode, preset categories, prompt controls, composer controls, and Run actions SHALL stack or size fluidly with usable touch targets

#### Scenario: Preset dialog on mobile
- **WHEN** any preset dialog opens at 375px
- **THEN** its subgroup headings and all progression buttons SHALL remain readable through contained dialog-body scrolling without horizontal document overflow

#### Scenario: No horizontal overflow
- **WHEN** HASHER is viewed at 375px with Browse Chords, a preset dialog, or staged composer chips
- **THEN** `document.scrollWidth` SHALL NOT exceed `window.innerWidth`

### Requirement: Accessible timeline reordering and insertion
The Build Your Own composer SHALL let users append and insert chords, reorder existing chips, and remove selected chips while preserving one atomic application-owned timeline. Persistent drag handles, move arrows, insertion `+` buttons, and always-visible removal controls SHALL NOT be rendered.

#### Scenario: Pointer insertion
- **WHEN** a pointer user drags a dictionary-valid chord to the boundary before, between, or after existing chips
- **THEN** a temporary insertion indicator SHALL identify the target and the chord SHALL be inserted at that exact index

#### Scenario: Pointer reorder
- **WHEN** a pointer user drags an existing chord from index 3 to the boundary before index 1 and drops inside the composer
- **THEN** the chord SHALL move to that position exactly once and the remaining relative order SHALL be preserved

#### Scenario: Selected removal action
- **WHEN** a user focuses or selects a chord chip
- **THEN** a compact `X` SHALL appear for that chip and activating it SHALL remove exactly that chord

#### Scenario: Drag-out removal
- **WHEN** a pointer user drags an existing chip onto the active outside removal target and releases it
- **THEN** that chord SHALL be removed exactly once and a polite live region SHALL announce the removal

#### Scenario: Cancelled drag is safe
- **WHEN** a drag is cancelled with Escape or ends without a valid inside or removal-target drop
- **THEN** the chord order and membership SHALL remain unchanged

#### Scenario: Keyboard reorder and removal
- **WHEN** a focused chip receives Alt+Left, Alt+Right, Delete, or Backspace
- **THEN** the same atomic move or removal SHALL occur, focus SHALL move to the surviving logical chip, and a polite live region SHALL announce the result

#### Scenario: Boundary operation
- **WHEN** a keyboard move would pass the beginning or end of the timeline
- **THEN** the operation SHALL leave the timeline unchanged with truthful semantics

#### Scenario: Parallel state preservation
- **WHEN** a chord moves
- **THEN** its stable identity, valid guitar variant, lock, piano style, and compatible card state SHALL move with it while playback and Hanz indexes remap or clear safely

#### Scenario: Mutation invalidates stale work
- **WHEN** insert, reorder, or removal commits while playback or an agent request is active
- **THEN** playback SHALL stop, stale highlights SHALL clear or remap, and a late agent response SHALL NOT overwrite the newer timeline

#### Scenario: Mobile operation
- **WHEN** the composer renders at 375px width
- **THEN** chips, selected `X`, input, drag targets, and keyboard actions SHALL remain usable without horizontal document overflow

### Requirement: Key and next-chord overlay modes
The chord browser SHALL provide Off, Key, and Next suggestion modes and SHALL score each visible chord cell from the unified HASHER Key, Mode, and staged composer context rather than only its root row.

#### Scenario: Off mode
- **WHEN** Off is selected
- **THEN** the grid SHALL preserve its root-row colors, chord-family quality headers, and interactions without fit badges or fit styling

#### Scenario: Key mode
- **WHEN** Key is selected
- **THEN** each visible chord cell SHALL display its key-fit percentage and matching fit-tier styling for the selected HASHER Key and Mode

#### Scenario: Next mode after input
- **WHEN** Next is selected and the composer contains at least one dictionary-valid chord
- **THEN** every visible chord cell SHALL be ranked relative to the final valid staged chord and the selected Key and Mode

#### Scenario: Invalid trailing input
- **WHEN** the composer text field contains an invalid uncommitted symbol after valid chips
- **THEN** Next mode SHALL retain the final valid chip as its transition anchor while the composer continues to report the invalid symbol normally

## REMOVED Requirements

### Requirement: Input mode switching
**Reason**: The separate Free Input and Progressions tabs are removed in favor of one unified HASHER flow.

**Migration**: Preserve the existing stateful surfaces in one reading order: shared Key/Mode, preset category dialogs, agent prompt, chip composer, and Browse Chords.

### Requirement: Free Input harmony context
**Reason**: Harmony context is no longer owned by a separate Free Input tab.

**Migration**: Use the single visible HASHER Key and Mode controls for presets, suggestions, modifiers, agent-supported context, and direct composition.

### Requirement: Persistent Free Input chord browser
**Reason**: Browse Chords is no longer conditional on a Free Input tab.

**Migration**: Keep one persistent Browse Chords control after Build Your Own in the unified flow.

### Requirement: Hasher prompt-or-direct hierarchy
**Reason**: The old requirement defines two tab-specific hierarchies that no longer exist.

**Migration**: Use the Unified HASHER input flow requirement's preset → or → describe → or → build ordering without a HASHER Mood Lens.

### Requirement: Shared progression actions
**Reason**: Progression actions no longer need parity between two removed input tabs.

**Migration**: Keep Randomize, Play/Stop, Share, and Improv Insight in one unified action rail whenever the shared timeline makes each action valid.
