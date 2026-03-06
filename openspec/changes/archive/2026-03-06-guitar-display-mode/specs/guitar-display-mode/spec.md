## ADDED Requirements

### Requirement: Three-way guitar display mode toggle
The guitar chord card SHALL display a 3-way pill toggle with modes: "Fingering" (default), "Intervals", and "Notes". The toggle SHALL use the same visual pattern as the existing piano Notes/Fingering toggle.

#### Scenario: Default state
- **WHEN** a guitar chord card renders
- **THEN** the toggle shows "Fingering" as the active mode and the chord diagram appears as the standard SVG

#### Scenario: Switch to Intervals mode
- **WHEN** the user clicks "Intervals"
- **THEN** finger dots display interval labels (1, b3, 3, 5, b7, etc.) centered inside each dot

#### Scenario: Switch to Notes mode
- **WHEN** the user clicks "Notes"
- **THEN** finger dots display note names (C, Eb, G, Bb, etc.) centered inside each dot, respecting flat/sharp preference

### Requirement: Root dot accent highlighting
In ALL three display modes, any finger dot corresponding to the root note pitch class SHALL be rendered with `var(--text-accent)` fill. Root dots can appear on multiple strings and all occurrences SHALL be highlighted. Root dot labels SHALL use `var(--surface-base)` text color for contrast. Non-root dots SHALL have neutral fill with dark text.

#### Scenario: Root on multiple strings
- **WHEN** an E chord is displayed (root E appears on strings 1 and 6)
- **THEN** both E dots are accent-colored

#### Scenario: Root accent in fingering mode
- **WHEN** the guitar card is in Fingering mode
- **THEN** root dots are accent-colored with no text labels (original fingering numbers removed)

### Requirement: Inline SVG rendering
The guitar chord diagram SHALL be rendered as inline SVG (not `<img>`) to support dot manipulation. The SVG SHALL be fetched via `fetch()`, parsed with `DOMParser`, and cached by URL. If fetching or parsing fails, the component SHALL fall back to the original `<img>` rendering.

#### Scenario: SVG loaded successfully
- **WHEN** the SVG file is available
- **THEN** the diagram renders as inline SVG with manipulated dots

#### Scenario: SVG fetch failure
- **WHEN** the SVG file cannot be loaded
- **THEN** a "No diagram" placeholder is shown (no crash, no blank card)

### Requirement: Correct pitch class mapping
Each finger dot SHALL be mapped to a pitch class using standard guitar tuning (EADGBE) and the SVG's fret window offset. Barre chord rectangles SHALL generate virtual dots for each covered string. The mapping SHALL correctly handle open strings and fret offsets.

#### Scenario: Barre chord intervals
- **WHEN** an F major barre chord is shown in Intervals mode
- **THEN** the barre dots show correct intervals (1 on F strings, 5 on C strings, etc.)

#### Scenario: High-fret chord
- **WHEN** a chord with fret offset > 1 is shown (e.g., Bm at fret 2)
- **THEN** pitch classes are calculated using the correct fret offset

### Requirement: Piano branch unchanged
The piano rendering branch, PianoKeyboard component, and PianoDisplayMode type SHALL NOT be modified.

#### Scenario: Piano display after changes
- **WHEN** viewing a chord in piano mode
- **THEN** the display is visually identical to before this change
