## ADDED Requirements

### Requirement: Standard ukulele scale mapping
Fret Finder SHALL offer Ukulele using only standard high-G G4 C4 E4 A4 tuning, with four physical strings, accurate note positions and both handedness modes.

#### Scenario: Open strings
- **WHEN** Ukulele is selected with C major
- **THEN** string 4 fret 0 SHALL be G4, string 3 fret 0 C4, string 2 fret 0 E4, and string 1 fret 0 A4
- **AND** the Hasher instrument SHALL remain unchanged

#### Scenario: Unsupported guitar patterns
- **WHEN** a remembered CAGED or 3NPS pattern is viewed on Ukulele
- **THEN** the effective map SHALL show all scale positions with an explicit compatibility explanation and retain the remembered guitar pattern
