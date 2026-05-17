## MODIFIED Requirements

### Requirement: Piano voicing-style selector
Every piano chord card SHALL render a style toggle row above the keyboard with seven options: Auto, Drop 2, Drop 3, Rootless, Shell, Spread, Two-Hand. The active style SHALL be visually distinguished; styles not applicable to the chord SHALL be rendered disabled.

#### Scenario: Default style is Auto
- **WHEN** a chord card first renders in piano mode
- **THEN** the active style SHALL be "Auto"

#### Scenario: Selecting an applicable style re-voices the keyboard
- **WHEN** the user clicks "Spread" on a Cmaj7 card
- **THEN** the keyboard SHALL re-render with the spread voicing (C3, E4, G4, B4)
- **AND** the voicing-type pill below the keyboard SHALL show "Spread"

#### Scenario: Non-applicable styles are disabled
- **WHEN** a chord has only 1-2 notes (empty / single note edge cases)
- **THEN** every explicit style button SHALL be rendered disabled
- **AND** only "Auto" SHALL remain interactive
- **WHEN** a chord is a triad (3 notes)
- **THEN** "Drop 2", "Drop 3", "Rootless", and "Shell" SHALL be rendered disabled
- **AND** "Auto", "Spread", and "Two-Hand" SHALL be interactive

#### Scenario: Toggle row wraps on narrow widths
- **WHEN** the card's available width can't fit seven pills on one line
- **THEN** the toggle row SHALL wrap to a second line cleanly via `flex flex-wrap`

#### Scenario: Style toggle hidden in guitar mode
- **WHEN** the instrument is set to "Guitar"
- **THEN** the piano style toggle SHALL NOT be rendered
