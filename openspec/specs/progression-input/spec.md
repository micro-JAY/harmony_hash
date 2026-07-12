## Purpose
Define manual progression entry, parsing feedback, and mode-specific input controls.
## Requirements
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
The system SHALL allow users to switch between free-text input and the Progressions tab without losing the other mode's state. The Progressions tab SHALL host the natural-language Progression Agent as its primary surface and preserve the preset browser as a secondary disclosure. Optional voice controls SHALL remain compact and SHALL NOT insert an expanded idle panel between active controls and chord output.

#### Scenario: Mode toggle
- **WHEN** the user switches from free-text to the Progressions tab
- **THEN** the free-text input content SHALL be preserved and the Progressions tab SHALL be displayed

#### Scenario: Progression Agent is the primary surface
- **WHEN** the user opens the Progressions tab
- **THEN** the agent's prompt textarea and `Build progression` button SHALL be visible by default at the top of the tab

#### Scenario: Preset browser preserved as fallback
- **WHEN** the user opens the Progressions tab
- **THEN** the existing preset browser (key selector, tonality selector, subgroups, minor blend help) SHALL remain available under an `Or pick a preset` disclosure below the agent controls

#### Scenario: Agent result overrides display
- **WHEN** the user submits an agent prompt and the Worker returns a valid progression
- **THEN** the chord cards SHALL display the agent's chords, replacing any previous result from free-text or presets

#### Scenario: Preset selection overrides display
- **WHEN** the user selects a preset progression from the fallback section
- **THEN** the chord cards SHALL display the preset's chords, replacing any previous result from free-text or the agent

#### Scenario: Superseded agent response is ignored
- **WHEN** an agent request remains in flight and the user switches to Free Input, selects a newer manual or preset result, or the Harmony Companion changes the timeline
- **THEN** the pending request SHALL be aborted where possible
- **AND** any late agent response SHALL NOT replace the newer chord cards

#### Scenario: Mode-only changes preserve agent feedback
- **WHEN** the user switches input modes or changes preset tonality without applying a newer progression
- **THEN** any completed agent rationale or retryable error SHALL remain available when the Progressions tab is shown again

#### Scenario: Companion does not break reading order
- **WHEN** the companion is idle or unavailable in either input mode
- **THEN** only its compact control SHALL appear between input controls and chord output

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

### Requirement: Responsive input controls
The Free Input and Progression Agent control rows SHALL reflow without horizontal document overflow at mobile widths.

#### Scenario: Free Input on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** the chord input and Run button SHALL stack or size fluidly within the viewport

#### Scenario: Progression Agent on mobile
- **WHEN** the viewport is narrower than 640px
- **THEN** the prompt textarea and Build progression button SHALL stack with full-width usable controls

#### Scenario: No horizontal overflow
- **WHEN** either input mode is viewed at 375px width
- **THEN** `document.scrollWidth` SHALL NOT exceed `window.innerWidth`

### Requirement: Free Input harmony context
The system SHALL provide independent Key and Mode selectors in Free Input and SHALL use that context for chord-grid suggestions without changing Progressions-tab transposition state.

#### Scenario: Default context
- **WHEN** Free Input first renders
- **THEN** its harmony context SHALL be C major

#### Scenario: Supported modes
- **WHEN** the user opens the Free Input Mode selector
- **THEN** Major, Natural Minor, Harmonic Minor, Dorian, Mixolydian, Lydian, and Phrygian SHALL be available

#### Scenario: Tab state independence
- **WHEN** the user changes Free Input to D Dorian, changes Progressions to another key or tonality, and returns to Free Input
- **THEN** D Dorian SHALL remain selected and Progressions SHALL retain its own selection

### Requirement: Persistent Free Input chord browser
The system SHALL keep the collapsed chord-browser control available whenever Free Input is active, including after chord cards render.

#### Scenario: Browser after Run
- **WHEN** the user submits a valid Free Input progression and chord cards render
- **THEN** the Browse chords control SHALL remain available below the text input

#### Scenario: Explicit timeline update
- **WHEN** the user inserts a suggested chord from the browser
- **THEN** the text input SHALL update and receive focus while the rendered timeline SHALL change only after the user submits Run

### Requirement: Key and next-chord overlay modes
The chord browser SHALL provide Off, Key, and Next suggestion modes and SHALL score each visible chord cell rather than only its root row.

#### Scenario: Off mode
- **WHEN** Off is selected
- **THEN** the grid SHALL preserve its existing root colors and interactions without fit badges or fit styling

#### Scenario: Key mode
- **WHEN** Key is selected
- **THEN** each visible chord cell SHALL display its key-fit percentage and matching fit-tier styling for the selected Free Input key and mode

#### Scenario: Next mode after input
- **WHEN** Next is selected and the input contains at least one dictionary-valid chord
- **THEN** every visible chord cell SHALL be ranked relative to the last valid chord token and the selected key and mode

#### Scenario: Invalid trailing token
- **WHEN** the input ends with an invalid token after a valid chord
- **THEN** Next mode SHALL retain the last valid chord as its transition anchor while Run continues to report the invalid token normally

### Requirement: Accessible fit communication
Fit SHALL be communicated through text and assistive descriptions in addition to color, opacity, border, or glow.

#### Scenario: Cell description
- **WHEN** Key or Next mode is active
- **THEN** each chord cell SHALL expose its chord name, integer fit percentage, tier, and available scoring reasons to assistive technology

#### Scenario: Keyboard operation
- **WHEN** a keyboard user tabs through context controls, overlay modes, filters, and chord cells
- **THEN** focus order SHALL be logical, visible focus SHALL be preserved, and activating a chord SHALL keep the existing input-focus behavior

### Requirement: Responsive and bounded scoring interaction
The chord browser SHALL remain usable at desktop, tablet, and 375-pixel mobile widths and SHALL recompute suggestions within the interaction-latency budget established by its Playwright test.

#### Scenario: Narrow viewport
- **WHEN** the grid is open at 375 pixels wide
- **THEN** context controls and the legend SHALL wrap without document overflow while the chord matrix remains horizontally scrollable

#### Scenario: Context update latency
- **WHEN** the user changes key, mode, or the last valid chord in a representative grid
- **THEN** updated fit evidence SHALL render within the tested latency budget without a framework error or console error

