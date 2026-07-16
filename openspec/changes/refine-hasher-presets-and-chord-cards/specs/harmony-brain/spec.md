## MODIFIED Requirements

### Requirement: Roman numeral transposition
The system SHALL convert Roman-numeral progressions into concrete chord names for the selected key, normalize minor-quality suffixes, preserve the documented bass degree for shipped slash inversions, and resolve the named Secondary Pull's `V/ii` as the dominant of ii without inventing an unnotated extension.

#### Scenario: Tonic first inversion
- **WHEN** `I/III` is transposed in C major
- **THEN** the result SHALL be `C/E`

#### Scenario: Soulful Descent bass line
- **WHEN** the named Soulful Descent token `V/vii` is transposed in C major
- **THEN** the result SHALL be `G/B`
- **AND** the following `vi` SHALL resolve to `Am`

#### Scenario: Named Secondary Pull
- **WHEN** the named Secondary Pull token `V/ii` is transposed in C major
- **THEN** the result SHALL be `A`
- **AND** an explicit `V7/ii` SHALL resolve to `A7`
- **AND** the system SHALL NOT add a seventh to bare `V/ii`

#### Scenario: Slash forms remain dictionary-valid
- **WHEN** `I/III`, `V/vii`, and `V/ii` are transposed through every supported key
- **THEN** every resulting chord SHALL resolve through the shared chord dictionary
