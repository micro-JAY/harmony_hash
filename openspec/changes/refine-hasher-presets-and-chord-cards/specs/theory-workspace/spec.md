## ADDED Requirements

### Requirement: Dedicated IMPROV INSIGHT presentation
Every IMPROV INSIGHT launch control and in-panel navigation/accent surface SHALL use the dedicated pale-pink `music-insight` token family instead of the HASHER accent or TUNE TOOLBOX academy-blue families. Match scores and named-degree colors SHALL remain independent semantic exceptions, and Style metadata SHALL use a neutral surface.

#### Scenario: Launchers share one color language
- **WHEN** IMPROV INSIGHT is available from HASHER, TUNE TOOLBOX, or Circle of Fifths
- **THEN** each launch action SHALL use the same near-white pink action treatment with tested contrast

#### Scenario: Internal selection accents
- **WHEN** Whole Progression, Per Chord, a chord scope, vocabulary help, or another IMPROV-owned control is selected
- **THEN** its accent SHALL use the dedicated translucent pink surface/text/border tokens rather than gold or blue

#### Scenario: Style remains neutral
- **WHEN** Style metadata displays Tonal, Modal, or Blues
- **THEN** its value and container SHALL use neutral text/surface/border tokens rather than a blue or pink categorical fill

#### Scenario: Score and degree exceptions
- **WHEN** scale suggestions render inside the pink panel
- **THEN** match percentage/meter SHALL retain the match gradient
- **AND** scale title/notes SHALL retain the shared named-degree colors

### Requirement: Complete IMPROV vocabulary help
The `?` beside IMPROV INSIGHT SHALL open an accessible dialog explaining all four metadata categories and every supported option.

#### Scenario: Complete category and option inventory
- **WHEN** vocabulary help opens
- **THEN** Motion SHALL explain Smooth and Jumpy
- **AND** Tension SHALL explain Rises, Static, and Falls
- **AND** Palette SHALL explain Diatonic and Chromatic
- **AND** Style SHALL explain Tonal, Modal, and Blues

#### Scenario: Explanation and focus behavior
- **WHEN** the dialog is used with pointer or keyboard input
- **THEN** each category and option SHALL have concise explanatory text
- **AND** Escape, close, or backdrop dismissal SHALL restore focus to the `?` trigger

### Requirement: Bounded IMPROV result geometry and typography
IMPROV INSIGHT SHALL remain inside the centered content rail. Suggested scale names SHALL use the display face, note groups SHALL use compact spacing, and each match block SHALL be aligned and capped at 14rem without expanding the page.

#### Scenario: Centered desktop geometry
- **WHEN** results render on desktop
- **THEN** the panel SHALL remain within the 72rem centered tool rail and each meter SHALL be no wider than 14rem

#### Scenario: Responsive geometry
- **WHEN** results render at tablet or 375px mobile widths
- **THEN** titles, notes, match blocks, metadata, help, and close actions SHALL reflow without document overflow

#### Scenario: Scale typography
- **WHEN** a scale suggestion renders
- **THEN** its visible scale name SHALL use the established display face rather than the readout/mono face

### Requirement: Origin-local IMPROV access
Opening IMPROV INSIGHT from TUNE TOOLBOX or Circle of Fifths SHALL render the shared panel in TUNE TOOLBOX without navigating to HASHER or mutating the progression, instrument, or shared theory context.

#### Scenario: Circle launch stays local
- **WHEN** a user activates Open IMPROV INSIGHT from Circle
- **THEN** TUNE TOOLBOX SHALL remain the selected workspace and the panel SHALL appear within that workspace

#### Scenario: Local close restores origin
- **WHEN** a theory-origin panel closes
- **THEN** focus SHALL return to the exact Circle/Toolbox launch control
- **AND** the prior progression, instrument, Root, Scale/Mode, and Mood SHALL remain unchanged
