## ADDED Requirements

### Requirement: Note Neural Network preview disclosure

Note Neural Network SHALL remain accessible while displaying a localized `EARLY PREVIEW` status pill aligned at the end of its collapsed tool header. Its visible graph guidance SHALL describe interactions in user language and SHALL NOT expose millisecond timing.

#### Scenario: Collapsed preview status

- **WHEN** Note Neural Network is collapsed at desktop or mobile width
- **THEN** the disclosure header SHALL display a neat, contained early-preview status pill without changing the disclosure button's accessible name

#### Scenario: Desktop interaction guidance

- **WHEN** the interactive desktop network is visible
- **THEN** its guidance SHALL explain node dragging, background panning, zooming, relationship focus, expansion, and press-and-hold pinning in plain language
- **AND** it SHALL NOT mention milliseconds

#### Scenario: Localized preview communication

- **WHEN** the application language changes
- **THEN** the preview badge and interaction guidance SHALL update to the active locale while graph state remains unchanged
