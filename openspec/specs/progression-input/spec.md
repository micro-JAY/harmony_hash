## ADDED Requirements

### Requirement: Free-text chord input
The system SHALL provide a text input field where users type space-separated chord symbols and submit them via a Run/Generate button.

#### Scenario: Valid chord string submitted
- **WHEN** the user types "Cmaj7 Dm7 G7 C" and presses Run
- **THEN** the system SHALL parse the input and display chord cards for each resolved chord

#### Scenario: Partial parse with errors
- **WHEN** the user types "Cmaj7 Xfoo G7" and presses Run
- **THEN** the system SHALL display chord cards for Cmaj7 and G7, and show an inline error indicator for the unrecognized "Xfoo"

#### Scenario: Enter key submits
- **WHEN** the user presses Enter while the text input is focused
- **THEN** the system SHALL behave the same as clicking the Run button

### Requirement: Preset progression picker
The system SHALL provide a dropdown/selector of curated chord progressions grouped by category.

#### Scenario: Grouped categories displayed
- **WHEN** the user opens the progression picker
- **THEN** the system SHALL display progressions grouped under: Major, Natural Minor (Aeolian), Harmonic Minor, and Modal

#### Scenario: Major progressions available
- **WHEN** the user views the Major category
- **THEN** the following progressions SHALL be available: I V vi IV, ii V I, I IV V, I IV ii V, I iii IV V

#### Scenario: Minor progressions available
- **WHEN** the user views the Natural Minor category
- **THEN** the following progressions SHALL be available: i VI VII, i iv v, i VII VI VII

#### Scenario: Harmonic minor progressions available
- **WHEN** the user views the Harmonic Minor category
- **THEN** the following progressions SHALL be available: i V, ii° V i, i iv V i

#### Scenario: Modal progressions available
- **WHEN** the user views the Modal category
- **THEN** the following progressions SHALL be available: im IV (Dorian), I bVII IV (Mixolydian), I II (Lydian), i bVII bVI bVII (Phrygian)

### Requirement: Key selector dropdown
The system SHALL provide a dropdown to select a key (all 12 chromatic keys) for transposing preset progressions.

#### Scenario: All 12 keys available
- **WHEN** the user opens the key dropdown
- **THEN** all 12 keys SHALL be listed: C, C#/Db, D, D#/Eb, E, F, F#/Gb, G, G#/Ab, A, A#/Bb, B

#### Scenario: Key selection triggers transposition
- **WHEN** the user selects a preset progression and then selects a key
- **THEN** the system SHALL transpose the roman numeral progression into concrete chords in that key and display the chord cards

#### Scenario: Key change updates existing progression
- **WHEN** the user changes the key dropdown while a preset progression is already displayed
- **THEN** the chord cards SHALL update to reflect the new key

### Requirement: Input mode switching
The system SHALL allow users to switch between free-text input and the Progressions tab without losing the other mode's state. The Progressions tab SHALL host the natural-language Progression Agent as its primary surface and SHALL preserve the preset browser as a secondary "Or pick a preset" section.

#### Scenario: Mode toggle
- **WHEN** the user switches from free-text to the Progressions tab
- **THEN** the free-text input content SHALL be preserved and the Progressions tab SHALL be displayed

#### Scenario: Progression Agent is the primary surface
- **WHEN** the user opens the Progressions tab
- **THEN** the agent's prompt textarea and "Build progression" button SHALL be visible by default at the top of the tab

#### Scenario: Preset browser preserved as fallback
- **WHEN** the user opens the Progressions tab
- **THEN** the existing preset browser (key selector, tonality selector, subgroups, minor blend help) SHALL remain available under an "Or pick a preset" disclosure below the agent controls

#### Scenario: Agent result overrides display
- **WHEN** the user submits an agent prompt and the Worker returns a valid progression
- **THEN** the chord cards SHALL display the agent's chords, replacing any previous result (free-text or preset)

#### Scenario: Preset selection overrides display
- **WHEN** the user selects a preset progression from the fallback section
- **THEN** the chord cards SHALL display the preset's chords, replacing any previous result (free-text or agent)

### Requirement: Minor blend contextual help
The system SHALL provide contextual minor-harmony guidance directly in the progression input controls.

#### Scenario: Help trigger appears only for Minor tonality
- **WHEN** the active tonality is `minor`
- **THEN** a `?` help trigger SHALL appear adjacent to the Tonality selector

#### Scenario: Help trigger hidden for other tonalities
- **WHEN** the active tonality is `major`, `modal`, or `advanced`
- **THEN** the `?` help trigger SHALL NOT be rendered

#### Scenario: Help modal opens with static guide content
- **WHEN** the user clicks the `?` trigger in Minor tonality
- **THEN** a modal SHALL open with the full "Minor Blend" educational guide content, including headings, lists, summary, and pro-tip blockquote

#### Scenario: Modal dismissal interactions
- **WHEN** the modal is open and the user clicks the close button, presses `Escape`, or clicks outside the modal panel
- **THEN** the modal SHALL close
