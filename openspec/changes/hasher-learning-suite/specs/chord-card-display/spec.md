## MODIFIED Requirements

### Requirement: Active-chord playback indicator
When progression playback is active for Piano or Guitar, the chord card corresponding to the currently sounding chord SHALL be visually distinguished from inactive cards without replacing the independent Hanz-focus treatment.

#### Scenario: Active card during playback
- **WHEN** a Piano or Guitar chord card is the currently sounding chord during playback
- **THEN** its border SHALL be rendered with `--border-accent` (gold) AND a `box-shadow: var(--glow-accent)` SHALL be applied
- **AND** the card's wrapper SHALL carry `data-playing="true"` for automation hooks

#### Scenario: Inactive cards during playback
- **WHEN** a chord card is not the currently sounding chord
- **THEN** its border SHALL remain `--border-subtle` unless another explicit state applies and SHALL NOT carry the playback glow

#### Scenario: Simultaneous Hanz focus
- **WHEN** Hanz focus and playback target the same card
- **THEN** the gold playback treatment and the academy-blue Hanz marker/status SHALL both remain perceivable and semantically independent

#### Scenario: All cards inactive after playback ends
- **WHEN** playback ends, is stopped, or is invalidated by an instrument/timeline change
- **THEN** no chord card SHALL carry `data-playing="true"` or the playback glow

### Requirement: Play / Stop progression toggle
The application SHALL provide a `Play progression` toggle button for Piano and Guitar whenever at least one playable chord card is rendered.

#### Scenario: Play state
- **WHEN** playback is not active
- **THEN** the toggle SHALL display `Play progression` with the Play icon and aria-label `Play progression`

#### Scenario: Stop state
- **WHEN** playback is active
- **THEN** the toggle SHALL display `Stop` with the Square icon and aria-label `Stop playback`

#### Scenario: Piano start
- **WHEN** Piano is active and the user activates the toggle while not playing
- **THEN** playback SHALL start using the current voice-led piano progression at the application's playback BPM

#### Scenario: Guitar start
- **WHEN** Guitar is active and the user activates the toggle while not playing
- **THEN** playback SHALL start using the current selected diagram voicings and plucked-string timbre at the application's playback BPM

#### Scenario: Click during playback stops
- **WHEN** the user activates the toggle while playing
- **THEN** playback SHALL stop immediately and the active-chord indicator SHALL clear

#### Scenario: Toggle hidden without playable chords
- **WHEN** no playable chord card is rendered
- **THEN** the Play / Stop toggle SHALL NOT be rendered or SHALL be disabled with a truthful accessible explanation

## ADDED Requirements

### Requirement: Responsive piano performance grid
Piano chord cards SHALL use a responsive grid that preserves keyboard and control legibility while fitting multiple cards horizontally whenever the available width safely permits.

#### Scenario: Ordinary desktop density
- **WHEN** Piano renders at a representative desktop width of at least 1024px
- **THEN** at least two and normally three cards SHALL fit per row without clipping their keyboard or controls

#### Scenario: Wide desktop density
- **WHEN** four cards each satisfy the tested minimum readable card width
- **THEN** the grid MAY render four cards in one row without shrinking below that minimum

#### Scenario: Tablet density
- **WHEN** the viewport is between 768px and 1023px
- **THEN** Piano cards SHALL form a two-column grid when the content width permits

#### Scenario: Mobile density
- **WHEN** the viewport is 375px wide
- **THEN** cards SHALL form one contained column with no horizontal document overflow

### Requirement: Contained voicing comparison
Expanding Compare Voicings SHALL keep all comparison options and controls within the progression surface and the owning card/grid boundaries at desktop, tablet, and mobile widths.

#### Scenario: Card-contained comparison
- **WHEN** comparison expands inside a card with sufficient width
- **THEN** its keyboards, labels, and actions SHALL wrap within that card without covering or widening neighboring cards

#### Scenario: Grid-row comparison
- **WHEN** comparison requires more width than the owning grid column
- **THEN** it SHALL use a deliberately contained grid row whose maximum width is the progression surface rather than the viewport

#### Scenario: Comparison on mobile
- **WHEN** comparison is expanded at 375px width
- **THEN** every option SHALL remain readable and keyboard reachable using contained wrapping or internal scrolling without document overflow

#### Scenario: Collapse restoration
- **WHEN** a keyboard user closes Compare Voicings with Escape or its disclosure control
- **THEN** focus SHALL return to the comparison trigger and neighboring card layout SHALL return to its prior density

