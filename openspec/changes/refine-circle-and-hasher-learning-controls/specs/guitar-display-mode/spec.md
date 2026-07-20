## MODIFIED Requirements

### Requirement: Root dot accent highlighting
In all three Guitar display modes, every playable dot SHALL be colored by its chromatic interval from the chord root using the shared music interval palette. Root dots SHALL use the shared root color, non-root dots SHALL use their matching degree color, and labels SHALL use a contrast-safe foreground. Color SHALL supplement rather than replace fingering, interval, or note text.

#### Scenario: Root on multiple strings
- **WHEN** an E chord renders with root E on multiple strings
- **THEN** every E dot SHALL use the shared root color

#### Scenario: Fingering mode
- **WHEN** the Guitar card is in Fingering mode
- **THEN** original finger numbers SHALL remain visible and each played dot SHALL use its actual chord-degree color

#### Scenario: Intervals mode
- **WHEN** the Guitar card is in Intervals mode
- **THEN** each dot SHALL retain its interval label and SHALL use the identical interval color represented by that label

#### Scenario: Notes mode
- **WHEN** the Guitar card is in Notes mode
- **THEN** each dot SHALL retain its correctly spelled note name and SHALL use the color for that note’s interval from the root

#### Scenario: Barre chord degree accuracy
- **WHEN** one barre shape produces played notes on several strings
- **THEN** the structural barre SHALL NOT imply one degree for every string
- **AND** each generated played-note position SHALL expose its own interval color and label semantics

#### Scenario: Shared palette parity
- **WHEN** the same interval renders in Guitar, Piano, FRET FINDER, or Scale Synthesia
- **THEN** all four surfaces SHALL resolve the same semantic interval-color token

## REMOVED Requirements

### Requirement: Piano branch unchanged
**Reason**: This change deliberately extends the already available shared interval-color mode to primary Piano chord cards, so the earlier isolation requirement is no longer correct.

**Migration**: Piano behavior remains specified under `chord-card-display`; only active-key presentation changes to the shared interval palette.
