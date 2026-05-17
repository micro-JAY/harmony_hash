## ADDED Requirements

### Requirement: Active-chord playback indicator
When piano playback is active, the chord card corresponding to the currently-sounding chord SHALL be visually distinguished from inactive cards.

#### Scenario: Active card during playback
- **WHEN** a chord card is the currently-sounding chord during playback
- **THEN** its border SHALL be rendered with `--border-accent` (gold) AND a `box-shadow: var(--glow-accent)` SHALL be applied
- **AND** the card's wrapper SHALL carry `data-playing="true"` for automation hooks

#### Scenario: Inactive cards during playback
- **WHEN** a chord card is not the currently-sounding chord
- **THEN** its border SHALL remain `--border-subtle` and SHALL NOT carry the glow box-shadow

#### Scenario: All cards inactive after playback ends
- **WHEN** playback ends or is stopped
- **THEN** no chord card SHALL carry `data-playing="true"` or the playback glow

### Requirement: Play / Stop progression toggle
The application SHALL provide a "Play progression" toggle button visible only when the instrument is Piano and at least one chord card is rendered.

#### Scenario: Play state
- **WHEN** playback is not active
- **THEN** the toggle SHALL display "Play progression" with the Play icon and aria-label "Play progression"

#### Scenario: Stop state
- **WHEN** playback is active
- **THEN** the toggle SHALL display "Stop" with the Square icon and aria-label "Stop playback"

#### Scenario: Click toggles
- **WHEN** the user clicks the toggle while not playing
- **THEN** playback SHALL start using the current voice-led progression at the application's playback BPM

#### Scenario: Click during playback stops
- **WHEN** the user clicks the toggle while playing
- **THEN** playback SHALL stop immediately and the active-chord indicator SHALL clear

#### Scenario: Toggle hidden in guitar mode
- **WHEN** the instrument is set to Guitar
- **THEN** the Play / Stop toggle SHALL NOT be rendered
