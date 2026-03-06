## ADDED Requirements

### Requirement: Key selector unchanged
The existing Key selector dropdown SHALL remain unchanged in position, behavior, and styling.

#### Scenario: Key selector persists
- **WHEN** the Progressions tab is active
- **THEN** the Key selector SHALL display all 12 chromatic keys with the same dropdown behavior as before

### Requirement: Tonality selector with four options
The Progressions tab SHALL display a Tonality selector with exactly 4 options: Major, Minor, Modal, Advanced.

#### Scenario: Tonality selector options
- **WHEN** the Progressions tab is active
- **THEN** the Tonality selector SHALL show options labeled "Major", "Minor", "Modal", "Advanced"

#### Scenario: Default tonality selection
- **WHEN** the Progressions tab first loads
- **THEN** "Major" SHALL be selected by default

### Requirement: Subgroup labels
Below the selectors, the browser SHALL render subgroup sections for the active tonality, each with an all-caps label.

#### Scenario: Subgroup label rendering
- **WHEN** "Major" tonality is selected
- **THEN** subgroup labels SHALL appear as small all-caps text (e.g., "THE FOUNDATIONS (ROCK, POP, FOLK)")

#### Scenario: Subgroup label visual style
- **WHEN** a subgroup label is rendered
- **THEN** it SHALL use `--text-muted` color, small font size, and clearly separate groups visually

### Requirement: Progression pill buttons
Under each subgroup label, the browser SHALL render one pill button per progression in that subgroup.

#### Scenario: Button label content
- **WHEN** a progression button is rendered
- **THEN** its label SHALL be the Roman numeral notation (e.g., "I – V – vi – IV")

#### Scenario: Button tooltip
- **WHEN** a user hovers over a progression button
- **THEN** a tooltip SHALL display the progression name (e.g., "The Axis (Pop Standard)")

#### Scenario: Button styling
- **WHEN** a progression button is rendered in inactive state
- **THEN** it SHALL use `--surface-overlay` background, `--text-secondary` text, and `--border-subtle` border

### Requirement: Single tonality visible at a time
Only one tonality's content SHALL be visible at a time. Switching tonality SHALL refresh the subgroup list.

#### Scenario: Tonality switching
- **WHEN** user switches from "Major" to "Minor" tonality
- **THEN** the Major subgroups and buttons SHALL be replaced with Minor subgroups and buttons
- **AND** any previously selected progression SHALL be deselected

### Requirement: Selected button gold accent
The selected progression button SHALL be highlighted with the gold accent style.

#### Scenario: Active button styling
- **WHEN** a progression button is selected
- **THEN** it SHALL use `--interactive-accent-bg` background, `--interactive-accent-text` text, and `--interactive-accent-border` border

#### Scenario: Only one button selected
- **WHEN** a progression button is clicked
- **THEN** it SHALL become the only selected button across all visible subgroups

### Requirement: Progression selection triggers transposition
When a progression button is clicked, the app SHALL transpose the progression to the selected key and display chord cards.

#### Scenario: Clicking a progression
- **WHEN** user clicks the "I – V – vi – IV" button with key "G" selected
- **THEN** the app SHALL call the transposition engine and render chord cards for G, D, Em, C

#### Scenario: Changing key with active progression
- **WHEN** a progression is selected and user changes key from "C" to "D"
- **THEN** the chord cards SHALL update to reflect the new key

### Requirement: Button layout wrapping
Progression buttons SHALL wrap naturally within their container, maintaining clean alignment.

#### Scenario: Responsive wrapping
- **WHEN** multiple progression buttons are rendered in a subgroup
- **THEN** they SHALL flow in a flex-wrap layout with consistent gap spacing

### Requirement: No changes outside progressions panel
All changes SHALL be confined to the Progressions tab panel. The Free Input tab, chord card rendering, Header, and all other components SHALL remain untouched.

#### Scenario: Free Input tab unchanged
- **WHEN** user switches to the Free Input tab
- **THEN** it SHALL behave identically to before this change
