## ADDED Requirements

### Requirement: Agent-first unified Hasher hierarchy
Hasher SHALL present its primary controls in this reading order: `Describe a progression or mood`, a centered localized `or`, `Build your own`, the Browse Chords/context toolbar, and then a centered localized `or` followed by `Choose from a preset` while the browser is collapsed. This requirement supersedes the prior preset-first ordering without changing any surface's timeline behavior.

#### Scenario: Collapsed browser order
- **WHEN** Hasher renders with the chord browser collapsed
- **THEN** the agent prompt SHALL appear first, the direct composer SHALL appear second, and the preset categories SHALL appear after the chord-browser toolbar

#### Scenario: Existing actions keep behavior
- **WHEN** the user submits the agent, runs staged chords, or selects a preset in the new order
- **THEN** each action SHALL update the same application-owned timeline using its existing transaction and cancellation behavior

#### Scenario: Localized separators
- **WHEN** the unified flow renders in a supported locale
- **THEN** the separators between Describe and Build and between the collapsed browser and presets SHALL remain centered and localized

### Requirement: Browser-scoped harmony context rail
The shared Key and Mode controls SHALL render in a compact aligned rail beside Browse Chords because they apply to chord-grid suggestions and preset transposition rather than natural-language prompt placement. The instrument selector SHALL remain aligned in the same responsive toolbar.

#### Scenario: Wide toolbar alignment
- **WHEN** sufficient horizontal space is available
- **THEN** Browse Chords, Key, Mode, and the instrument selector SHALL share one aligned toolbar with Key narrower than Mode according to their content

#### Scenario: Context still drives dependent features
- **WHEN** the user changes Key or Mode in the relocated rail
- **THEN** chord suggestions, presets, modifiers, and supported analysis SHALL consume the same updated context as before

#### Scenario: Narrow toolbar reflow
- **WHEN** Hasher renders at 375 pixels
- **THEN** the browser, Key, Mode, and instrument controls SHALL wrap or stack with usable targets and no horizontal document overflow

### Requirement: Presets hide while chord browser is open
The preset heading, separator, and category surface SHALL be completely absent while the chord-browser panel is expanded and SHALL return with its prior selection state when the panel collapses.

#### Scenario: Expanding browser hides presets
- **WHEN** the user expands Browse Chords
- **THEN** `Choose from a preset`, its four category buttons, and their preceding separator SHALL NOT render

#### Scenario: Collapsing browser restores presets
- **WHEN** the user collapses Browse Chords after previously selecting a preset category or progression
- **THEN** the preset surface SHALL return without clearing the selected progression or timeline

#### Scenario: Browser remains independent
- **WHEN** the user hovers, previews, pins, or inserts chords in the expanded browser
- **THEN** preset visibility SHALL depend only on the browser's expanded state and no preset dialog SHALL open implicitly
