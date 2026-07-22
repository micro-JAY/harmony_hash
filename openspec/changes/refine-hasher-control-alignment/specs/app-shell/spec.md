## ADDED Requirements

### Requirement: Compact locale toggle
The application header SHALL provide one square locale toggle that changes the active language in one activation while remaining aligned with the Help/About control.

#### Scenario: Toggle locale from English
- **WHEN** English is active and the user activates the locale toggle
- **THEN** the page SHALL switch to Japanese and the toggle text SHALL change from `JP` to `EN`

#### Scenario: Toggle locale from Japanese
- **WHEN** Japanese is active and the user activates the locale toggle
- **THEN** the page SHALL switch to English and the toggle text SHALL change from `EN` to `JP`

#### Scenario: Header utility geometry
- **WHEN** the header renders at desktop, tablet, or mobile widths
- **THEN** the locale control SHALL be a square 44px-capable target with rounded outer corners and SHALL align vertically with Help/About without horizontal document overflow
