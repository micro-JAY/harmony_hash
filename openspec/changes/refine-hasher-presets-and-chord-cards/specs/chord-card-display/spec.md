## ADDED Requirements

### Requirement: Chord-family card title
Every Guitar and Piano chord card SHALL apply the shared chord-family palette to its visible chord-name heading without replacing playback, Hanz-focus, lock, or match-score semantics.

#### Scenario: Family title mapping
- **WHEN** Major, Minor, Dominant, Suspended, Diminished, or Augmented chord cards render
- **THEN** Major, Minor, Suspended, Diminished, and Augmented titles SHALL use pastel green, pastel orange, light yellow, soft pink, or white respectively
- **AND** Dominant titles SHALL use a deep-red filled label with contrast-safe foreground text

#### Scenario: State independence
- **WHEN** a family-colored chord card is playing, locked, or focused by Hanz
- **THEN** the chord title SHALL retain its family identity and the independent state border, marker, and accessible status SHALL remain perceivable

#### Scenario: Non-color identity
- **WHEN** a user cannot perceive the family color
- **THEN** the full chord symbol and existing semantic chord data SHALL still identify the chord without relying on color alone

## MODIFIED Requirements

### Requirement: Piano voicing-style selector
Every piano chord card SHALL render a compact style selector above the keyboard containing `Auto` plus only the explicit voicing styles applicable to that chord. The active style SHALL be visually and semantically distinguished; unavailable styles SHALL be omitted and SHALL reserve no layout space.

#### Scenario: Default style is Auto
- **WHEN** a chord card first renders in piano mode
- **THEN** the active style SHALL be `Auto`

#### Scenario: Selecting an applicable style re-voices the keyboard
- **WHEN** the user activates `Spread` on a Cmaj7 card
- **THEN** the keyboard SHALL re-render with the spread voicing C3, E4, G4, B4
- **AND** the voicing-type pill below the keyboard SHALL show `Spread`

#### Scenario: Non-applicable styles are absent
- **WHEN** a chord's note set cannot support a voicing style
- **THEN** that style SHALL NOT be rendered in the selector and SHALL NOT leave a disabled placeholder or empty slot

#### Scenario: Selector remains compact
- **WHEN** the applicable styles do not fit on one line
- **THEN** the visible styles SHALL wrap in centered partial rows within a bounded selector area without fixed empty grid tracks or a fixed unused second-row height
- **AND** sibling equality SHALL remain owned by the shared card-grid contract rather than placeholder selector space

#### Scenario: Style selector hidden in guitar mode
- **WHEN** the instrument is set to Guitar
- **THEN** the piano style selector SHALL NOT be rendered

### Requirement: Responsive piano performance grid
Piano chord cards SHALL use a responsive grid and equal card-size contract that preserve keyboard and control legibility while fitting multiple cards horizontally whenever the available width safely permits. Each primary card SHALL show the complete C3–B5 keyboard range and every active voicing note without horizontal scrolling or clipping.

#### Scenario: Ordinary desktop density
- **WHEN** Piano renders at a representative desktop width of at least 1024px
- **THEN** at least two and normally three cards SHALL fit per row without clipping their keyboard or controls

#### Scenario: Wide desktop density
- **WHEN** four cards each satisfy the tested minimum readable card width
- **THEN** the grid MAY render four cards in one row without shrinking below that minimum

#### Scenario: Wide voicing visibility
- **WHEN** a chord's active notes span distant keys within C3–B5
- **THEN** the piano renderer SHALL proportionally narrow individual keys inside the unchanged keyboard surface so every active key remains visible

#### Scenario: Equal card bounds
- **WHEN** a progression contains chords with different applicable style counts or voicing spans
- **THEN** sibling piano cards in the same grid row SHALL retain the tested equal-size alignment rather than expanding for unavailable controls

#### Scenario: Tablet density
- **WHEN** the viewport is between 768px and 1023px
- **THEN** Piano cards SHALL form a two-column grid when the content width permits and each full keyboard SHALL remain visible

#### Scenario: Mobile density
- **WHEN** the viewport is 375px wide
- **THEN** cards SHALL form one contained column, every active key SHALL remain visible, and the document SHALL have no horizontal overflow

### Requirement: Contained voicing comparison
Activating Compare Voicings SHALL open an accessible modal dialog containing every applicable comparison option. The modal SHALL keep keyboards, labels, and actions inside its viewport-bounded surface at desktop, tablet, and mobile widths without changing sibling chord-card geometry.

#### Scenario: Dialog inventory
- **WHEN** a user opens Compare Voicings
- **THEN** one option SHALL render for each applicable voicing style and no unavailable style SHALL appear

#### Scenario: Selection closes dialog
- **WHEN** the user selects a comparison option
- **THEN** the selected style SHALL update the owning card, the dialog SHALL close, and focus SHALL return to the comparison trigger

#### Scenario: Comparison on mobile
- **WHEN** the dialog opens at 375px width
- **THEN** every option SHALL remain readable and keyboard reachable using contained wrapping or dialog-body scrolling without document overflow

#### Scenario: Escape closes without mutation
- **WHEN** a keyboard user presses Escape without selecting a comparison
- **THEN** the dialog SHALL close, the current style SHALL remain unchanged, focus SHALL return to the trigger, and neighboring cards SHALL not reflow

#### Scenario: Backdrop dismissal closes without mutation
- **WHEN** a pointer user dismisses the comparison through its backdrop without selecting a style
- **THEN** the current style and neighboring card geometry SHALL remain unchanged
- **AND** focus SHALL return to the comparison trigger

## REMOVED Requirements

### Requirement: Piano display mode toggle
**Reason**: Piano label-mode controls add misaligned card chrome and are explicitly removed from the HASHER card design; Piano uses the standard note-aware keyboard rendering instead.

**Migration**: Remove the Piano `Notes`/`Fingering` selector and render the primary and comparison keyboards with the existing standard note presentation and accessible voicing labels. Guitar retains its separate three-way display control.
