## ADDED Requirements

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

#### Scenario: Guitar lock toggle visibility
- **WHEN** a guitar chord card is rendered
- **THEN** a lock toggle control SHALL be shown in the top-right card area and SHALL indicate locked vs unlocked state

#### Scenario: Piano cards omit lock toggle
- **WHEN** instrument mode is Piano
- **THEN** the lock toggle control SHALL NOT be shown on chord cards

### Requirement: Randomize All button
The system SHALL provide a "Randomize All" button that simultaneously selects a random valid variant for every unlocked guitar chord card in the current progression.

#### Scenario: Random variants applied
- **WHEN** the user clicks "Randomize All"
- **THEN** each unlocked guitar chord card SHALL display a randomly selected variant (between 1 and its Variation Count)

#### Scenario: Locked cards are preserved
- **WHEN** the user clicks "Randomize All" while one or more guitar cards are locked
- **THEN** locked cards SHALL keep their current variant values unchanged

#### Scenario: Button only visible in guitar mode
- **WHEN** the instrument is set to Piano
- **THEN** the "Randomize All" button SHALL NOT be displayed

### Requirement: Piano chord card rendering
The system SHALL display piano chord cards as a procedurally rendered 3-octave HTML/CSS keyboard with highlighted active notes, and SHALL support switchable note-label and fingering-label display modes.

#### Scenario: Keyboard layout
- **WHEN** a piano chord card is rendered
- **THEN** the system SHALL display a 3-octave keyboard (C3 to B5) with white and black keys in standard piano layout

#### Scenario: Active notes highlighted
- **WHEN** the voicing engine computes note positions for a chord
- **THEN** the corresponding keys on the keyboard SHALL be visually highlighted using the design system's glow accent color

#### Scenario: Notes display mode preserves note labels
- **WHEN** piano display mode is set to `notes`
- **THEN** active keys SHALL render note-name labels and existing note-label behavior SHALL remain unchanged

#### Scenario: Fingering mode shows ascending finger numbers
- **WHEN** piano display mode is set to `fingering`
- **THEN** active keys SHALL render finger numbers assigned by ascending MIDI order (1-5)

#### Scenario: Fingering mode root emphasis
- **WHEN** piano display mode is `fingering`
- **THEN** the root key SHALL use accent background styling and a contrasting dark label color distinct from other active keys

#### Scenario: Fingering mode over-five-note handling
- **WHEN** a chord has more than 5 active notes
- **THEN** only the lowest 5 active notes SHALL receive finger-number labels and remaining notes SHALL be unlabeled or marked as overflow

#### Scenario: Triad rendering
- **WHEN** a triad (3 notes) is rendered in root position
- **THEN** all notes SHALL be highlighted in the same color (single-hand voicing)

#### Scenario: Voicing-type pill
- **WHEN** the engine produces a non-root voicing (drop2 / drop3 / rootless / shell)
- **THEN** a labeled pill below the keyboard SHALL display the voicing-type name (e.g. "Drop 2", "Drop 3", "Rootless", "Shell")
- **WHEN** the engine produces a closed root voicing
- **THEN** no voicing-type pill SHALL be displayed

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
- **WHEN** a chord has only 1-2 notes
- **THEN** every explicit style button SHALL be rendered disabled and only "Auto" SHALL remain interactive
- **WHEN** a chord is a triad (3 notes)
- **THEN** "Drop 2", "Drop 3", "Rootless", and "Shell" SHALL be rendered disabled; "Auto", "Spread", and "Two-Hand" SHALL be interactive

#### Scenario: Toggle row wraps on narrow widths
- **WHEN** the card's available width can't fit seven pills on one line
- **THEN** the toggle row SHALL wrap to a second line cleanly via `flex flex-wrap`

#### Scenario: Style toggle hidden in guitar mode
- **WHEN** the instrument is set to "Guitar"
- **THEN** the piano style toggle SHALL NOT be rendered

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

### Requirement: Piano display mode toggle
The system SHALL provide a per-card display toggle for piano cards to switch between note labels and fingering labels.

#### Scenario: Toggle visible only in piano mode
- **WHEN** instrument mode is `piano`
- **THEN** each chord card SHALL render a `Notes`/`Fingering` toggle control near the keyboard

#### Scenario: Toggle hidden in guitar mode
- **WHEN** instrument mode is `guitar`
- **THEN** the piano display toggle SHALL NOT be rendered

#### Scenario: Default display mode
- **WHEN** a piano card first renders
- **THEN** display mode SHALL default to `notes`

### Requirement: Chord note row display formatting
The system SHALL display chord note labels using user-facing musical notation that matches the chord root spelling convention.

#### Scenario: Flat-root chord note row
- **WHEN** a chord card root is displayed with flat naming (e.g. "Bb")
- **THEN** the note row SHALL use flat note labels (e.g. "Bb - D - F") and SHALL NOT show internal encoded labels (e.g. "As")

#### Scenario: Sharp-root chord note row
- **WHEN** a chord card root is displayed with sharp naming (e.g. "F#")
- **THEN** the note row SHALL use sharp note labels (e.g. "F# - A# - C#") and SHALL NOT show internal encoded labels (e.g. "Fs")

#### Scenario: Internal encoding hidden from UI
- **WHEN** any chord card note labels are rendered
- **THEN** raw internal encoding tokens (`Cs`, `As`, `Ef`, etc.) SHALL NOT be visible in the user interface

### Requirement: Chord card name display
Each chord card SHALL display the chord name prominently above the chart/keyboard visualization.

#### Scenario: Name shown
- **WHEN** a chord card is rendered
- **THEN** the full chord name (e.g. "Cmaj7") SHALL be displayed as a heading above the visualization

### Requirement: Global instrument toggle
The system SHALL provide a Guitar/Piano toggle that switches ALL chord cards to the selected instrument view simultaneously.

#### Scenario: Toggle to piano
- **WHEN** the user switches from Guitar to Piano
- **THEN** all chord cards SHALL re-render as piano keyboard visualizations

#### Scenario: Toggle to guitar
- **WHEN** the user switches from Piano to Guitar
- **THEN** all chord cards SHALL re-render as guitar SVG chord diagrams

#### Scenario: Default instrument
- **WHEN** the application loads
- **THEN** the default instrument SHALL be Guitar
