## ADDED Requirements

### Requirement: Global chord-family color language
Every visible dictionary-chord label SHALL use the shared chord-family classifier and semantic palette: Major pastel green, Minor pastel orange, Dominant deep red, Suspended light yellow, Diminished soft pink, and Augmented white.

#### Scenario: Global surface coverage
- **WHEN** a chord symbol appears in the Build Your Own composer, Browse Chords headers, generated Guitar/Piano cards, modifier/comparison dialogs, Circle of Fifths chord lists, or FRET FINDER overlays
- **THEN** its chord-name layer SHALL use the same family presentation for the same chord

#### Scenario: Independent state semantics
- **WHEN** a family-colored chord is selected, focused, playing, scored, relationship-ranked, locked, or highlighted by Hanz
- **THEN** those independent borders, meters, markers, and non-color labels SHALL remain perceivable and SHALL NOT be replaced by family color

#### Scenario: Root rows and match scores remain independent
- **WHEN** Browse Chords renders root labels or a fit percentage
- **THEN** roots SHALL retain the blue key palette and percentages SHALL retain the low/mid/high match gradient

#### Scenario: Six-family real-surface proof
- **WHEN** release validation renders representative Major, Minor, Dominant, Suspended, Diminished/half-diminished, and Augmented chords
- **THEN** tests SHALL verify the computed family token and required contrast on real grid, card, composer, and dialog surfaces

### Requirement: Shared named-degree color language
SCALE SYNTHESIA, IMPROV INSIGHT, and FRET FINDER SHALL resolve chromatic intervals through the same immutable `intervalColor()` mapping.

#### Scenario: Scale title and note mapping
- **WHEN** IMPROV INSIGHT renders a suggested scale
- **THEN** its scale-name text SHALL use the Root degree color
- **AND** each note SHALL use the color for its interval within that suggested scale formula

#### Scenario: Cross-tool interval identity
- **WHEN** the same musical interval appears in SCALE SYNTHESIA, IMPROV INSIGHT, or FRET FINDER
- **THEN** its computed semantic color SHALL be identical across all three tools

#### Scenario: Requested blues example
- **WHEN** F Major Blues is shown
- **THEN** Ab SHALL use the shared minor-third purple in IMPROV INSIGHT, SCALE SYNTHESIA, and FRET FINDER evidence

#### Scenario: Named-degree colors remain independent
- **WHEN** IMPROV match scores, chord families, focus, or playback states are also present
- **THEN** named-degree color SHALL remain an independent note/interval cue with visible text and accessible names
