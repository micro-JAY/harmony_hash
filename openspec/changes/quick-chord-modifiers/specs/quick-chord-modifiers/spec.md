## ADDED Requirements

### Requirement: Dictionary-backed chord alternatives
The system SHALL derive modifier options from existing chord-catalog entries with the same canonical root as the selected chord, and every offered option SHALL resolve through the shared chord lookup.

#### Scenario: Major triad quick alternatives
- **WHEN** the selected chord is `C`
- **THEN** the quick alternatives SHALL include `Cmaj7` and `C6` when those entries exist in the catalog

#### Scenario: Dominant alteration quick alternative
- **WHEN** the selected chord is `G7`
- **THEN** the quick alternatives SHALL include `G7#9` when that entry exists in the catalog

#### Scenario: Current chord excluded
- **WHEN** alternatives are derived for a selected chord
- **THEN** the currently selected catalog entry SHALL NOT be offered as a replacement

#### Scenario: Flat spelling preserved
- **WHEN** a chord is displayed with a flat root such as `Bb`
- **THEN** its alternative labels SHALL retain the `Bb` root spelling rather than switching to `A#`

#### Scenario: Slash bass preserved
- **WHEN** the selected chord is a true slash chord and the same bass remains a valid lookup for an alternative upper structure
- **THEN** the alternative SHALL retain the selected bass note

### Requirement: Fast per-card modifier interaction
Every rendered chord card SHALL provide a compact modifier control that reveals ranked quick alternatives and a searchable full same-root alternative set without changing the card until the user selects an option.

#### Scenario: Pointer quick change
- **WHEN** a user opens the modifier control on a `C` card and selects `Cmaj7`
- **THEN** that card SHALL immediately display and render `Cmaj7` and the modifier panel SHALL close

#### Scenario: Search full alternative set
- **WHEN** a user enters text in the modifier search field
- **THEN** the result list SHALL show only same-root catalog alternatives whose labels match the query

#### Scenario: Keyboard open and select
- **WHEN** a keyboard user focuses the modifier trigger, opens it, and activates an option
- **THEN** the same replacement SHALL occur without requiring pointer input

#### Scenario: Escape closes without mutation
- **WHEN** the modifier panel is open and the user presses Escape
- **THEN** the panel SHALL close, focus SHALL return to its trigger, and the progression SHALL remain unchanged

#### Scenario: Responsive containment
- **WHEN** the modifier control is used at 375px, tablet, or desktop widths
- **THEN** its controls and results SHALL remain readable and contained without horizontal document overflow

### Requirement: Local timeline replacement semantics
Applying a modifier SHALL replace only the selected chord through the application-owned timeline mutation path and SHALL preserve unrelated timeline content and compatible per-card state.

#### Scenario: Only selected index changes
- **WHEN** the second chord in a four-chord progression is modified
- **THEN** the first, third, and fourth chord symbols and per-card state SHALL remain unchanged

#### Scenario: Lock and guitar variant handling
- **WHEN** a locked guitar card is modified
- **THEN** the card SHALL remain locked and its variant SHALL be preserved when valid or clamped into the replacement's valid variation range

#### Scenario: Piano style compatibility
- **WHEN** a piano card is modified
- **THEN** its selected voicing style SHALL remain when applicable to the replacement and SHALL reset only that card to `Auto` when inapplicable

#### Scenario: Playback safety
- **WHEN** a modifier is applied during progression playback
- **THEN** playback SHALL stop and no stale active-playback indicator SHALL remain

#### Scenario: Stale text-agent result invalidated
- **WHEN** a modifier is applied while a text progression request is in flight
- **THEN** the later provider response SHALL NOT overwrite the locally modified timeline

### Requirement: Instrument-independent result
The modifier control SHALL update the shared chord model rather than an instrument-specific visualization so the chosen chord renders consistently in guitar and piano modes.

#### Scenario: Guitar replacement rendering
- **WHEN** a modifier is applied in Guitar mode
- **THEN** the selected card SHALL render the replacement's catalog-backed guitar diagram and variants

#### Scenario: Piano replacement rendering
- **WHEN** a modifier is applied in Piano mode
- **THEN** the selected card SHALL render notes and voicings computed from the same replacement catalog entry

#### Scenario: Instrument switch after replacement
- **WHEN** a user applies a modifier and then switches instruments
- **THEN** the replacement chord name and harmonic identity SHALL remain unchanged
