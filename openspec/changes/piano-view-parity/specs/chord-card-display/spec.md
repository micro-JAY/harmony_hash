## MODIFIED Requirements

### Requirement: Guitar chord card rendering
The system SHALL display guitar chord cards by rendering the corresponding SVG image from the asset library, with variant controls that remain interactive after randomization and a lock toggle per card.

#### Scenario: Default variant displayed
- **WHEN** a guitar chord card is rendered for a chord with Variation Count >= 1
- **THEN** the system SHALL display var_1.svg by default

#### Scenario: Variant cycling with arrows
- **WHEN** a chord has Variation Count > 1
- **THEN** the card SHALL display prev/next arrows that cycle through var_1.svg to var_N.svg, wrapping around at boundaries

#### Scenario: Variant arrows remain functional after randomize
- **WHEN** the user clicks "Randomize All" and then clicks a card's prev/next arrow
- **THEN** the card SHALL update to the selected adjacent variant instead of remaining pinned to the randomized override value

#### Scenario: Single variant chord
- **WHEN** a chord has Variation Count of 1
- **THEN** no variant cycling arrows SHALL be displayed

#### Scenario: Variant indicator
- **WHEN** a chord has multiple variants
- **THEN** the card SHALL display a label showing the current variant number and total (e.g. "2 / 5")

#### Scenario: Lock toggle visibility (both instruments)
- **WHEN** any chord card is rendered (guitar OR piano)
- **THEN** a lock toggle control SHALL be shown in the top-right card area and SHALL indicate locked vs unlocked state

#### Scenario: Locked piano cards skip randomization
- **WHEN** instrument mode is Piano AND the user clicks "Randomize All Voicings"
- **THEN** locked piano cards SHALL keep their current voicing style unchanged

### Requirement: Randomize All button
The system SHALL provide a "Randomize All" button that simultaneously shuffles every unlocked chord card. The button label adapts to the active instrument.

#### Scenario: Guitar randomize selects random variants
- **WHEN** the user clicks "Randomize All Variants" in guitar mode
- **THEN** each unlocked guitar chord card SHALL display a randomly selected variant (1 to its Variation Count)

#### Scenario: Piano randomize selects an applicable style per card
- **WHEN** the user clicks "Randomize All Voicings" in piano mode
- **THEN** each unlocked piano chord card SHALL be assigned a random voicing style drawn uniformly from the styles `isStyleApplicable` accepts for that chord, excluding "auto"
- **WHEN** a chord supports no applicable explicit style
- **THEN** the card SHALL fall back to "auto"

#### Scenario: Locked cards are preserved
- **WHEN** the user clicks "Randomize All" while one or more cards are locked
- **THEN** locked cards SHALL keep their current variant or voicing style unchanged

#### Scenario: Button visible for both instruments
- **WHEN** at least one chord card is rendered
- **THEN** the "Randomize All" button SHALL be visible regardless of instrument
- **AND** its label SHALL read "Randomize All Variants" when the instrument is Guitar, "Randomize All Voicings" when the instrument is Piano

### Requirement: Piano display mode toggle
The system SHALL provide a per-card display toggle for piano cards to switch between note labels and fingering labels.

#### Scenario: Toggle visible only in piano mode
- **WHEN** instrument mode is `piano`
- **THEN** each chord card SHALL render a `Notes` / `Fingering` toggle control near the keyboard

#### Scenario: Toggle hidden in guitar mode
- **WHEN** instrument mode is `guitar`
- **THEN** the piano display toggle SHALL NOT be rendered

#### Scenario: Default display mode
- **WHEN** a piano card first renders
- **THEN** display mode SHALL default to `notes`

#### Scenario: Toggling re-renders the keyboard labels
- **WHEN** the user clicks "Fingering" on a piano card
- **THEN** the keyboard SHALL render ascending finger numbers (1-5) on the active keys with the root key visually emphasized
- **WHEN** the user clicks "Notes" on a piano card
- **THEN** the keyboard SHALL render note-name labels (with no per-key labels on white keys, per the existing display behavior)
