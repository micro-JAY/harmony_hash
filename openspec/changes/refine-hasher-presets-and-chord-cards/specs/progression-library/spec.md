## ADDED Requirements

### Requirement: Complete catalogue parity
The curated progression catalogue SHALL preserve exact category, subgroup, name, and Roman-numeral parity between `docs/hh-library.md`, `PROGRESSION_LIBRARY`, and every rendered preset category dialog.

#### Scenario: Exact category counts
- **WHEN** the runtime catalogue is audited
- **THEN** Major SHALL contain 23 progressions, Minor SHALL contain 21, Modal SHALL contain 13, and Advanced SHALL contain 5
- **AND** no documented progression SHALL be omitted or duplicated

#### Scenario: Exact subgroup inventory
- **WHEN** Major, Minor, Modal, or Advanced is compared with the library document
- **THEN** every documented subgroup SHALL occur once in its documented category and every progression SHALL retain its documented name and Roman numerals

#### Scenario: Rendered inventory parity
- **WHEN** a user opens any preset category dialog
- **THEN** the dialog SHALL expose every runtime subgroup and progression in that category rather than only an active carousel subset

#### Scenario: Transposition validity
- **WHEN** every catalogue progression is resolved in every supported key
- **THEN** every produced chord SHALL resolve through the shared chord dictionary or fail the catalogue validation gate before release

