## MODIFIED Requirements

### Requirement: Piano chord card rendering
The system SHALL display piano chord cards as a procedurally rendered three-octave HTML/CSS keyboard with each active key colored by its chromatic interval from the chord root using the shared music interval palette. Existing note-label, fingering-label, voicing, comparison, playback, and responsive-card behavior SHALL remain unchanged.

#### Scenario: Keyboard layout
- **WHEN** a piano chord card is rendered
- **THEN** the system SHALL display a complete three-octave keyboard from C3 through B5 in standard piano layout

#### Scenario: Active notes use degree colors
- **WHEN** the voicing engine computes note positions for a chord
- **THEN** each corresponding key SHALL use the same interval color as FRET FINDER and Scale Synthesia for that pitch class relative to the chord root

#### Scenario: Root parity
- **WHEN** the root occurs in one or more active octaves
- **THEN** every root occurrence SHALL use the shared root color while non-root chord tones retain their own degree colors

#### Scenario: Notes and fingering labels
- **WHEN** an active key renders a note or fingering label
- **THEN** the existing label value SHALL remain unchanged and its foreground SHALL remain legible against the degree color

#### Scenario: More than five notes
- **WHEN** a chord contains more than five active notes
- **THEN** every active key SHALL retain its degree color while existing fingering overflow behavior remains unchanged

#### Scenario: Card geometry and voicing continuity
- **WHEN** degree colors render on any supported voicing style
- **THEN** keyboard containment, aligned card height, active MIDI positions, style selection, comparison, and playback SHALL remain unchanged

### Requirement: Global instrument toggle
The system SHALL provide one Guitar/Piano toggle in the HASHER output learning toolbar that switches all chord cards to the selected instrument view simultaneously.

#### Scenario: Toggle placement
- **WHEN** HASHER renders
- **THEN** the Guitar/Piano toggle SHALL appear beside Browse chords / Undo before the chord output and SHALL NOT appear in the global header

#### Scenario: Toggle to piano
- **WHEN** the user switches from Guitar to Piano
- **THEN** all chord cards SHALL re-render as piano keyboard visualizations

#### Scenario: Toggle to guitar
- **WHEN** the user switches from Piano to Guitar
- **THEN** all chord cards SHALL re-render as guitar SVG chord diagrams

#### Scenario: Default instrument
- **WHEN** the application loads
- **THEN** the default instrument SHALL be Guitar

#### Scenario: State continuity
- **WHEN** the user changes workspaces and returns to HASHER
- **THEN** the selected instrument and compatible per-card state SHALL remain available
