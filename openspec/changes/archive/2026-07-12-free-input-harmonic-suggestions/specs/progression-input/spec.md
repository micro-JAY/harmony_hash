## ADDED Requirements

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
